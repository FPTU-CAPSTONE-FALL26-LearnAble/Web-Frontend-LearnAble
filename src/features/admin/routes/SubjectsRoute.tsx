import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, LibraryBig, Plus, PowerOff } from "lucide-react";
import {
  createSubject,
  getAdminSubjects,
  setSubjectActive,
  updateSubject,
  type AdminSubject,
} from "@/api/admin";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  adminKeys,
  departmentLabel,
  useAdminWrite,
  useDepartmentOptions,
  useExpiredAdminSession,
} from "../api/useAdminData";
import {
  ConfirmAction,
  EmptyRow,
  FilterPanel,
  FormDialog,
  TablePanel,
  formatDate,
} from "../components/AdminSurfaces";

type Draft = {
  departmentId: string;
  subjectCode: string;
  subjectNameEn: string;
  subjectNameVi: string;
  description: string;
};
const emptyDraft: Draft = {
  departmentId: "",
  subjectCode: "",
  subjectNameEn: "",
  subjectNameVi: "",
  description: "",
};
/** The API models `departmentId` as nullable, so "unassigned" is a real value. */
const noDepartment = "none";

export function SubjectsRoute() {
  useRouteAnnouncer("Subjects · LearnAble Admin", "Subjects");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<AdminSubject | null>(null);

  const departments = useDepartmentOptions();
  const departmentRows = departments.data?.items ?? [];
  const list = useQuery({
    queryKey: adminKeys.list("subjects", [
      search,
      department,
      active,
      page,
      size,
    ]),
    queryFn: () =>
      getAdminSubjects({
        SearchTerm: search,
        DepartmentId: department === "all" ? undefined : department,
        IsActive: active === "all" ? undefined : active === "active",
        PageNumber: page,
        PageSize: Number(size),
      }),
  });
  useExpiredAdminSession(list.error);
  const rows = list.data?.items ?? [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setDraft(emptyDraft);
    setErrors([]);
  };
  const create = useAdminWrite({
    resource: "subjects",
    action: "Create subject",
    mutationFn: () =>
      createSubject({
        departmentId:
          draft.departmentId === noDepartment || !draft.departmentId
            ? null
            : draft.departmentId,
        subjectCode: draft.subjectCode.trim(),
        subjectNameEn: draft.subjectNameEn.trim(),
        subjectNameVi: draft.subjectNameVi.trim() || null,
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "subjects",
    action: "Update subject",
    mutationFn: () =>
      updateSubject(editing!.subjectId, {
        subjectNameEn: draft.subjectNameEn.trim(),
        subjectNameVi: draft.subjectNameVi.trim() || null,
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "subjects",
    action: "Subject status change",
    // Lecturer question and material filters read the same Subjects list.
    alsoInvalidate: ["topics"],
    mutationFn: ({ id, next }) => setSubjectActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.subjectCode.trim())
      found.push("Subject code is required.");
    if (!draft.subjectNameEn.trim())
      found.push("English subject name is required.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setDepartment("all");
    setActive("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Subjects"
        description="The subject catalogue that lecturer question banks, learning materials and course sections build on."
      >
        <Button
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New subject
        </Button>
      </PageHeading>

      <section
        aria-label="Subject summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total subjects"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<LibraryBig aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Active on this page"
          value={activeCount}
          detail={`Of ${rows.length} rows shown`}
          icon={<CheckCircle2 aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Inactive on this page"
          value={rows.length - activeCount}
          detail="Deactivated subjects stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search subjects"
        searchPlaceholder="Search by subject code or English name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
        <ChoiceField
          label="Department"
          value={department}
          options={[
            { value: "all", label: "All departments" },
            ...departmentRows.map((row) => ({
              value: row.departmentId,
              label: `${row.departmentCode} · ${row.departmentName}`,
            })),
          ]}
          onChange={(value) => {
            setDepartment(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Status"
          value={active}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active only" },
            { value: "inactive", label: "Inactive only" },
          ]}
          onChange={(value) => {
            setActive(value);
            setPage(1);
          }}
        />
      </FilterPanel>
      <ReadState
        pending={departments.isPending}
        error={departments.error}
        retry={() => void departments.refetch()}
      />

      <TablePanel
        heading="All subjects"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="subjects"
        tableLabel="Subjects table"
        read={list}
        page={page}
        pages={list.data?.totalPages ?? 1}
        size={size}
        onPage={setPage}
        onSize={(value) => {
          setSize(value);
          setPage(1);
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Subject name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.subjectId}>
              <TableCell className="font-bold">{row.subjectCode}</TableCell>
              <TableCell className="min-w-80 max-w-md whitespace-normal">
                <p className="font-bold leading-relaxed">{row.subjectNameEn}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.subjectNameVi ?? "No Vietnamese name recorded"}
                </p>
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {departmentLabel(departmentRows, row.departmentId) ??
                  "Not assigned"}
              </TableCell>
              <TableCell>
                <StatusBadge
                  value={row.isActive ? "Active" : "Inactive"}
                  tone={row.isActive ? "success" : "neutral"}
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.updatedAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        departmentId: row.departmentId ?? noDepartment,
                        subjectCode: row.subjectCode,
                        subjectNameEn: row.subjectNameEn,
                        subjectNameVi: row.subjectNameVi ?? "",
                        description: row.description ?? "",
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setToggling(row)}>
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={6}
              title="No subjects match your filters."
              hint="Try another search, or add a subject to the catalogue."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New subject" : "Edit subject"}
        description={
          creating
            ? "The subject code and owning department are permanent once created."
            : `Update ${editing?.subjectCode ?? ""}. Code and department cannot be changed.`
        }
        submitLabel={creating ? "Create subject" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Owning department"
          value={draft.departmentId}
          placeholder="Select a department"
          disabled={!creating}
          options={[
            { value: noDepartment, label: "No department" },
            ...departmentRows.map((row) => ({
              value: row.departmentId,
              label: `${row.departmentCode} · ${row.departmentName}`,
            })),
          ]}
          onChange={(value) =>
            setDraft((old) => ({ ...old, departmentId: value }))
          }
        />
        <TextField
          label="Subject code"
          value={draft.subjectCode}
          disabled={!creating}
          onChange={(value) =>
            setDraft((old) => ({ ...old, subjectCode: value }))
          }
          error={
            errors.some((e) => e.startsWith("Subject code"))
              ? "Subject code is required."
              : undefined
          }
        />
        <TextField
          label="Subject name in English"
          value={draft.subjectNameEn}
          onChange={(value) =>
            setDraft((old) => ({ ...old, subjectNameEn: value }))
          }
          error={
            errors.some((e) => e.startsWith("English subject name"))
              ? "English subject name is required."
              : undefined
          }
        />
        <TextField
          label="Subject name in Vietnamese"
          value={draft.subjectNameVi}
          onChange={(value) =>
            setDraft((old) => ({ ...old, subjectNameVi: value }))
          }
        />
        <TextField
          label="Subject description"
          value={draft.description}
          multiline
          onChange={(value) =>
            setDraft((old) => ({ ...old, description: value }))
          }
        />
      </FormDialog>

      <ConfirmAction
        open={toggling !== null}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={toggling?.isActive ? "Deactivate subject?" : "Activate subject?"}
        description={
          toggling?.isActive
            ? `${toggling?.subjectNameEn} will stop appearing in lecturer course selectors and new course sections. Existing questions and materials stay readable.`
            : `${toggling?.subjectNameEn} will appear in lecturer course selectors again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({ id: toggling.subjectId, next: !toggling.isActive })
        }
      />
    </div>
  );
}

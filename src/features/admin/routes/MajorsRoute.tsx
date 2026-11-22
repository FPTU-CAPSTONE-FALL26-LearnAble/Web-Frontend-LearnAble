import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, GraduationCap, Plus, PowerOff } from "lucide-react";
import {
  createMajor,
  getMajors,
  setMajorActive,
  updateMajor,
  type Major,
} from "@/api/admin";
import { Button } from "@/shared/ui/primitives/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { useAuthStore } from "@/features/auth/store/authStore";
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
  majorCode: string;
  majorName: string;
  description: string;
};
const emptyDraft: Draft = {
  departmentId: "",
  majorCode: "",
  majorName: "",
  description: "",
};

export function MajorsRoute() {
  useRouteAnnouncer("Majors · LearnAble Admin", "Majors");
  const isStaff = useAuthStore(
    (state) => state.user?.role?.toLowerCase() === "staff",
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Major | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Major | null>(null);

  const departments = useDepartmentOptions();
  const departmentRows = departments.data?.items ?? [];
  const list = useQuery({
    queryKey: adminKeys.list("majors", [
      search,
      department,
      active,
      page,
      size,
      isStaff,
    ]),
    queryFn: () =>
      getMajors({
        SearchTerm: search,
        DepartmentId: department === "all" ? undefined : department,
        IsActive: active === "all" ? undefined : active === "active",
        PageNumber: page,
        PageSize: Number(size),
        ...(isStaff ? { SortBy: "-createdAt" } : {}),
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
    resource: "majors",
    action: "Create major",
    mutationFn: () =>
      createMajor({
        departmentId: draft.departmentId,
        majorCode: draft.majorCode.trim(),
        majorName: draft.majorName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "majors",
    action: "Update major",
    mutationFn: () =>
      updateMajor(editing!.majorId, {
        majorName: draft.majorName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "majors",
    action: "Major status change",
    // Curriculums and student profiles both key off a major.
    alsoInvalidate: ["curriculums", "studentProfiles"],
    mutationFn: ({ id, next }) => setMajorActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.departmentId)
      found.push("Owning department is required.");
    if (creating && !draft.majorCode.trim())
      found.push("Major code is required.");
    if (!draft.majorName.trim()) found.push("Major name is required.");
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
        title="Majors"
        description="Majors belong to a department and carry the curriculums and student profiles beneath them."
      >
        <Button
          disabled={!departmentRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New major
        </Button>
      </PageHeading>
      {!departments.isPending &&
        !departments.error &&
        !departmentRows.length && (
          <p
            role="status"
            className="rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground"
          >
            Create a department first — every major must belong to one.
          </p>
        )}

      <section
        aria-label="Major summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total majors"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<GraduationCap aria-hidden className="size-5" />}
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
          detail="Deactivated majors stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search majors"
        searchPlaceholder="Search by major code or name"
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
        heading="All majors"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="majors"
        tableLabel="Majors table"
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
            <TableHead>Major</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.majorId}>
              <TableCell className="font-bold">{row.majorCode}</TableCell>
              <TableCell className="min-w-72 max-w-md whitespace-normal">
                <p className="font-bold leading-relaxed">{row.majorName}</p>
                {row.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {departmentLabel(departmentRows, row.departmentId) ??
                  "Not available"}
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
                        departmentId: row.departmentId,
                        majorCode: row.majorCode,
                        majorName: row.majorName,
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
              title="No majors match your filters."
              hint="Try another search, or create a major under a department."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New major" : "Edit major"}
        description={
          creating
            ? "The owning department and major code are permanent once created."
            : `Update ${editing?.majorCode ?? ""}. Department and code cannot be changed.`
        }
        submitLabel={creating ? "Create major" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Owning department"
          value={draft.departmentId}
          placeholder="Select a department"
          disabled={!creating}
          options={departmentRows.map((row) => ({
            value: row.departmentId,
            label: `${row.departmentCode} · ${row.departmentName}`,
          }))}
          onChange={(value) =>
            setDraft((old) => ({ ...old, departmentId: value }))
          }
        />
        <TextField
          label="Major code"
          value={draft.majorCode}
          disabled={!creating}
          onChange={(value) =>
            setDraft((old) => ({ ...old, majorCode: value }))
          }
          error={
            errors.some((e) => e.startsWith("Major code"))
              ? "Major code is required."
              : undefined
          }
        />
        <TextField
          label="Major name"
          value={draft.majorName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, majorName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Major name"))
              ? "Major name is required."
              : undefined
          }
        />
        <TextField
          label="Major description"
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
        title={toggling?.isActive ? "Deactivate major?" : "Activate major?"}
        description={
          toggling?.isActive
            ? `${toggling?.majorName} will stop accepting new curriculums and student intakes. Existing records stay readable.`
            : `${toggling?.majorName} will accept new curriculums and student intakes again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({ id: toggling.majorId, next: !toggling.isActive })
        }
      />
    </div>
  );
}

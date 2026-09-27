import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, CheckCircle2, Plus, PowerOff } from "lucide-react";
import {
  createSyllabus,
  getSyllabi,
  setSyllabusActive,
  updateSyllabus,
  type Syllabus,
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
  subjectLabel,
  useAdminWrite,
  useExpiredAdminSession,
  useSubjectOptions,
  useUserOptions,
  userLabel,
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
  subjectId: string;
  syllabusCode: string;
  syllabusName: string;
  version: string;
};
const emptyDraft: Draft = {
  subjectId: "",
  syllabusCode: "",
  syllabusName: "",
  version: "",
};

export function SyllabiRoute() {
  useRouteAnnouncer("Syllabi · LearnAble Admin", "Syllabi");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [author, setAuthor] = useState("all");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Syllabus | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Syllabus | null>(null);

  const subjects = useSubjectOptions();
  const lecturers = useUserOptions("Lecturer");
  const subjectRows = subjects.data?.items ?? [];
  const lecturerRows = lecturers.data?.items ?? [];

  const list = useQuery({
    queryKey: adminKeys.list("syllabi", [
      search,
      subject,
      author,
      active,
      page,
      size,
    ]),
    queryFn: () =>
      getSyllabi({
        SearchTerm: search,
        SubjectId: subject === "all" ? undefined : subject,
        CreatedBy: author === "all" ? undefined : author,
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
    resource: "syllabi",
    action: "Create syllabus",
    mutationFn: () =>
      createSyllabus({
        subjectId: draft.subjectId,
        syllabusCode: draft.syllabusCode.trim(),
        syllabusName: draft.syllabusName.trim(),
        version: draft.version.trim(),
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "syllabi",
    action: "Update syllabus",
    mutationFn: () =>
      updateSyllabus(editing!.syllabusId, {
        syllabusName: draft.syllabusName.trim(),
        version: draft.version.trim(),
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "syllabi",
    action: "Syllabus status change",
    // Topics hang off a syllabus, so their list can go stale too.
    alsoInvalidate: ["topics"],
    mutationFn: ({ id, next }) => setSyllabusActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.subjectId) found.push("Subject is required.");
    if (creating && !draft.syllabusCode.trim())
      found.push("Syllabus code is required.");
    if (!draft.syllabusName.trim()) found.push("Syllabus name is required.");
    if (!draft.version.trim()) found.push("Version is required.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setSubject("all");
    setAuthor("all");
    setActive("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Syllabi"
        description="Versioned teaching plans for a subject. Topics are grouped under a syllabus."
      >
        <Button
          disabled={!subjectRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New syllabus
        </Button>
      </PageHeading>
      {!subjects.isPending && !subjects.error && !subjectRows.length && (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-warning)] p-4 text-sm"
          style={{ background: "var(--color-warning-bg)" }}
        >
          Create a subject first — every syllabus belongs to one.
        </p>
      )}

      <section
        aria-label="Syllabus summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total syllabi"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<BookMarked aria-hidden className="size-5" />}
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
          detail="Retired teaching plans stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search syllabi"
        searchPlaceholder="Search by syllabus code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
        <ChoiceField
          label="Subject"
          value={subject}
          options={[
            { value: "all", label: "All subjects" },
            ...subjectRows.map((row) => ({
              value: row.subjectId,
              label: `${row.subjectCode} · ${row.subjectNameEn}`,
            })),
          ]}
          onChange={(value) => {
            setSubject(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Author"
          value={author}
          options={[
            { value: "all", label: "All authors" },
            ...lecturerRows.map((row) => ({
              value: row.userId,
              label: `${row.userCode} · ${row.fullName}`,
            })),
          ]}
          onChange={(value) => {
            setAuthor(value);
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
        pending={subjects.isPending}
        error={subjects.error}
        retry={() => void subjects.refetch()}
      />

      <TablePanel
        heading="All syllabi"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="syllabi"
        tableLabel="Syllabi table"
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
            <TableHead>Code &amp; version</TableHead>
            <TableHead>Syllabus</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.syllabusId}>
              <TableCell className="min-w-36">
                <p className="font-bold">{row.syllabusCode}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Version {row.version}
                </p>
              </TableCell>
              <TableCell className="min-w-64 max-w-sm whitespace-normal font-bold leading-relaxed">
                {row.syllabusName}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {subjectLabel(subjectRows, row.subjectId) ?? "Not available"}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {userLabel(lecturerRows, row.createdBy) ??
                  (row.authorRole ? `${row.authorRole} account` : "Not available")}
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
                        subjectId: row.subjectId,
                        syllabusCode: row.syllabusCode,
                        syllabusName: row.syllabusName,
                        version: row.version,
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
              columns={7}
              title="No syllabi match your filters."
              hint="Try another search, or create a teaching plan for a subject."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New syllabus" : "Edit syllabus"}
        description={
          creating
            ? "The subject and syllabus code are permanent once created."
            : `Update ${editing?.syllabusCode ?? ""}. Subject and code cannot be changed.`
        }
        submitLabel={creating ? "Create syllabus" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Subject of syllabus"
          value={draft.subjectId}
          placeholder="Select a subject"
          disabled={!creating}
          options={subjectRows.map((row) => ({
            value: row.subjectId,
            label: `${row.subjectCode} · ${row.subjectNameEn}`,
          }))}
          onChange={(value) => setDraft((old) => ({ ...old, subjectId: value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Syllabus code"
            value={draft.syllabusCode}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, syllabusCode: value }))
            }
            error={
              errors.some((e) => e.startsWith("Syllabus code"))
                ? "Syllabus code is required."
                : undefined
            }
          />
          <TextField
            label="Syllabus version"
            value={draft.version}
            onChange={(value) => setDraft((old) => ({ ...old, version: value }))}
            error={
              errors.some((e) => e.startsWith("Version"))
                ? "Version is required."
                : undefined
            }
          />
        </div>
        <TextField
          label="Syllabus name"
          value={draft.syllabusName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, syllabusName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Syllabus name"))
              ? "Syllabus name is required."
              : undefined
          }
        />
      </FormDialog>

      <ConfirmAction
        open={toggling !== null}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={
          toggling?.isActive ? "Deactivate syllabus?" : "Activate syllabus?"
        }
        description={
          toggling?.isActive
            ? `${toggling?.syllabusName} will stop accepting new topics. Existing topics and materials stay readable.`
            : `${toggling?.syllabusName} will accept new topics again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({ id: toggling.syllabusId, next: !toggling.isActive })
        }
      />
    </div>
  );
}

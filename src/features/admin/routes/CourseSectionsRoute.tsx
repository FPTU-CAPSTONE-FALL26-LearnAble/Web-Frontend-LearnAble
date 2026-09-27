import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, DoorOpen, Layers, Lock, Plus, Users } from "lucide-react";
import {
  cancelCourseSection,
  closeCourseSection,
  courseSectionStatuses,
  createCourseSection,
  getCourseSections,
  openCourseSection,
  updateCourseSection,
  type CourseSection,
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
  semesterLabel,
  subjectLabel,
  useAdminWrite,
  useExpiredAdminSession,
  useSemesterOptions,
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
  semesterId: string;
  lecturerId: string;
  sectionCode: string;
  capacity: string;
};
const emptyDraft: Draft = {
  subjectId: "",
  semesterId: "",
  lecturerId: "",
  sectionCode: "",
  capacity: "",
};
const noLecturer = "none";
type Transition = "open" | "close" | "cancel";

const statusTone = (status: string) =>
  status === "Open"
    ? ("success" as const)
    : status === "Closed"
      ? ("neutral" as const)
      : status === "Cancelled"
        ? ("danger" as const)
        : ("info" as const);

export function CourseSectionsRoute() {
  useRouteAnnouncer("Course Sections · LearnAble Admin", "Course Sections");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [semester, setSemester] = useState("all");
  const [lecturer, setLecturer] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CourseSection | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [transition, setTransition] = useState<{
    row: CourseSection;
    action: Transition;
  } | null>(null);

  const subjects = useSubjectOptions();
  const semesters = useSemesterOptions();
  const lecturers = useUserOptions("Lecturer");
  const subjectRows = subjects.data?.items ?? [];
  const semesterRows = semesters.data?.items ?? [];
  const lecturerRows = lecturers.data?.items ?? [];

  const list = useQuery({
    queryKey: adminKeys.list("courseSections", [
      search,
      subject,
      semester,
      lecturer,
      status,
      page,
      size,
    ]),
    queryFn: () =>
      getCourseSections({
        SearchTerm: search,
        SubjectId: subject === "all" ? undefined : subject,
        SemesterId: semester === "all" ? undefined : semester,
        LecturerId: lecturer === "all" ? undefined : lecturer,
        Status: status === "all" ? undefined : status,
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
  const lecturerValue = () =>
    draft.lecturerId === noLecturer || !draft.lecturerId
      ? null
      : draft.lecturerId;
  const capacityValue = () =>
    draft.capacity.trim() === "" ? null : Number(draft.capacity);
  const create = useAdminWrite({
    resource: "courseSections",
    action: "Create course section",
    mutationFn: () =>
      createCourseSection({
        subjectId: draft.subjectId,
        semesterId: draft.semesterId,
        lecturerId: lecturerValue(),
        sectionCode: draft.sectionCode.trim(),
        capacity: capacityValue(),
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "courseSections",
    action: "Update course section",
    mutationFn: () =>
      updateCourseSection(editing!.sectionId, {
        lecturerId: lecturerValue(),
        capacity: capacityValue(),
      }),
    onSuccess: closeForm,
  });
  const move = useAdminWrite<{ id: string; action: Transition }>({
    resource: "courseSections",
    action: "Course section transition",
    mutationFn: ({ id, action }) =>
      action === "open"
        ? openCourseSection(id)
        : action === "close"
          ? closeCourseSection(id)
          : cancelCourseSection(id),
    onSuccess: () => setTransition(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating) {
      if (!draft.subjectId) found.push("Subject is required.");
      if (!draft.semesterId) found.push("Semester is required.");
      if (!draft.sectionCode.trim()) found.push("Section code is required.");
    }
    if (draft.capacity.trim() !== "") {
      const capacity = Number(draft.capacity);
      if (!Number.isInteger(capacity) || capacity < 1)
        found.push("Capacity must be a whole number of 1 or more.");
    }
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setSubject("all");
    setSemester("all");
    setLecturer("all");
    setStatus("all");
    setPage(1);
  };
  const count = (value: string) =>
    rows.filter((row) => row.status === value).length;
  const unassigned = rows.filter((row) => !row.lecturerId).length;
  const referencePending =
    subjects.isPending || semesters.isPending || lecturers.isPending;
  const referenceError = subjects.error || semesters.error || lecturers.error;
  const canCreate = subjectRows.length > 0 && semesterRows.length > 0;

  const transitionCopy: Record<Transition, { title: string; confirm: string }> =
    {
      open: { title: "Open course section?", confirm: "Open" },
      close: { title: "Close course section?", confirm: "Close" },
      cancel: { title: "Cancel course section?", confirm: "Cancel section" },
    };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Course Sections"
        description="A subject taught in a semester by a lecturer. Sections open for enrolment, then close or are cancelled."
      >
        <Button
          disabled={!canCreate}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New course section
        </Button>
      </PageHeading>
      {!referencePending && !referenceError && !canCreate && (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-warning)] p-4 text-sm"
          style={{ background: "var(--color-warning-bg)" }}
        >
          A section needs both a subject and a semester. Create the missing one
          first.
        </p>
      )}

      <section
        aria-label="Course section summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total sections"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<Layers aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Open on this page"
          value={count("Open")}
          detail="Accepting enrolment"
          icon={<DoorOpen aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Closed on this page"
          value={count("Closed")}
          detail="Enrolment finished"
          icon={<Lock aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Without a lecturer"
          value={unassigned}
          detail={`Of ${rows.length} rows shown`}
          icon={<Users aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search course sections"
        searchPlaceholder="Search by section code"
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
          label="Semester"
          value={semester}
          options={[
            { value: "all", label: "All semesters" },
            ...semesterRows.map((row) => ({
              value: row.semesterId,
              label: `${row.semesterCode} · ${row.semesterName}`,
            })),
          ]}
          onChange={(value) => {
            setSemester(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Lecturer"
          value={lecturer}
          options={[
            { value: "all", label: "All lecturers" },
            ...lecturerRows.map((row) => ({
              value: row.userId,
              label: `${row.userCode} · ${row.fullName}`,
            })),
          ]}
          onChange={(value) => {
            setLecturer(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Section status"
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            ...courseSectionStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </FilterPanel>
      <ReadState
        pending={referencePending}
        error={referenceError}
        retry={() => {
          void subjects.refetch();
          void semesters.refetch();
          void lecturers.refetch();
        }}
      />

      <TablePanel
        heading="All course sections"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="sections"
        tableLabel="Course sections table"
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
            <TableHead>Section code</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.sectionId}>
              <TableCell className="font-bold">{row.sectionCode}</TableCell>
              <TableCell className="min-w-52 whitespace-normal">
                {subjectLabel(subjectRows, row.subjectId) ?? "Not available"}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {semesterLabel(semesterRows, row.semesterId) ?? "Not available"}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {row.lecturerId
                  ? (userLabel(lecturerRows, row.lecturerId) ??
                    (row.lecturerRole
                      ? `${row.lecturerRole} account`
                      : "Not available"))
                  : "Not assigned"}
              </TableCell>
              <TableCell className="tabular-nums">
                {row.capacity ?? "Not set"}
              </TableCell>
              <TableCell>
                <StatusBadge value={row.status} tone={statusTone(row.status)} />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        subjectId: row.subjectId,
                        semesterId: row.semesterId,
                        lecturerId: row.lecturerId ?? noLecturer,
                        sectionCode: row.sectionCode,
                        capacity:
                          row.capacity === null ? "" : String(row.capacity),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {row.status !== "Open" && row.status !== "Cancelled" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "open" })}
                    >
                      Open
                    </Button>
                  )}
                  {row.status === "Open" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "close" })}
                    >
                      Close
                    </Button>
                  )}
                  {row.status !== "Cancelled" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "cancel" })}
                    >
                      <Ban aria-hidden />
                      Cancel
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={8}
              title="No course sections match your filters."
              hint="Try another search, or schedule a subject into a semester."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New course section" : "Edit course section"}
        description={
          creating
            ? "Subject, semester and section code are permanent once created."
            : `Update ${editing?.sectionCode ?? ""}. The API accepts only the lecturer assignment and the capacity after creation.`
        }
        submitLabel={creating ? "Create section" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Subject of section"
          value={draft.subjectId}
          placeholder="Select a subject"
          disabled={!creating}
          options={subjectRows.map((row) => ({
            value: row.subjectId,
            label: `${row.subjectCode} · ${row.subjectNameEn}`,
          }))}
          onChange={(value) => setDraft((old) => ({ ...old, subjectId: value }))}
        />
        <ChoiceField
          label="Semester of section"
          value={draft.semesterId}
          placeholder="Select a semester"
          disabled={!creating}
          options={semesterRows.map((row) => ({
            value: row.semesterId,
            label: `${row.semesterCode} · ${row.semesterName} · ${row.status}`,
          }))}
          onChange={(value) =>
            setDraft((old) => ({ ...old, semesterId: value }))
          }
        />
        <ChoiceField
          label="Assigned lecturer"
          value={draft.lecturerId || noLecturer}
          placeholder="Select a lecturer"
          options={[
            { value: noLecturer, label: "Not assigned" },
            ...lecturerRows.map((row) => ({
              value: row.userId,
              label: `${row.userCode} · ${row.fullName}`,
            })),
          ]}
          onChange={(value) =>
            setDraft((old) => ({ ...old, lecturerId: value }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Section code"
            value={draft.sectionCode}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, sectionCode: value }))
            }
            error={
              errors.some((e) => e.startsWith("Section code"))
                ? "Section code is required."
                : undefined
            }
          />
          <TextField
            label="Seat capacity"
            type="number"
            min="1"
            value={draft.capacity}
            onChange={(value) =>
              setDraft((old) => ({ ...old, capacity: value }))
            }
            error={
              errors.some((e) => e.startsWith("Capacity"))
                ? "Capacity must be a whole number of 1 or more."
                : undefined
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Leave the capacity empty to record no seat limit.
        </p>
      </FormDialog>

      <ConfirmAction
        open={transition !== null}
        onOpenChange={(open) => {
          if (!open) setTransition(null);
        }}
        title={transition ? transitionCopy[transition.action].title : ""}
        description={
          transition?.action === "open"
            ? `${transition?.row.sectionCode} will accept enrolment.`
            : transition?.action === "close"
              ? `${transition?.row.sectionCode} will stop accepting enrolment. Students already enrolled keep their place.`
              : `${transition?.row.sectionCode} will be cancelled. A cancelled section cannot be reopened from this workspace.`
        }
        confirmLabel={transition ? transitionCopy[transition.action].confirm : ""}
        onConfirm={() =>
          transition &&
          move.mutate({
            id: transition.row.sectionId,
            action: transition.action,
          })
        }
      />
    </div>
  );
}

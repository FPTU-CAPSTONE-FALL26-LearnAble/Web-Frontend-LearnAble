import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Trash2, UserPlus, UserRound } from "lucide-react";
import {
  changeEnrollmentStatus,
  createStudentProfile,
  deleteStudentProfile,
  enrollmentStatuses,
  getStudentProfiles,
  type EnrollmentStatus,
  type StudentProfile,
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
import {
  adminKeys,
  curriculumLabel,
  majorLabel,
  useAdminWrite,
  useCurriculumOptions,
  useExpiredAdminSession,
  useMajorOptions,
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
  userId: string;
  majorId: string;
  curriculumId: string;
  intakeYear: string;
};
const emptyDraft: Draft = {
  userId: "",
  majorId: "",
  curriculumId: "",
  intakeYear: "",
};

const statusTone = (status: string) =>
  status === "Studying"
    ? ("success" as const)
    : status === "Graduated"
      ? ("info" as const)
      : status === "Reserved"
        ? ("warning" as const)
        : status === "DroppedOut"
          ? ("danger" as const)
          : ("neutral" as const);

export function StudentProfilesRoute() {
  useRouteAnnouncer("Student Profiles · LearnAble", "Student Profiles");
  const [major, setMajor] = useState("all");
  const [curriculum, setCurriculum] = useState("all");
  const [enrollment, setEnrollment] = useState("all");
  const [intake, setIntake] = useState("");
  const [appliedIntake, setAppliedIntake] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusChange, setStatusChange] = useState<{
    row: StudentProfile;
    next: EnrollmentStatus;
  } | null>(null);
  const [removing, setRemoving] = useState<StudentProfile | null>(null);

  const students = useUserOptions("Student");
  const majors = useMajorOptions();
  // Draft narrows its own curriculum options to the chosen major.
  const draftMajor = creating ? draft.majorId : undefined;
  const curriculums = useCurriculumOptions(draftMajor);
  const allCurriculums = useCurriculumOptions();

  const studentRows = students.data?.items ?? [];
  const majorRows = majors.data?.items ?? [];
  const curriculumRows = allCurriculums.data?.items ?? [];

  const list = useQuery({
    queryKey: adminKeys.list("studentProfiles", [
      major,
      curriculum,
      enrollment,
      appliedIntake,
      page,
      size,
    ]),
    queryFn: () =>
      getStudentProfiles({
        MajorId: major === "all" ? undefined : major,
        CurriculumId: curriculum === "all" ? undefined : curriculum,
        EnrollmentStatus: enrollment === "all" ? undefined : enrollment,
        IntakeYear: appliedIntake ? Number(appliedIntake) : undefined,
        PageNumber: page,
        PageSize: Number(size),
      }),
  });
  useExpiredAdminSession(list.error);
  const rows = list.data?.items ?? [];

  const closeForm = () => {
    setCreating(false);
    setDraft(emptyDraft);
    setErrors([]);
  };
  const create = useAdminWrite({
    resource: "studentProfiles",
    action: "Create student profile",
    mutationFn: () =>
      createStudentProfile({
        userId: draft.userId,
        majorId: draft.majorId,
        curriculumId: draft.curriculumId,
        intakeYear: Number(draft.intakeYear),
      }),
    onSuccess: closeForm,
  });
  const changeStatus = useAdminWrite<{
    id: string;
    status: EnrollmentStatus;
  }>({
    resource: "studentProfiles",
    action: "Enrollment status change",
    mutationFn: ({ id, status }) => changeEnrollmentStatus(id, status),
    onSuccess: () => setStatusChange(null),
  });
  const remove = useAdminWrite<string>({
    resource: "studentProfiles",
    action: "Delete student profile",
    mutationFn: (id) => deleteStudentProfile(id),
    onSuccess: () => setRemoving(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating) {
      if (!draft.userId) found.push("Student account is required.");
      if (!draft.majorId) found.push("Major is required.");
      if (!draft.curriculumId) found.push("Curriculum is required.");
      const intakeValue = Number(draft.intakeYear);
      if (
        !draft.intakeYear ||
        !Number.isInteger(intakeValue) ||
        intakeValue < 1900
      )
        found.push("Intake year must be a four-digit year.");
    }
    setErrors(found);
    if (found.length) return;
    create.mutate();
  };
  const reset = () => {
    setMajor("all");
    setCurriculum("all");
    setEnrollment("all");
    setIntake("");
    setAppliedIntake("");
    setPage(1);
  };
  const count = (value: string) =>
    rows.filter((row) => row.enrollmentStatus === value).length;
  const referencePending =
    students.isPending || majors.isPending || allCurriculums.isPending;
  const referenceError = students.error || majors.error || allCurriculums.error;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Student Profiles"
        description="The academic record behind a student account: major, curriculum, intake and enrollment status."
      >
        <Button
          disabled={!studentRows.length || !majorRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <UserPlus aria-hidden />
          New student profile
        </Button>
      </PageHeading>
      {!referencePending && !referenceError && !studentRows.length && (
        <p
          role="status"
          className="rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground"
        >
          Create a user account with the Student role first — a profile attaches
          to an existing account.
        </p>
      )}

      <section
        aria-label="Student profile summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total profiles"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<UserRound aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Studying on this page"
          value={count("Studying")}
          detail="Currently enrolled"
          icon={<GraduationCap aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Reserved on this page"
          value={count("Reserved")}
          detail="Temporarily paused"
          icon={<UserRound aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Graduated on this page"
          value={count("Graduated")}
          detail="Programme completed"
          icon={<GraduationCap aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search student profiles"
        searchPlaceholder="This endpoint filters by major, curriculum and intake"
        query={intake}
        onQueryChange={setIntake}
        onSearch={() => {
          setAppliedIntake(intake.trim());
          setPage(1);
        }}
        onReset={reset}
        hint="The StudentProfiles endpoint has no free-text search. The box above filters by intake year; use the selects for the rest."
      >
        <ChoiceField
          label="Major"
          value={major}
          options={[
            { value: "all", label: "All majors" },
            ...majorRows.map((row) => ({
              value: row.majorId,
              label: `${row.majorCode} · ${row.majorName}`,
            })),
          ]}
          onChange={(value) => {
            setMajor(value);
            setCurriculum("all");
            setPage(1);
          }}
        />
        <ChoiceField
          label="Curriculum"
          value={curriculum}
          options={[
            { value: "all", label: "All curriculums" },
            ...curriculumRows
              .filter((row) => major === "all" || row.majorId === major)
              .map((row) => ({
                value: row.curriculumId,
                label: `${row.curriculumCode} · ${row.version}`,
              })),
          ]}
          onChange={(value) => {
            setCurriculum(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Enrollment status"
          value={enrollment}
          options={[
            { value: "all", label: "All enrollment statuses" },
            ...enrollmentStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setEnrollment(value);
            setPage(1);
          }}
        />
      </FilterPanel>
      <ReadState
        pending={referencePending}
        error={referenceError}
        retry={() => {
          void students.refetch();
          void majors.refetch();
          void allCurriculums.refetch();
        }}
      />

      <TablePanel
        heading="All student profiles"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="profiles"
        tableLabel="Student profiles table"
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
            <TableHead>Student</TableHead>
            <TableHead>Major</TableHead>
            <TableHead>Curriculum</TableHead>
            <TableHead>Intake</TableHead>
            <TableHead>Enrollment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="min-w-56 whitespace-normal">
                <p className="font-bold leading-relaxed">
                  {userLabel(studentRows, row.userId) ?? "Account not in list"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(row.createdAt)}
                </p>
              </TableCell>
              <TableCell className="min-w-56 whitespace-normal">
                <p className="font-bold">
                  {majorLabel(majorRows, row.majorId) ?? "Not available"}
                </p>
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {curriculumLabel(curriculumRows, row.curriculumId) ??
                  "Not available"}
              </TableCell>
              <TableCell className="tabular-nums">{row.intakeYear}</TableCell>
              <TableCell>
                <StatusBadge
                  value={row.enrollmentStatus}
                  tone={statusTone(row.enrollmentStatus)}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    aria-label={`Delete profile of ${userLabel(studentRows, row.userId) ?? "this student"}`}
                    onClick={() => setRemoving(row)}
                  >
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </div>
                <div className="mt-2">
                  <ChoiceField
                    label="Set enrollment status"
                    visuallyHiddenLabel
                    value={row.enrollmentStatus}
                    placeholder="Change status"
                    options={enrollmentStatuses.map((value) => ({
                      value,
                      label: value,
                    }))}
                    onChange={(value) =>
                      value !== row.enrollmentStatus &&
                      setStatusChange({
                        row,
                        next: value as EnrollmentStatus,
                      })
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={6}
              title="No student profiles match your filters."
              hint="Adjust the selects, or create a profile for a student account."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title="New student profile"
        description="Account, major, curriculum and intake year are permanent in the current Backend contract."
        submitLabel="Create profile"
        pending={create.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Student account"
          value={draft.userId}
          placeholder="Select a student account"
          options={studentRows.map((row) => ({
            value: row.userId,
            label: `${row.userCode} · ${row.fullName}`,
          }))}
          onChange={(value) => setDraft((old) => ({ ...old, userId: value }))}
        />
        <ChoiceField
          label="Major of student"
          value={draft.majorId}
          placeholder="Select a major"
          options={majorRows.map((row) => ({
            value: row.majorId,
            label: `${row.majorCode} · ${row.majorName}`,
          }))}
          onChange={(value) =>
            setDraft((old) => ({
              ...old,
              majorId: value,
              curriculumId: "",
            }))
          }
        />
        <ChoiceField
          label="Curriculum of student"
          value={draft.curriculumId}
          placeholder="Select a curriculum"
          options={(curriculums.data?.items ?? []).map((row) => ({
            value: row.curriculumId,
            label: `${row.curriculumCode} · ${row.version} · ${row.intakeYear}`,
          }))}
          onChange={(value) =>
            setDraft((old) => ({ ...old, curriculumId: value }))
          }
        />
        <TextField
          label="Intake year of student"
          type="number"
          min="1900"
          value={draft.intakeYear}
          onChange={(value) =>
            setDraft((old) => ({ ...old, intakeYear: value }))
          }
          error={
            errors.some((e) => e.startsWith("Intake year"))
              ? "Intake year must be a four-digit year."
              : undefined
          }
        />
      </FormDialog>

      <ConfirmAction
        open={statusChange !== null}
        onOpenChange={(open) => {
          if (!open) setStatusChange(null);
        }}
        title="Change enrollment status?"
        description={`${userLabel(studentRows, statusChange?.row.userId) ?? "This student"} moves from ${statusChange?.row.enrollmentStatus ?? ""} to ${statusChange?.next ?? ""}.`}
        confirmLabel="Change status"
        onConfirm={() =>
          statusChange &&
          changeStatus.mutate({
            id: statusChange.row.userId,
            status: statusChange.next,
          })
        }
      />

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Delete student profile?"
        description={`The academic record for ${userLabel(studentRows, removing?.userId) ?? "this student"} will be removed. The user account itself is not deleted. This cannot be undone.`}
        confirmLabel="Delete profile"
        onConfirm={() => removing && remove.mutate(removing.userId)}
      />
    </div>
  );
}

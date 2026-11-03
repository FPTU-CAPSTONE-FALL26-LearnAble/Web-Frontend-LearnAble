/* eslint-disable jsx-a11y/label-has-associated-control -- Each selectable row contains its named Radix checkbox. */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getLecturerProfiles, getStudentProfiles } from "@/api/admin";
import {
  addExamEnrollments,
  checkExamScheduleConflicts,
  setExamInvigilators,
} from "@/api/exams";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import {
  ApiNotice,
  PreparationHeader,
  PreparationSteps,
} from "@/features/examiner/workflow/PreparationShell";
import { Button } from "@/shared/ui/primitives/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/primitives/avatar";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { toast } from "@/shared/ui/primitives/toast";

const steps = [
  "Shift & room",
  "Add students & lecturers",
  "Automatic seating",
  "Validate & publish",
];
const initials = (name?: string | null) =>
  (name ?? "User")
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function ScheduleCandidatesRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  const targets = draft.scheduleRooms.length
    ? draft.scheduleRooms
    : [
        {
          examRoomId: draft.examRoomId,
          roomLabel: "Selected room",
          examShiftId: draft.examShiftId,
          examScheduleId: draft.examScheduleId,
        },
      ];
  const [activeScheduleId, setActiveScheduleId] = useState(
    targets[0]?.examScheduleId ?? "",
  );
  const studentFileRef = useRef<HTMLInputElement>(null);
  const activeTarget =
    targets.find((item) => item.examScheduleId === activeScheduleId) ??
    targets[0];
  const activeAssignment = draft.assignmentsBySchedule[activeScheduleId] ?? {
    studentIds: [],
    lecturerIds: [],
  };
  const studentsInOtherRooms = new Set(
    Object.entries(draft.assignmentsBySchedule)
      .filter(([scheduleId]) => scheduleId !== activeScheduleId)
      .flatMap(([, assignment]) => assignment.studentIds),
  );
  const students = useQuery({
    queryKey: ["student-profiles", "schedule"],
    queryFn: () => getStudentProfiles({ PageNumber: 1, PageSize: 200 }),
  });
  const lecturers = useQuery({
    queryKey: ["lecturer-profiles", "schedule"],
    queryFn: () => getLecturerProfiles({ PageNumber: 1, PageSize: 100 }),
  });
  const assign = useMutation({
    mutationFn: async () => {
      const conflicts = await checkExamScheduleConflicts({
        examShiftId: activeTarget.examShiftId,
        studentIds: activeAssignment.studentIds,
        lecturerIds: activeAssignment.lecturerIds,
        excludeScheduleId: activeTarget.examScheduleId,
      });
      if (conflicts.length)
        throw new Error(`${conflicts.length} scheduling conflicts were found.`);
      await addExamEnrollments(
        activeTarget.examScheduleId,
        activeAssignment.studentIds.map((studentId) => ({
          studentId,
          extraTimeMinutes: 0,
          accommodationNotes: null,
        })),
      );
      await setExamInvigilators(
        activeTarget.examScheduleId,
        activeAssignment.lecturerIds.map((lecturerId, index) => ({
          lecturerId,
          assignmentRole:
            index === 0 ? ("Chief" as const) : ("Assistant" as const),
        })),
      );
    },
    onSuccess: () => {
      const completed = [
        ...new Set([...draft.assignedScheduleIds, activeScheduleId]),
      ];
      setDraft((current) => ({
        ...current,
        assignedScheduleIds: [
          ...new Set([...current.assignedScheduleIds, activeScheduleId]),
        ],
      }));
      const remaining = targets.find(
        (item) => !completed.includes(item.examScheduleId),
      );
      toast({
        title: `Assignments saved for ${activeTarget.roomLabel}`,
        description: remaining
          ? "Continue with the next room."
          : "All rooms now have candidates and invigilators.",
      });
      if (remaining) setActiveScheduleId(remaining.examScheduleId);
      else navigate("/examiner/schedule/new/rooms");
    },
  });
  const toggle = (key: "studentIds" | "lecturerIds", id: string) =>
    setDraft((current) => {
      const assignment = current.assignmentsBySchedule[activeScheduleId] ?? {
        studentIds: [],
        lecturerIds: [],
      };
      const values = assignment[key];
      return {
        ...current,
        assignmentsBySchedule: {
          ...current.assignmentsBySchedule,
          [activeScheduleId]: {
            ...assignment,
            [key]: values.includes(id)
              ? values.filter((value) => value !== id)
              : [...values, id],
          },
        },
      };
    });
  const importStudents = async (file?: File) => {
    if (!file) return;
    const identifiers = (await file.text())
      .split(/[\r\n,;\t]+/)
      .map((value) => value.trim())
      .filter((value) => value && !/^(user|student)[ _-]?id$/i.test(value));
    const available = new Map(
      (students.data?.items ?? []).map((student) => [
        student.userId.toLowerCase(),
        student.userId,
      ]),
    );
    const matched = [
      ...new Set(
        identifiers
          .map((id) => available.get(id.toLowerCase()))
          .filter((id): id is string => typeof id === "string")
          .filter((id) => !studentsInOtherRooms.has(id)),
      ),
    ];
    const unmatched = identifiers.length - matched.length;
    setDraft((current) => {
      const assignment = current.assignmentsBySchedule[activeScheduleId] ?? {
        studentIds: [],
        lecturerIds: [],
      };
      return {
        ...current,
        assignmentsBySchedule: {
          ...current.assignmentsBySchedule,
          [activeScheduleId]: {
            ...assignment,
            studentIds: [...new Set([...assignment.studentIds, ...matched])],
          },
        },
      };
    });
    toast({
      title: `${matched.length} student${matched.length === 1 ? "" : "s"} added`,
      description: unmatched
        ? `${unmatched} identifier${unmatched === 1 ? " was" : "s were"} not found in the Backend student list.`
        : `The imported students were added to ${activeTarget.roomLabel}.`,
    });
    if (studentFileRef.current) studentFileRef.current.value = "";
  };
  const selectableStudentIds = (students.data?.items ?? [])
    .filter((student) => !studentsInOtherRooms.has(student.userId))
    .map((student) => student.userId);
  const allStudentsSelected =
    selectableStudentIds.length > 0 &&
    selectableStudentIds.every((id) =>
      activeAssignment.studentIds.includes(id),
    );
  const toggleAllStudents = () =>
    setDraft((current) => {
      const assignment = current.assignmentsBySchedule[activeScheduleId] ?? {
        studentIds: [],
        lecturerIds: [],
      };
      return {
        ...current,
        assignmentsBySchedule: {
          ...current.assignmentsBySchedule,
          [activeScheduleId]: {
            ...assignment,
            studentIds: allStudentsSelected ? [] : selectableStudentIds,
          },
        },
      };
    });
  if (!draft.examScheduleId || !draft.examShiftId)
    return (
      <ApiNotice tone="error">
        Create a draft schedule before assigning people.{" "}
        <Link
          className="font-semibold underline"
          to="/examiner/schedule/new/details"
        >
          Return to shift setup
        </Link>
        .
      </ApiNotice>
    );
  return (
    <main className="space-y-6">
      <PreparationHeader
        title="Add Students and Lecturers"
        description="Add students and lecturers separately to each room. A student can belong to only one overlapping room schedule. The first selected lecturer is assigned as Chief."
      />
      <PreparationSteps steps={steps} current={1} />
      <section className="examiner-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Current room schedule
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {activeTarget.roomLabel}
          </h2>
        </div>
        <p
          className={`text-sm font-semibold ${draft.assignedScheduleIds.includes(activeScheduleId) ? "text-success" : "text-muted-foreground"}`}
        >
          {draft.assignedScheduleIds.includes(activeScheduleId)
            ? "Students and lecturers assigned"
            : "Pending assignment"}
        </p>
      </section>
      {assign.error ? (
        <ApiNotice tone="error">
          {assign.error instanceof Error
            ? assign.error.message
            : "Assignments could not be saved."}{" "}
          Resolve overlaps before continuing.
        </ApiNotice>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="examiner-major overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">
                  Students · {activeTarget.roomLabel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeAssignment.studentIds.length} selected for this room
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={students.isPending || !selectableStudentIds.length}
                onClick={toggleAllStudents}
              >
                {allStudentsSelected
                  ? "Clear this room"
                  : "Assign all available to this room"}
              </Button>
              <input
                ref={studentFileRef}
                className="sr-only"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                aria-label="Import student list"
                onChange={(event) =>
                  void importStudents(event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                disabled={students.isPending}
                onClick={() => studentFileRef.current?.click()}
              >
                <Upload />
                Import student list
              </Button>
            </div>
          </header>
          {students.isPending ? (
            <p className="p-5">Loading student profiles…</p>
          ) : (
            <div className="max-h-[520px] divide-y divide-border overflow-auto">
              {students.data?.items.map((student) => {
                const assignedElsewhere = studentsInOtherRooms.has(
                  student.userId,
                );
                return (
                  <label
                    key={student.userId}
                    className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  >
                    <Checkbox
                      disabled={assignedElsewhere}
                      checked={activeAssignment.studentIds.includes(
                        student.userId,
                      )}
                      onCheckedChange={() =>
                        toggle("studentIds", student.userId)
                      }
                    />
                    <Avatar className="h-18 w-14 rounded-md after:rounded-md">
                      <AvatarImage className="rounded-md" src={student.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="rounded-md">{initials(student.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <strong className="block truncate">
                        {student.fullName ?? `Student ${student.userId.slice(0, 8)}`}
                      </strong>
                      <span className="block text-sm text-muted-foreground">
                        {student.studentCode ?? student.userId.slice(0, 8)} ·{" "}
                        {assignedElsewhere
                          ? "Assigned to another room"
                          : (student.enrollmentStatus ??
                            "Status unavailable")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            CSV or TXT · one Backend Student User ID per row
          </p>
        </section>
        <section className="examiner-panel overflow-hidden">
          <header className="border-b border-border p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">
                  Suitable Lecturers · {activeTarget.roomLabel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeAssignment.lecturerIds.length} selected for this room
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground">
              Choose the lecturers for this room explicitly. Scheduling
              conflicts are checked when this room is saved.
            </p>
          </header>
          {lecturers.isPending ? (
            <p className="p-5">Loading lecturer profiles…</p>
          ) : (
            <div className="max-h-[520px] divide-y divide-border overflow-auto">
              {lecturers.data?.items.map((lecturer, index) => (
                <label
                  key={lecturer.userId}
                  className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={activeAssignment.lecturerIds.includes(
                      lecturer.userId,
                    )}
                    onCheckedChange={() =>
                      toggle("lecturerIds", lecturer.userId)
                    }
                  />
                  <Avatar className="h-18 w-14 rounded-md after:rounded-md">
                    <AvatarImage className="rounded-md" src={lecturer.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-md">{initials(lecturer.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <strong className="block truncate">
                      {lecturer.fullName ?? `Lecturer ${lecturer.userId.slice(0, 8)}`}
                    </strong>
                    <span className="block text-sm text-muted-foreground">
                      {lecturer.lecturerCode ?? lecturer.userId.slice(0, 8)} ·{" "}
                      {activeAssignment.lecturerIds[0] === lecturer.userId
                        ? "Chief lecturer"
                        : (lecturer.academicRank ?? `Lecturer ${index + 1}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        <Button variant="outline" asChild>
          <Link to="/examiner/schedule/new/details">
            <ArrowLeft />
            Back
          </Link>
        </Button>
        <Button
          disabled={
            !activeAssignment.studentIds.length ||
            !activeAssignment.lecturerIds.length ||
            assign.isPending
          }
          onClick={() => assign.mutate()}
        >
          {assign.isPending
            ? "Checking conflicts…"
            : `Save assignments for ${activeTarget.roomLabel}`}
          <ArrowRight />
        </Button>
      </div>
    </main>
  );
}

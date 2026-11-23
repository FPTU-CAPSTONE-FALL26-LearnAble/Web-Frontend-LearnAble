import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, MapPin, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/primitives/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Breadcrumb, PageHeading, ScrollRegion, StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  checkInStudent,
  checkOutStudent,
  closeExamSchedule,
  getExamSeatMap,
  getExamStudents,
  markStudentAbsent,
  undoCheckInStudent,
  undoStudentAbsence,
  type ExamStudent,
} from "@/api/exams";
import { describeError } from "@/app/providers";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import {
  absenceNote,
  checkInLocked,
  stageLabels,
  stageOrder,
  studentActions,
  studentStage,
  summarise,
  type StudentStage,
} from "@/features/lecturer/exams/attendanceState";
import { toast } from "@/shared/ui/primitives/toast";

type Action = "checkIn" | "undoCheckIn" | "markAbsent" | "undoAbsence" | "checkOut";

const toneOf: Record<StudentStage, "success" | "info" | "neutral" | "warning"> = {
  notCheckedIn: "warning",
  waiting: "success",
  ready: "success",
  inProgress: "info",
  submitted: "success",
  checkedOut: "neutral",
  absent: "neutral",
};

const doneMessages: Record<Action, string> = {
  checkIn: "Student checked in.",
  undoCheckIn: "Check-in was undone.",
  markAbsent: "Student marked absent.",
  undoAbsence: "Absence was undone.",
  checkOut: "Student checked out.",
};

const initials = (name?: string | null) => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(-2).map((part) => part[0]).join("").toUpperCase();
};

function StudentPortrait({ student, size = "compact" }: { student: ExamStudent; size?: "compact" | "large" }) {
  const abbreviation = initials(student.studentName);
  return (
    <Avatar className={`${size === "large" ? "h-24 w-18" : "h-20 w-14"} shrink-0 rounded-md after:rounded-md`}>
      <AvatarImage className="rounded-md object-cover" src={student.avatarUrl ?? undefined} alt={`ID photo of ${student.studentName ?? "student"}`} />
      <AvatarFallback className="rounded-md" aria-label={`ID photo unavailable for ${student.studentName ?? "student"}`}>
        {abbreviation || <UserRound className="size-6" aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}

export function AttendanceRoute() {
  useRouteAnnouncer("Student Attendance & Seating Map", "Student Attendance & Seating Map");
  const { examId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const scheduleId = examId ?? "";
  const enabled = Boolean(examId);
  const seatMap = useQuery({ queryKey: ["lecturer", "seat-map", scheduleId], queryFn: () => getExamSeatMap(scheduleId), enabled });
  const students = useQuery({ queryKey: ["lecturer", "exam-students", scheduleId], queryFn: () => getExamStudents(scheduleId), enabled });
  useExpiredSession(seatMap.error || students.error);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["lecturer", "exam-students", scheduleId] }),
    queryClient.invalidateQueries({ queryKey: ["lecturer", "seat-map", scheduleId] }),
  ]);
  const attendance = useMutation({
    mutationFn: ({ action, student }: { action: Action; student: ExamStudent }) => {
      const id = student.enrollmentId;
      if (action === "checkIn") return checkInStudent(scheduleId, id);
      if (action === "undoCheckIn") return undoCheckInStudent(scheduleId, id);
      if (action === "markAbsent") return markStudentAbsent(scheduleId, id, student.eTag);
      if (action === "undoAbsence") return undoStudentAbsence(scheduleId, id, student.eTag);
      return checkOutStudent(scheduleId, id);
    },
    onSuccess: async (_result, { action }) => {
      toast({ title: doneMessages[action] });
      await refresh();
    },
    onError: async (error) => {
      toast({ title: "Attendance was not updated", description: describeError(error), variant: "error" });
      await refresh();
    },
  });
  const closeRoom = useMutation({
    mutationFn: () => closeExamSchedule(scheduleId),
    onSuccess: async () => {
      setConfirmClose(false);
      toast({ title: "Exam room ended", description: "The room is now closed and attendance is read-only." });
      await refresh();
    },
    onError: (error) => {
      toast({ title: "The exam room could not be ended", description: describeError(error), variant: "error" });
    },
  });
  if (!examId) return <p role="alert">No exam schedule was selected.</p>;
  if (seatMap.isPending || students.isPending) return <div role="status" aria-label="Loading attendance" className="h-48 animate-pulse rounded-xl bg-muted" />;
  if (seatMap.error || students.error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
        <p className="font-bold">Unable to load attendance data.</p>
        <Button className="mt-3" variant="outline" onClick={() => { void seatMap.refetch(); void students.refetch(); }}>Retry</Button>
      </div>
    );
  }
  if (!seatMap.data) return <p role="status">No seat map is available for this schedule.</p>;
  const status = seatMap.data.scheduleStatus;
  const endsAt = seatMap.data.endsAt;
  const everyone = students.data?.items ?? [];
  const counts = summarise(everyone, status);
  const needle = search.toLowerCase();
  const rows = everyone.filter((student) => `${student.studentCode ?? ""} ${student.studentName ?? ""} ${student.seatCode ?? ""}`.toLowerCase().includes(needle));
  const checkedIn = everyone.length - counts.notCheckedIn - counts.absent;
  const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasActiveAttempt = everyone.some((student) => student.attemptProgress === "InProgress");
  const shiftEnded = Date.now() >= new Date(endsAt).getTime();
  const canCloseRoom = status === "Open" && shiftEnded && !hasActiveAttempt;
  return (
    <div className="space-y-6">
      <Breadcrumb parent="Exam Schedule" path="/lecturer/exams" current={`${seatMap.data.roomName ?? "Exam room"} · ${time(seatMap.data.startsAt)}–${time(endsAt)}`} currentClassName="font-semibold text-primary" />
      <PageHeading title="Student Attendance & Seating Map" />
      <dl aria-label="Attendance summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {stageOrder.map((stage) => (
          <div key={stage} className="rounded-xl border border-border p-3">
            <dt className="text-xs font-semibold text-muted-foreground">{stageLabels[stage]}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{counts[stage]}</dd>
          </div>
        ))}
      </dl>
      {checkInLocked(status) ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-warning-foreground/30 bg-warning/40 p-4 text-sm font-semibold">
          <Lock className="size-4 shrink-0" aria-hidden />
          {status === "Open"
            ? "Check-in is locked because the exam is open. A student who did not check in can only be marked absent."
            : "The exam has ended, so attendance can no longer be changed."}
        </p>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <Card className="border-border shadow-none">
          <CardHeader><CardTitle className="text-primary"><span className="font-bold">Seating map · {seatMap.data.roomName ?? "Exam room"}</span></CardTitle></CardHeader>
          <CardContent>
            <ScrollRegion label="Live seating map" className="overflow-x-auto">
              <ul aria-label="Seats" className="grid min-w-[520px] grid-cols-2 gap-3 sm:grid-cols-4">
                {seatMap.data.seats.map((seat) => {
                  const stage = seat.student ? studentStage(seat.student, status) : null;
                  return (
                    <li key={seat.seatId} className={`min-h-32 rounded-xl border p-3 ${stage === "absent" ? "border-muted-foreground/50 bg-muted/50" : stage && stage !== "notCheckedIn" ? "border-success-border" : "border-border"}`}>
                      <p className="flex items-center gap-1 text-xs font-bold"><MapPin className="size-4" aria-hidden />Seat {seat.seatCode ?? `${seat.rowNumber}-${seat.columnNumber}`}</p>
                      {seat.student ? (
                        <div className="mt-3 min-w-0">
                          <div className="flex min-w-0 items-start gap-3">
                            <StudentPortrait student={seat.student} />
                            <div className="min-w-0 pt-1">
                              <p className="break-words text-sm font-bold leading-tight">{seat.student.studentName ?? "Unnamed student"}</p>
                              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{seat.student.studentCode ?? "No student code"}</p>
                            </div>
                          </div>
                          <div className="mt-3"><StatusBadge value={stage ? stageLabels[stage] : "Available"} tone={stage ? toneOf[stage] : "neutral"} /></div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-sm font-bold">Available</p>
                          <p className="mt-1 text-xs text-muted-foreground">No candidate</p>
                          <div className="mt-3"><StatusBadge value="Available" tone="neutral" /></div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {seatMap.data.seats.length === 0 ? <p className="py-10 text-center text-muted-foreground">No seats have been configured for this room.</p> : null}
            </ScrollRegion>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-primary">
              <span className="font-bold">Student attendance</span>
              <StatusBadge value={`${checkedIn}/${students.data?.totalCount ?? everyone.length} checked in`} tone="info" />
            </CardTitle>
            <Input aria-label="Search attendance students" placeholder="Search name, student ID or seat" value={search} onChange={(event) => setSearch(event.target.value)} />
          </CardHeader>
          <CardContent>
            <ScrollRegion label="Live student list" className="max-h-[640px] space-y-3 overflow-y-auto">
              {rows.map((student) => {
                const stage = studentStage(student, status);
                const can = studentActions(student, status, endsAt);
                const note = absenceNote(student);
                const run = (action: Action) => attendance.mutate({ action, student });
                return (
                  <article key={student.enrollmentId} className="rounded-xl border border-border p-4">
                    <div className="flex items-start gap-4">
                      <StudentPortrait student={student} size="large" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-bold">{student.studentName ?? "Unnamed student"}</h3>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{student.studentCode ?? "No student code"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Seat {student.seatCode ?? "Unassigned"}</p>
                          </div>
                          <StatusBadge value={stageLabels[stage]} tone={toneOf[stage]} />
                        </div>
                        {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
                        {stage === "notCheckedIn" && checkInLocked(status) && !can.markAbsent ? <p className="mt-2 text-xs text-muted-foreground">Check-in is closed for this student.</p> : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {can.checkIn ? <Button variant="outline" disabled={attendance.isPending} onClick={() => run("checkIn")}>Check in</Button> : null}
                          {can.undoCheckIn ? <Button variant="outline" disabled={attendance.isPending} onClick={() => run("undoCheckIn")}>Undo check-in</Button> : null}
                          {can.markAbsent ? <Button variant="outline" disabled={attendance.isPending} onClick={() => run("markAbsent")}>Mark absent</Button> : null}
                          {can.undoAbsence ? <Button variant="outline" disabled={attendance.isPending} onClick={() => run("undoAbsence")}>Undo absence</Button> : null}
                          {can.checkOut ? <Button variant="outline" disabled={attendance.isPending} onClick={() => run("checkOut")}>Check out</Button> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">No students match this search.</p> : null}
            </ScrollRegion>
          </CardContent>
        </Card>
      </div>
      <footer className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="text-sm font-bold">{checkedIn}/{everyone.length} students checked in</p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {status === "Published"
              ? "Continue attendance until the examiner opens the exam."
              : status === "Open" && !shiftEnded
                ? `The room can be ended after ${time(endsAt)}.`
                : status === "Open" && hasActiveAttempt
                  ? "Wait until every student has submitted before ending the room."
                  : status === "Open"
                    ? "All requirements are met. You can end this exam room."
                    : status === "Closed"
                      ? "This exam room is closed."
                      : "Attendance follows the current exam status."}
          </p>
          {status === "Open" ? <Button disabled={!canCloseRoom || closeRoom.isPending} onClick={() => setConfirmClose(true)}>End exam room</Button> : null}
        </div>
      </footer>
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this exam room?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes the room for every student. Attendance can no longer be changed after the room is closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeRoom.isPending}>Keep room open</AlertDialogCancel>
            <AlertDialogAction disabled={closeRoom.isPending} onClick={(event) => { event.preventDefault(); closeRoom.mutate(); }}>
              {closeRoom.isPending ? "Ending…" : "End exam room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

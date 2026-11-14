import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorClosed, Lock, MapPin, PackageCheck, UnlockKeyhole } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Breadcrumb, PageHeading, ScrollRegion, StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
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
import {
  checkInStudent,
  closeExamSchedule,
  checkOutStudent,
  getExamPapers,
  getExamSchedule,
  getExamSeatMap,
  getExamStudents,
  getSharedExamShift,
  getShiftPaperSelection,
  markStudentAbsent,
  openExamSchedule,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";

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

export function AttendanceRoute() {
  useRouteAnnouncer("Student Attendance & Seating Map", "Student Attendance & Seating Map");
  const { examId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [examPaperId, setExamPaperId] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const scheduleId = examId ?? "";
  const enabled = Boolean(examId);
  const seatMap = useQuery({ queryKey: ["lecturer", "seat-map", scheduleId], queryFn: () => getExamSeatMap(scheduleId), enabled });
  const students = useQuery({ queryKey: ["lecturer", "exam-students", scheduleId], queryFn: () => getExamStudents(scheduleId), enabled });
  const schedule = useQuery({ queryKey: ["lecturer", "exam-schedule", scheduleId], queryFn: () => getExamSchedule(scheduleId), enabled });
  // A shift made for a sealed package is "shared": the backend only lets the examiner open it.
  const sharedShift = useQuery({
    queryKey: ["lecturer", "shared-shift", schedule.data?.examShiftId],
    queryFn: () => getSharedExamShift(schedule.data!.examShiftId),
    enabled: Boolean(schedule.data?.examShiftId),
    retry: false,
    meta: { silent: true },
  });
  const attachedPackage = useQuery({
    queryKey: ["lecturer", "shift-package", schedule.data?.examShiftId],
    queryFn: () => getShiftPaperSelection(schedule.data!.examShiftId),
    enabled: Boolean(schedule.data?.examShiftId),
    meta: { silent: true },
  });
  const papers = useQuery({
    queryKey: ["lecturer", "exam-papers", schedule.data?.examSubjectId],
    queryFn: () => getExamPapers(schedule.data!.examSubjectId),
    enabled: Boolean(schedule.data?.examSubjectId) && attachedPackage.isSuccess && !attachedPackage.data,
  });
  const publishedPapers = (papers.data ?? []).filter((paper) => paper.status === "Published" && paper.questions.length > 0);
  useExpiredSession(seatMap.error || students.error || schedule.error || papers.error);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["lecturer", "exam-students", scheduleId] }),
    queryClient.invalidateQueries({ queryKey: ["lecturer", "seat-map", scheduleId] }),
    queryClient.invalidateQueries({ queryKey: ["lecturer", "exam-schedule", scheduleId] }),
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
  const openSchedule = useMutation({
    mutationFn: () => openExamSchedule(scheduleId, attachedPackage.data ? undefined : examPaperId),
    onSuccess: async () => {
      toast({ title: "Exam opened", description: "Check-in is now locked. Checked-in students can start." });
      await refresh();
    },
    onError: (error) => toast({ title: "The exam could not be opened", description: describeError(error), variant: "error" }),
  });
  const closeRoom = useMutation({
    mutationFn: () => closeExamSchedule(scheduleId),
    onSuccess: async () => {
      setConfirmClose(false);
      toast({ title: "Exam ended for this room", description: "Attendance and results for this room are now fixed." });
      await refresh();
    },
    onError: async (error) => {
      setConfirmClose(false);
      toast({ title: "The room could not be closed", description: describeError(error), variant: "error" });
      await refresh();
    },
  });
  if (!examId) return <p role="alert">No exam schedule was selected.</p>;
  if (seatMap.isPending || students.isPending || schedule.isPending) return <div role="status" aria-label="Loading attendance" className="h-48 animate-pulse rounded-xl bg-muted" />;
  if (seatMap.error || students.error || schedule.error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
        <p className="font-bold">Unable to load attendance data.</p>
        <Button className="mt-3" variant="outline" onClick={() => { void seatMap.refetch(); void students.refetch(); void schedule.refetch(); }}>Retry</Button>
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
  const hasPackage = Boolean(attachedPackage.data);
  const sharedShiftOpenedByExaminer = sharedShift.isSuccess;
  const canOpen = !sharedShiftOpenedByExaminer && status !== "Open" && status !== "Closed" && status !== "Cancelled" && (hasPackage || Boolean(examPaperId));
  const shiftEnded = Date.now() >= new Date(endsAt).getTime();
  const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-6">
      <Breadcrumb parent="Exam Schedule" path="/lecturer/exams" current={`${seatMap.data.roomName ?? "Exam room"} · ${time(seatMap.data.startsAt)}–${time(endsAt)}`} />
      <PageHeading title="Student Attendance & Seating Map" description="Check students in, open the exam, then check them out after they submit." />
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
          <CardHeader><CardTitle className="text-primary">Seating map · {seatMap.data.roomName ?? "Exam room"}</CardTitle></CardHeader>
          <CardContent>
            <ScrollRegion label="Live seating map" className="overflow-x-auto">
              <ul aria-label="Seats" className="grid min-w-[520px] grid-cols-2 gap-3 sm:grid-cols-4">
                {seatMap.data.seats.map((seat) => {
                  const stage = seat.student ? studentStage(seat.student, status) : null;
                  return (
                    <li key={seat.seatId} className={`min-h-32 rounded-xl border p-3 ${stage === "absent" ? "border-muted-foreground/50 bg-muted/50" : stage && stage !== "notCheckedIn" ? "border-success-border" : "border-border"}`}>
                      <p className="flex items-center gap-1 text-xs font-bold"><MapPin className="size-4" aria-hidden />Seat {seat.seatCode ?? `${seat.rowNumber}-${seat.columnNumber}`}</p>
                      <p className="mt-3 truncate text-sm font-bold">{seat.student?.studentName ?? "Available"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{seat.student?.studentCode ?? "No candidate"}</p>
                      <div className="mt-3"><StatusBadge value={stage ? stageLabels[stage] : "Available"} tone={stage ? toneOf[stage] : "neutral"} /></div>
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
              <span>Student attendance</span>
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{student.studentName ?? "Unnamed student"}</h3>
                        <p className="text-xs text-muted-foreground">{student.studentCode ?? "No student code"} · Seat {student.seatCode ?? "Unassigned"}</p>
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
                  </article>
                );
              })}
              {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">No students match this search.</p> : null}
            </ScrollRegion>
          </CardContent>
        </Card>
      </div>
      <footer className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-end justify-between gap-3 border-t border-border bg-background px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="pb-3 text-sm font-bold">{checkedIn}/{everyone.length} students checked in</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80">
          {sharedShiftOpenedByExaminer && status !== "Open" && status !== "Closed" ? (
            <p role="status" className="flex items-center gap-2 text-sm font-semibold"><PackageCheck className="size-4 text-primary" aria-hidden />The examiner opens this exam for every room at once. Keep checking students in until it opens.</p>
          ) : null}
          {status !== "Open" && status !== "Closed" && hasPackage && !sharedShiftOpenedByExaminer ? (
            <p className="flex items-center gap-2 text-sm font-semibold"><PackageCheck className="size-4 text-primary" aria-hidden />A sealed exam package is attached to this exam.</p>
          ) : null}
          {status !== "Open" && status !== "Closed" && !hasPackage && attachedPackage.isSuccess ? (
            <div className="text-sm font-semibold">
              <span>Published exam paper</span>
              <Select value={examPaperId} onValueChange={setExamPaperId}>
                <SelectTrigger aria-label="Published exam paper" className="mt-1"><SelectValue placeholder={papers.isPending ? "Loading published papers…" : "Select the paper for this room"} /></SelectTrigger>
                <SelectContent>
                  {publishedPapers.map((paper) => <SelectItem key={paper.examPaperId} value={paper.examPaperId}>{paper.paperCode ?? "Paper"} · {paper.name ?? `Version ${paper.version}`}</SelectItem>)}
                </SelectContent>
              </Select>
              {!papers.isPending && publishedPapers.length === 0 ? <p role="alert" className="mt-1 text-sm font-normal text-destructive">No package is attached and no published paper is available. Ask the examiner to attach a package.</p> : null}
            </div>
          ) : null}
          {status === "Open" ? (
            <>
              <Button variant="outline" disabled={!shiftEnded || closeRoom.isPending} onClick={() => setConfirmClose(true)}>
                <DoorClosed aria-hidden />
                {closeRoom.isPending ? "Ending the exam…" : "End the exam for this room"}
              </Button>
              {!shiftEnded ? <p className="text-xs text-muted-foreground">Available once the shift ends at {time(endsAt)}. Only the chief invigilator can end the room.</p> : null}
            </>
          ) : sharedShiftOpenedByExaminer && status !== "Closed" ? null : (
            <Button disabled={openSchedule.isPending || !canOpen} onClick={() => openSchedule.mutate()}>
              <UnlockKeyhole aria-hidden />
              {status === "Closed" ? "Exam ended" : openSchedule.isPending ? "Opening exam…" : "Open exam"}
            </Button>
          )}
        </div>
      </footer>
      <AlertDialog open={confirmClose} onOpenChange={(open) => { if (!open && !closeRoom.isPending) setConfirmClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End the exam for this room?</AlertDialogTitle>
            <AlertDialogDescription>Students who have not checked in stay absent and nobody can check in or out afterwards. Every student must have submitted first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeRoom.isPending}>Keep the room open</AlertDialogCancel>
            <AlertDialogAction disabled={closeRoom.isPending} onClick={(event) => { event.preventDefault(); closeRoom.mutate(); }}>{closeRoom.isPending ? "Ending…" : "End the exam"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

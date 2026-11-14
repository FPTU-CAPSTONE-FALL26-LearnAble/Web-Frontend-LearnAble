import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Armchair, ArrowLeft, CalendarDays, CheckCircle2, Clock, DoorOpen, Trash2, UserRound, Users, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { getRoomSeats } from "@/api/admin";
import {
  cancelExamSchedule,
  deleteExamSchedule,
  getExamEnrollments,
  getExamInvigilators,
  getExamSchedule,
  getExamSeating,
  getExamShifts,
  getScheduleValidation,
  publishExamSchedule,
  updateExamSchedule,
} from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { ScheduleTimeline, clock, minutesBetween } from "@/features/examiner/components/ScheduleTimeline";
import { ShiftPackagePanel } from "@/features/examiner/components/ShiftPackagePanel";
import { SeatingPlan } from "@/features/examiner/components/SeatingPlan";
import type { BulkExamSchedulePlan } from "@/api/exams";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
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
import { toast } from "@/shared/ui/primitives/toast";
import { useEffect, useState } from "react";

type ConfirmAction = "cancel" | "delete" | null;

const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date(value));
const toLocalInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** How each status of a schedule is named and coloured, with what it means for the examiner. */
const statusLook: Record<string, { label: string; className: string; note: string }> = {
  Draft: { label: "Draft", className: "border-warning-foreground/30 bg-warning text-warning-foreground", note: "Only you can see this schedule. Publish it when it is ready." },
  Published: { label: "Published", className: "border-success-border bg-success text-success-foreground", note: "Assigned students and lecturers can see this schedule." },
  Open: { label: "Exam in progress", className: "border-primary/40 bg-primary/10 text-primary", note: "The exam room is open." },
  Closed: { label: "Finished", className: "border-border bg-muted text-muted-foreground", note: "The exam room is closed." },
  Cancelled: { label: "Cancelled", className: "border-destructive/40 bg-destructive/10 text-destructive", note: "This schedule was cancelled and is kept for the record." },
};

const attendanceWords: Record<string, string> = { Registered: "Registered", Active: "Registered", NotCheckedIn: "Not checked in", Present: "Present", Absent: "Absent", CheckedOut: "Checked out", Cancelled: "Cancelled" };

function when(startsAt: string, now = new Date()) {
  const start = new Date(startsAt).getTime();
  const days = Math.round((start - now.getTime()) / 86_400_000);
  if (start < now.getTime()) return "Already started";
  if (days <= 0) return "Today";
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

function StatTile({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="truncate text-2xl font-extrabold tabular-nums">{value}</dd>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

export function ExamScheduleDetailRoute() {
  const { scheduleId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [editShiftId, setEditShiftId] = useState("");
  const [entryOpensAt, setEntryOpensAt] = useState("");
  const [entryClosesAt, setEntryClosesAt] = useState("");
  const schedule = useQuery({ queryKey: ["examiner", "exam-schedule", scheduleId], queryFn: () => getExamSchedule(scheduleId), enabled: Boolean(scheduleId) });
  const enrollments = useQuery({ queryKey: ["examiner", "exam-schedule", scheduleId, "enrollments"], queryFn: () => getExamEnrollments(scheduleId), enabled: Boolean(scheduleId) });
  const invigilators = useQuery({ queryKey: ["examiner", "exam-schedule", scheduleId, "invigilators"], queryFn: () => getExamInvigilators(scheduleId), enabled: Boolean(scheduleId) });
  const seating = useQuery({ queryKey: ["examiner", "exam-schedule", scheduleId, "seating"], queryFn: () => getExamSeating(scheduleId), enabled: Boolean(scheduleId) });
  const validation = useQuery({ queryKey: ["examiner", "exam-schedule", scheduleId, "validation"], queryFn: () => getScheduleValidation(scheduleId), enabled: Boolean(scheduleId) });
  const shifts = useQuery({ queryKey: ["examiner", "exam-shifts", "planned"], queryFn: () => getExamShifts({ Status: "Planned" }) });
  const roomId = schedule.data?.examRoomId ?? "";
  const roomSeats = useQuery({ queryKey: ["exam-room-seats", roomId], queryFn: () => getRoomSeats(roomId), enabled: Boolean(roomId), staleTime: 60_000, retry: false, meta: { silent: true } });
  const error = schedule.error || enrollments.error || invigilators.error || seating.error || validation.error;
  useExpiredSession(error);
  useEffect(() => {
    if (!schedule.data) return;
    setEditShiftId(schedule.data.examShiftId);
    setEntryOpensAt(toLocalInput(schedule.data.entryOpensAt));
    setEntryClosesAt(toLocalInput(schedule.data.entryClosesAt));
  }, [schedule.data]);

  const refreshSchedules = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedules"] }),
      queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedule", scheduleId] }),
    ]);
  };
  const publish = useMutation({
    mutationFn: () => publishExamSchedule(scheduleId),
    onSuccess: async () => { await refreshSchedules(); toast({ title: "Schedule published", description: "Assigned students and lecturers can now see this exam schedule." }); },
    onError: (reason) => toast({ title: "Schedule could not be published", description: reason instanceof Error ? reason.message : "Resolve the readiness issues and try again." }),
  });
  const update = useMutation({
    mutationFn: () => updateExamSchedule(scheduleId, {
      examSubjectId: schedule.data!.examSubjectId,
      examShiftId: editShiftId,
      entryOpensAt: new Date(entryOpensAt).toISOString(),
      entryClosesAt: new Date(entryClosesAt).toISOString(),
    }),
    onSuccess: async () => {
      await Promise.all([
        refreshSchedules(),
        queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedule", scheduleId, "validation"] }),
        queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedule", scheduleId, "seating"] }),
      ]);
      toast({ title: "Draft schedule updated", description: "The shift and entry window were revalidated by the Backend." });
    },
    onError: (reason) => toast({ title: "Draft schedule could not be updated", description: reason instanceof Error ? reason.message : "Review the time window and try again." }),
  });
  const lifecycle = useMutation({
    mutationFn: (action: Exclude<ConfirmAction, null>) => action === "delete" ? deleteExamSchedule(scheduleId) : cancelExamSchedule(scheduleId),
    onSuccess: async (_, action) => {
      setConfirmAction(null);
      await queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedules"] });
      toast({ title: action === "delete" ? "Draft schedule deleted" : "Schedule cancelled" });
      navigate("/examiner/schedule");
    },
    onError: (reason) => toast({ title: "Schedule could not be updated", description: reason instanceof Error ? reason.message : "Refresh and try again." }),
  });

  if (schedule.isPending) return <p role="status" className="rounded-xl border border-border p-6">Loading exam schedule…</p>;
  if (schedule.error || !schedule.data) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">This exam schedule could not be loaded.</p><Button variant="outline" onClick={() => void schedule.refetch()}>Retry</Button></div>;

  const item = schedule.data;
  const startsInFuture = new Date(item.startsAt) > new Date();
  const canDelete = item.status === "Draft";
  const canCancel = startsInFuture && (item.status === "Draft" || item.status === "Published");
  const canPublish = item.status === "Draft" && validation.data?.isValid;
  const look = statusLook[item.status] ?? { label: item.status, className: "border-border bg-muted text-muted-foreground", note: "" };
  const students = enrollments.data ?? [];
  const seatByStudent = new Map((seating.data ?? []).map((seat) => [seat.studentId, seat]));
  // "Schedule is not Draft" is only a reason not to publish; once it is published it is not a problem.
  const problems = (validation.data?.errors ?? []).filter((message) => item.status === "Draft" || !/not draft/i.test(message));
  const planRoom: BulkExamSchedulePlan["rooms"][number] = {
    roomId: item.examRoomId,
    roomCode: null,
    roomName: item.roomName,
    capacity: roomSeats.data?.length ?? seating.data?.length ?? 0,
    students: (seating.data ?? []).map((seat) => {
      const enrollment = students.find((student) => student.studentId === seat.studentId);
      return { studentId: seat.studentId, studentName: enrollment?.studentName ?? null, seatId: seat.seatId, seatCode: seat.seatCode ?? null, rowNumber: seat.rowNumber, columnNumber: seat.columnNumber, extraTimeMinutes: enrollment?.extraTimeMinutes ?? 0, accommodationNotes: enrollment?.accommodationNotes ?? null };
    }),
    invigilators: (invigilators.data ?? []).map((lecturer) => ({ lecturerId: lecturer.lecturerId, lecturerName: lecturer.lecturerName, isChief: lecturer.assignmentRole === "Chief" })),
  };
  const withExtra = students.filter((student) => student.extraTimeMinutes > 0).length;
  return (
    <main className="space-y-6">
      <header className="space-y-4">
        <Button variant="ghost" asChild><Link to="/examiner/schedule"><ArrowLeft aria-hidden />Back to schedules</Link></Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">{item.examName ?? "Exam schedule"}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><DoorOpen aria-hidden className="size-4" />{item.roomName ?? "Room not named"}</span>
              <span className="flex items-center gap-1.5"><CalendarDays aria-hidden className="size-4" />{longDate.format(new Date(item.startsAt))}</span>
            </p>
          </div>
          <span className={`inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-bold ${look.className}`}>{look.label}</span>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">Some schedule details are temporarily unavailable. Reload this page to try again.</p> : null}

      <section aria-label="When" className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Clock aria-hidden className="size-4" />Shift</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">{clock(item.startsAt)} – {clock(item.endsAt)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{minutesBetween(item.startsAt, item.endsAt)} minutes in the room</p>
            <p className="text-muted-foreground">{when(item.startsAt)}</p>
          </div>
        </div>
        <div className="mt-6"><ScheduleTimeline startsAt={item.startsAt} endsAt={item.endsAt} entryOpensAt={item.entryOpensAt} entryClosesAt={item.entryClosesAt} /></div>
      </section>

      <dl aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<Users aria-hidden className="size-5" />} label="Students" value={enrollments.isPending ? "…" : String(students.length)} detail={withExtra ? `${withExtra} with extra time` : undefined} />
        <StatTile icon={<UserRound aria-hidden className="size-5" />} label="Invigilators" value={invigilators.isPending ? "…" : String(invigilators.data?.length ?? 0)} detail={(invigilators.data ?? []).find((lecturer) => lecturer.assignmentRole === "Chief")?.lecturerName ?? undefined} />
        <StatTile icon={<Armchair aria-hidden className="size-5" />} label="Seats given out" value={seating.isPending ? "…" : String(seating.data?.length ?? 0)} detail={roomSeats.data ? `of ${roomSeats.data.length} in the room` : undefined} />
        <StatTile icon={<DoorOpen aria-hidden className="size-5" />} label="Room" value={item.roomName ?? "—"} />
      </dl>

      <ShiftPackagePanel shiftId={item.examShiftId} scheduleStatus={item.status} />

      <section aria-label="Readiness" className={`flex flex-wrap items-start gap-4 rounded-2xl border p-5 ${item.status !== "Draft" ? "border-border bg-card" : validation.data?.isValid ? "border-success-border bg-success/40" : "border-warning-foreground/30 bg-warning/40"}`}>
        {item.status !== "Draft" || validation.data?.isValid ? <CheckCircle2 aria-hidden className="mt-0.5 size-6 shrink-0 text-success-foreground" /> : <AlertTriangle aria-hidden className="mt-0.5 size-6 shrink-0 text-warning-foreground" />}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">
            {item.status !== "Draft" ? look.label : validation.isPending ? "Checking the schedule…" : validation.data?.isValid ? "Ready to publish" : "A few things to fix before publishing"}
          </h2>
          {item.status === "Draft" && problems.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{problems.map((message) => <li key={message}>{message}</li>)}</ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{item.status === "Draft" && validation.data?.isValid ? "Students, invigilators, seats and times all pass the checks." : look.note}</p>
          )}
          {item.status !== "Draft" && problems.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">{problems.map((message) => <li key={message}>{message}</li>)}</ul> : null}
        </div>
        {item.status === "Draft" ? <Button disabled={!canPublish || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish schedule"}</Button> : null}
      </section>

      <section aria-label="People" className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="text-lg font-bold">Students</h2><span className="text-sm text-muted-foreground">{students.length} in total</span></header>
          {students.length ? (
            <table className="w-full text-sm">
              <caption className="sr-only">Students of this schedule, with their seat and status</caption>
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th scope="col" className="px-5 py-2 font-semibold">Student</th><th scope="col" className="px-3 py-2 font-semibold">Seat</th><th scope="col" className="px-5 py-2 text-right font-semibold">Status</th></tr></thead>
              <tbody>
                {students.map((student) => {
                  const seat = seatByStudent.get(student.studentId);
                  return (
                    <tr key={student.enrollmentId} className="border-b border-border last:border-0">
                      <td className="px-5 py-3"><span className="font-medium">{student.studentName ?? "Student"}</span>{student.extraTimeMinutes > 0 ? <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">+{student.extraTimeMinutes} min</span> : null}</td>
                      <td className="px-3 py-3 font-semibold tabular-nums">{seat?.seatCode ?? "—"}</td>
                      <td className="px-5 py-3 text-right"><Badge variant="outline">{attendanceWords[student.status] ?? student.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="p-5 text-sm text-muted-foreground">{enrollments.isPending ? "Loading students…" : "No students assigned."}</p>}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="text-lg font-bold">Invigilators</h2><span className="text-sm text-muted-foreground">{invigilators.data?.length ?? 0} in total</span></header>
          {(invigilators.data ?? []).length ? (
            <ul className="divide-y divide-border">
              {(invigilators.data ?? []).map((lecturer) => (
                <li key={lecturer.assignmentId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(lecturer.lecturerName ?? "L").split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{lecturer.lecturerName ?? "Lecturer"}</span>
                  <Badge variant={lecturer.assignmentRole === "Chief" ? "default" : "outline"}>{lecturer.assignmentRole === "Chief" ? "Chief" : "Assistant"}</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-sm text-muted-foreground">{invigilators.isPending ? "Loading invigilators…" : "No lecturers assigned."}</p>}
        </div>
      </section>

      {planRoom.students.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <SeatingPlan
            rooms={[planRoom]}
            seatsByRoom={{ [item.examRoomId]: roomSeats.data }}
            studentName={(student) => student.studentName ?? "Student"}
            roomName={(room) => room.roomName ?? "Room"}
          />
        </section>
      ) : null}

      {item.status === "Draft" ? (
        <section className="rounded-xl border border-border p-5">
          <div><h2 className="text-lg font-bold">Edit draft schedule</h2><p className="mt-1 text-sm text-muted-foreground">The Backend only allows Draft schedules to be edited. Moving to another shift clears the previous seating allocation.</p></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Label>Planned shift<Select value={editShiftId} onValueChange={setEditShiftId}><SelectTrigger><SelectValue placeholder="Select a planned shift" /></SelectTrigger><SelectContent>{(shifts.data?.items ?? []).map((shift) => <SelectItem key={shift.examShiftId} value={shift.examShiftId}>{shift.name ?? "Unnamed shift"} · {formatDateTime(shift.startsAt)}</SelectItem>)}</SelectContent></Select></Label>
            <Label>Entry opens<Input type="datetime-local" value={entryOpensAt} onChange={(event) => setEntryOpensAt(event.target.value)} /></Label>
            <Label>Entry closes<Input type="datetime-local" value={entryClosesAt} onChange={(event) => setEntryClosesAt(event.target.value)} /></Label>
          </div>
          <div className="mt-5 flex justify-end"><Button disabled={!editShiftId || !entryOpensAt || !entryClosesAt || update.isPending} onClick={() => update.mutate()}>{update.isPending ? "Saving…" : "Save draft changes"}</Button></div>
        </section>
      ) : null}

      <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        {canDelete ? <Button variant="outline" onClick={() => setConfirmAction("delete")}><Trash2 />Delete draft</Button> : null}
        {canCancel ? <Button variant="outline" onClick={() => setConfirmAction("cancel")}><XCircle />Cancel schedule</Button> : null}
      </footer>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => { if (!open && !lifecycle.isPending) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmAction === "delete" ? "Delete this draft schedule?" : "Cancel this schedule?"}</AlertDialogTitle><AlertDialogDescription>{confirmAction === "delete" ? "The draft, enrollments, lecturer assignments, and seating will be permanently removed." : "The schedule remains in history, but its active student and lecturer assignments will be cancelled."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={lifecycle.isPending}>Keep schedule</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={!confirmAction || lifecycle.isPending} onClick={() => { if (confirmAction) lifecycle.mutate(confirmAction); }}>{lifecycle.isPending ? "Updating…" : confirmAction === "delete" ? "Delete draft" : "Cancel schedule"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

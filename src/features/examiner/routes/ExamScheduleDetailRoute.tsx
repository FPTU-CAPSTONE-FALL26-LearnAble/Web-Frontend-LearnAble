import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2, Trash2, Users, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
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
  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <Button variant="ghost" asChild><Link to="/examiner/schedule"><ArrowLeft />Back to schedules</Link></Button>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{item.examName ?? "Exam schedule"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{item.roomName ?? "Room not named"} · {formatDateTime(item.startsAt)}</p>
        </div>
        <Badge variant="outline">{item.status}</Badge>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">Some schedule details are temporarily unavailable. Reload this page to try again.</p> : null}
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-border p-5">
          <CalendarClock className="text-primary" />
          <h2 className="mt-3 font-bold">Shift and entry window</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-muted-foreground">Shift</dt><dd className="font-semibold">{formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}</dd></div>
            <div><dt className="text-muted-foreground">Entry</dt><dd className="font-semibold">{formatDateTime(item.entryOpensAt)} – {formatDateTime(item.entryClosesAt)}</dd></div>
          </dl>
        </article>
        <article className="rounded-xl border border-border p-5">
          <Users className="text-primary" />
          <h2 className="mt-3 font-bold">Assignments</h2>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Students</dt><dd className="text-2xl font-extrabold">{enrollments.data?.length ?? "…"}</dd></div>
            <div><dt className="text-muted-foreground">Lecturers</dt><dd className="text-2xl font-extrabold">{invigilators.data?.length ?? "…"}</dd></div>
            <div><dt className="text-muted-foreground">Seats</dt><dd className="text-2xl font-extrabold">{seating.data?.length ?? "…"}</dd></div>
          </dl>
        </article>
        <article className="rounded-xl border border-border p-5">
          <CheckCircle2 className={validation.data?.isValid ? "text-success-foreground" : "text-primary"} />
          <h2 className="mt-3 font-bold">Readiness</h2>
          <p className="mt-3 text-sm font-semibold">{validation.isPending ? "Checking…" : validation.data?.isValid ? "Ready to publish" : "Action required"}</p>
          {validation.data?.errors.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-destructive">{validation.data.errors.map((message) => <li key={message}>{message}</li>)}</ul> : null}
        </article>
      </section>

      <section className="rounded-xl border border-border">
        <header className="border-b border-border p-5"><h2 className="text-lg font-bold">Assigned people</h2></header>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div><h3 className="font-bold">Students</h3><ul className="mt-3 divide-y divide-border">{(enrollments.data ?? []).map((student) => <li className="flex justify-between gap-3 py-3 text-sm" key={student.enrollmentId}><span>{student.studentName ?? student.studentId}</span><Badge variant="outline">{student.status}</Badge></li>)}</ul>{!enrollments.isPending && !enrollments.data?.length ? <p className="mt-3 text-sm text-muted-foreground">No students assigned.</p> : null}</div>
          <div><h3 className="font-bold">Lecturers</h3><ul className="mt-3 divide-y divide-border">{(invigilators.data ?? []).map((lecturer) => <li className="flex justify-between gap-3 py-3 text-sm" key={lecturer.assignmentId}><span>{lecturer.lecturerName ?? lecturer.lecturerId}</span><Badge variant="outline">{lecturer.assignmentRole}</Badge></li>)}</ul>{!invigilators.isPending && !invigilators.data?.length ? <p className="mt-3 text-sm text-muted-foreground">No lecturers assigned.</p> : null}</div>
        </div>
      </section>

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
        {item.status === "Draft" ? <Button disabled={!canPublish || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish schedule"}</Button> : null}
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

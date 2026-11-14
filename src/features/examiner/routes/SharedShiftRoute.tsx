import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { getExamEnrollments, getExamInvigilators, cancelSharedExamShift, getExamSchedule, getScheduleValidation, getSharedExamShift, getShiftPaperSelection } from "@/api/exams";
import { describeError } from "@/app/providers";
import { ShiftPackagePanel } from "@/features/examiner/components/ShiftPackagePanel";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
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

const when = (value: string) => new Date(value).toLocaleString();

function RoomRow({ scheduleId, roomName }: { scheduleId: string; roomName: string }) {
  const enrollments = useQuery({ queryKey: ["examiner", "shared-room", scheduleId, "enrollments"], queryFn: () => getExamEnrollments(scheduleId), meta: { silent: true } });
  const invigilators = useQuery({ queryKey: ["examiner", "shared-room", scheduleId, "invigilators"], queryFn: () => getExamInvigilators(scheduleId), meta: { silent: true } });
  const validation = useQuery({ queryKey: ["examiner", "shared-room", scheduleId, "validation"], queryFn: () => getScheduleValidation(scheduleId), meta: { silent: true } });
  const students = enrollments.data?.filter((item) => !/cancel/i.test(item.status)).length;
  const people = invigilators.data?.filter((item) => !/cancel/i.test(item.status)).length;
  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">{roomName}</p>
          <p className="text-sm text-muted-foreground">{students ?? "…"} students · {people ?? "…"} invigilators</p>
        </div>
        <div className="flex items-center gap-2">
          {validation.isPending ? <Badge variant="outline">Checking…</Badge> : validation.data?.isValid ? <Badge>Ready</Badge> : <Badge variant="destructive">Needs attention</Badge>}
          <Button variant="outline" asChild><Link to={`/examiner/schedule/${scheduleId}`}>Details</Link></Button>
        </div>
      </div>
      {validation.data && !validation.data.isValid ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {validation.data.errors.slice(0, 4).map((error) => <li key={error}>{error}</li>)}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * One shared shift for an exam that must be sealed: attach a package first, then add the people,
 * then publish. Only then does the examiner open every room at once.
 */
export function SharedShiftRoute() {
  const { shiftId = "" } = useParams();
  const navigate = useNavigate();
  const { setDraft } = useSchedulePreparationDraft();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const shift = useQuery({ queryKey: ["examiner", "shift-package", shiftId, "shift"], queryFn: () => getSharedExamShift(shiftId), enabled: Boolean(shiftId), meta: { silent: true } });
  const selection = useQuery({ queryKey: ["examiner", "shift-package", shiftId, "selection"], queryFn: () => getShiftPaperSelection(shiftId), enabled: Boolean(shiftId), meta: { silent: true } });
  const schedules = useQueries({
    queries: (shift.data?.scheduleIds ?? []).map((scheduleId) => ({ queryKey: ["examiner", "shared-room", scheduleId, "schedule"], queryFn: () => getExamSchedule(scheduleId), meta: { silent: true } })),
  });
  const cancelShift = useMutation({
    mutationFn: () => cancelSharedExamShift(shiftId, shift.data?.eTag),
    onSuccess: async () => {
      setCancelling(false);
      toast({ title: "Shift cancelled", description: "Its rooms are free again and its package is back in the pool." });
      await queryClient.invalidateQueries({ queryKey: ["examiner"] });
      void navigate("/examiner/schedule");
    },
    onError: (error) => {
      setCancelling(false);
      toast({ title: "The shift could not be cancelled", description: describeError(error), variant: "error" });
    },
  });
  if (shift.isPending) return <div role="status" aria-label="Loading the shift" className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (shift.isError || !shift.data) {
    return (
      <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
        <p className="font-bold">This shift could not be loaded.</p>
        <p className="mt-1 text-sm">{describeError(shift.error)}</p>
        <Button className="mt-3" variant="outline" onClick={() => void shift.refetch()}>Retry</Button>
      </div>
    );
  }
  const data = shift.data;
  const rooms = schedules.flatMap((query) => (query.data ? [query.data] : []));
  const hasPackage = Boolean(selection.data);
  const isDraft = data.status === "Draft";
  const canChange = data.status === "Draft" || data.status === "Published";
  const addPeople = () => {
    setDraft((current) => ({
      ...current,
      sharedShiftId: data.shiftId,
      examSubjectId: data.examSubjectId,
      shiftName: data.name ?? current.shiftName,
      examRoomIds: rooms.map((room) => room.examRoomId),
      examRoomId: rooms[0]?.examRoomId ?? "",
      studentIds: [],
      lecturerIds: [],
    }));
    void navigate("/examiner/schedule/new/candidates");
  };
  const steps = [
    { label: "Attach a package", done: hasPackage },
    { label: "Add students and invigilators", done: false },
    { label: "Publish the shift", done: data.status === "Published" || data.status === "Open" },
    { label: "Open the exam", done: data.status === "Open" },
  ];
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{data.name ?? "Exam shift"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{when(data.startsAt)} to {new Date(data.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {data.scheduleIds.length} room{data.scheduleIds.length === 1 ? "" : "s"} · {data.status ?? "Draft"}</p>
      </header>
      {canChange ? (
        <div className="flex flex-wrap gap-2">
          {isDraft ? <Button variant="outline" asChild><Link to={`/examiner/schedule/new/details?edit=${shiftId}`}>Edit rooms and times</Link></Button> : null}
          <Button variant="outline" onClick={() => setCancelling(true)}>Cancel the shift</Button>
        </div>
      ) : null}
      <ol aria-label="Shift progress" className="grid gap-2 md:grid-cols-4">
        {steps.map((step) => (
          <li key={step.label} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${step.done ? "border-success-border bg-success text-success-foreground" : "border-border text-muted-foreground"}`}>
            {step.done ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <CircleDashed className="size-4 shrink-0" aria-hidden />}
            {step.label}
          </li>
        ))}
      </ol>
      <ShiftPackagePanel shiftId={shiftId} scheduleStatus={data.status ?? "Draft"} />
      <section aria-label="Rooms and people" className="space-y-3 rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5 text-primary" aria-hidden />Rooms and people</h2>
          <Button disabled={!hasPackage || !isDraft || rooms.length === 0} onClick={addPeople}>Add students and invigilators</Button>
        </div>
        {!hasPackage && isDraft ? <p className="px-5 text-sm text-muted-foreground">Attach a package first. The Backend only accepts a package while no student or invigilator is assigned.</p> : null}
        <ul className="divide-y divide-border">
          {rooms.map((room) => <RoomRow key={room.examScheduleId} scheduleId={room.examScheduleId} roomName={room.roomName ?? "Exam room"} />)}
        </ul>
      </section>
      <AlertDialog open={cancelling} onOpenChange={(open) => { if (!open && !cancelShift.isPending) setCancelling(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this shift?</AlertDialogTitle>
            <AlertDialogDescription>The students and invigilators are released from every room, and the package goes back to the pool for another shift. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelShift.isPending}>Keep the shift</AlertDialogCancel>
            <AlertDialogAction disabled={cancelShift.isPending} onClick={(event) => { event.preventDefault(); cancelShift.mutate(); }}>{cancelShift.isPending ? "Cancelling…" : "Cancel the shift"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

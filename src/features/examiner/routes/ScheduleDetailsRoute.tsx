import { useEffect, useRef } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { getRoomSeats } from "@/api/admin";
import { createSharedExamShift, getExamRooms, getExamSchedule, getExamSubjects, getSharedExamShift, previewSharedExamShift, updateSharedExamShift, type SharedExamShiftInput } from "@/api/exams";
import { describeError } from "@/app/providers";
import { toast } from "@/shared/ui/primitives/toast";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, Field, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { getScheduleTimeError } from "@/features/examiner/workflow/scheduleValidation";
import { copyLocalDate, toLocalInput } from "@/features/examiner/workflow/dateTime";
import { DateTimeField } from "@/features/examiner/workflow/DateEntryFields";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";

/** How many seats a room has, from its seat list; rooms without seats cannot seat anyone. */
function SeatCount({ query }: { query?: { isPending: boolean; isError: boolean; data?: Array<{ isAvailable?: boolean | null }> } }) {
  if (!query || query.isPending) return <span>Counting seats…</span>;
  if (query.isError || !query.data) return <span>Seat count unavailable</span>;
  const total = query.data.length;
  const usable = query.data.filter((seat) => seat.isAvailable !== false).length;
  if (total === 0) return <span className="font-semibold text-destructive">No seats set up</span>;
  return <span>{usable === total ? `${total} seats` : `${usable} of ${total} seats usable`}</span>;
}

const steps = ["Exam, time & rooms", "Package & people", "Publish & open"];

export function ScheduleDetailsRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  // With ?edit=<shift id> the page changes a shift that has no package-bound people yet instead of creating one.
  const [params] = useSearchParams();
  const editId = params.get("edit") ?? "";
  const editShift = useQuery({ queryKey: ["examiner", "shift-package", editId, "shift"], queryFn: () => getSharedExamShift(editId), enabled: Boolean(editId), meta: { silent: true } });
  const editSchedules = useQueries({ queries: (editShift.data?.scheduleIds ?? []).map((id) => ({ queryKey: ["examiner", "shared-room", id, "schedule"], queryFn: () => getExamSchedule(id), meta: { silent: true } })) });
  const loadedEdit = useRef("");
  useEffect(() => {
    if (!editId || !editShift.data || editSchedules.length === 0 || editSchedules.some((query) => !query.data) || loadedEdit.current === editId) return;
    loadedEdit.current = editId;
    const first = editSchedules[0].data!;
    setDraft((current) => ({
      ...current,
      sharedShiftId: editId,
      examSubjectId: editShift.data.examSubjectId,
      shiftName: editShift.data.name ?? "",
      startsAt: toLocalInput(editShift.data.startsAt),
      endsAt: toLocalInput(editShift.data.endsAt),
      entryOpensAt: toLocalInput(first.entryOpensAt),
      entryClosesAt: toLocalInput(first.entryClosesAt),
      examRoomIds: editSchedules.map((query) => query.data!.examRoomId),
      examRoomId: first.examRoomId,
    }));
  }, [editId, editSchedules, editShift.data, setDraft]);
  const subjects = useQuery({ queryKey: ["exam-subjects", "schedule"], queryFn: () => getExamSubjects() });
  const rooms = useQuery({ queryKey: ["exam-rooms", "schedule"], queryFn: () => getExamRooms() });
  // The room list has no capacity; the seats of each room are the real number.
  const activeRooms = (rooms.data?.items ?? []).filter((room) => room.isActive);
  const seatQueries = useQueries({
    queries: activeRooms.map((room) => ({
      queryKey: ["exam-room-seats", room.examRoomId],
      queryFn: () => getRoomSeats(room.examRoomId),
      staleTime: 60_000,
      meta: { silent: true },
    })),
  });
  const seatsByRoom = new Map(activeRooms.map((room, index) => [room.examRoomId, seatQueries[index]]));
  const selectedExam = subjects.data?.items.find((item) => item.examSubjectId === draft.examSubjectId);
  const timeError = getScheduleTimeError({
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    entryOpensAt: draft.entryOpensAt,
    entryClosesAt: draft.entryClosesAt,
    durationMinutes: selectedExam?.durationMinutes ?? 0,
  });
  // Only exams written and sealed by a lecturer can be scheduled: one shared shift with a schedule per room.
  const sealedExams = (subjects.data?.items ?? []).filter((item) => item.status === "Ready" && item.requiresSealing === true);
  const ready = Boolean(draft.examSubjectId && draft.examRoomIds.length && draft.shiftName.trim() && !timeError);
  const shiftInput = (): SharedExamShiftInput => ({
    examSubjectId: draft.examSubjectId,
    name: draft.shiftName.trim(),
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
    entryOpensAt: new Date(draft.entryOpensAt).toISOString(),
    entryClosesAt: new Date(draft.entryClosesAt).toISOString(),
    roomIds: draft.examRoomIds,
  });
  const saveShift = useMutation({
    mutationFn: () => (editId ? updateSharedExamShift(editId, shiftInput(), editShift.data?.eTag) : createSharedExamShift(shiftInput())),
    onSuccess: (shift) => {
      setDraft((current) => ({ ...current, sharedShiftId: shift.shiftId }));
      toast(editId
        ? { title: "Shift updated", description: "The rooms and times of the shift were changed." }
        : { title: "Shift created", description: "Next, attach a package, then add the students and invigilators." });
      void navigate(`/examiner/schedule/shared/${shift.shiftId}`);
    },
    onError: (error) => toast({ title: editId ? "The shift could not be updated" : "The shift could not be created", description: describeError(error), variant: "error" }),
  });
  // Ask the Backend what the chosen rooms can offer, and whether they are free, before anything is created.
  const roomCheck = useQuery({
    queryKey: ["examiner", "shift-room-preview", draft.examSubjectId, draft.examRoomIds, draft.startsAt, draft.endsAt, draft.entryOpensAt, draft.entryClosesAt],
    queryFn: () => previewSharedExamShift(shiftInput()),
    enabled: ready && !editId,
    retry: false,
    meta: { silent: true },
  });
  return <main className="space-y-6"><PreparationHeader title={editId ? "Edit the exam shift" : "Create an exam schedule"} /><PreparationSteps steps={steps} current={0} />
    {subjects.isSuccess && sealedExams.length === 0 ? <ApiNotice>No sealed exam is ready to schedule. A lecturer writes the exam paper, seals it and hands it over first.</ApiNotice> : null}
    {subjects.error || rooms.error ? <ApiNotice tone="error">We couldn’t load the prepared exams or rooms. Check your connection and try again.</ApiNotice> : null}
    <form className="grid gap-6 xl:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      if (!ready) return;
      saveShift.mutate();
    }}>
      <section className="examiner-major p-6">
        <div className="flex items-center gap-3"><CalendarClock className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam and time window</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Exam configuration" hint="A sealed exam. The Backend picks one of its handed-over packages for this shift."><Select value={draft.examSubjectId} disabled={Boolean(editId)} onValueChange={(examSubjectId) => setDraft((value) => ({ ...value, examSubjectId }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select prepared exam" /></SelectTrigger><SelectContent>{sealedExams.map((item) => <SelectItem key={item.examSubjectId} value={item.examSubjectId}>{item.name ?? item.examSubjectId}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Shift name" hint="A short name for this room-bound exam shift."><Input value={draft.shiftName} onChange={(event) => setDraft((value) => ({ ...value, shiftName: event.target.value }))} placeholder="Morning shift · Room A302" /></Field>
          <DateTimeField
            label="Shift starts"
            value={draft.startsAt}
            onChange={(startsAt) => setDraft((value) => ({
              ...value,
              startsAt,
              endsAt: copyLocalDate(startsAt, value.endsAt),
              entryOpensAt: copyLocalDate(startsAt, value.entryOpensAt),
              entryClosesAt: copyLocalDate(startsAt, value.entryClosesAt),
            }))}
          />
          <DateTimeField label="Shift ends" value={draft.endsAt} onChange={(endsAt) => setDraft((value) => ({ ...value, endsAt }))} />
          <DateTimeField label="Entry opens" value={draft.entryOpensAt} onChange={(entryOpensAt) => setDraft((value) => ({ ...value, entryOpensAt }))} />
          <DateTimeField label="Entry closes" value={draft.entryClosesAt} onChange={(entryClosesAt) => setDraft((value) => ({ ...value, entryClosesAt }))} />
        </div>
      </section>
      <aside className="examiner-panel p-6">
        <div className="flex items-center gap-3"><MapPin className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam rooms</h2></div>
        <fieldset className="mt-6 space-y-2">
          <legend className="font-semibold">Select one or more active rooms</legend>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {rooms.data?.items.filter((room) => room.isActive).map((room) => {
              const checked = draft.examRoomIds.includes(room.examRoomId);
              const checkboxId = `room-${room.examRoomId}`;
              return <label key={room.examRoomId} htmlFor={checkboxId} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <Checkbox id={checkboxId} checked={checked} onCheckedChange={(next) => setDraft((value) => {
                  const examRoomIds = next === true ? [...new Set([...value.examRoomIds, room.examRoomId])] : value.examRoomIds.filter((id) => id !== room.examRoomId);
                  return { ...value, examRoomIds, examRoomId: examRoomIds[0] ?? "" };
                })} />
                <span className="min-w-0"><span className="block font-semibold">{room.roomCode} · {room.name ?? "Exam room"}</span><span className="block text-sm text-muted-foreground">{room.building ?? "Building not provided"} · <SeatCount query={seatsByRoom.get(room.examRoomId)} /></span></span>
              </label>;
            })}
          </div>
        </fieldset>
        {ready && !editId ? (
          <section aria-label="Room check" className="mt-4 space-y-2">
            {roomCheck.isPending ? <div role="status" aria-label="Checking the rooms" className="h-12 animate-pulse rounded-lg bg-muted" /> : null}
            {roomCheck.isError ? <ApiNotice tone="error">{describeError(roomCheck.error)}</ApiNotice> : null}
            {roomCheck.data ? (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {roomCheck.data.map((room) => <li key={room.roomId} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="font-semibold">{room.name ?? "Exam room"}</span><span className="text-muted-foreground">{room.availableComputerSeats} computer seats · {room.availableCameraSeats} with camera</span></li>)}
              </ul>
            ) : null}
          </section>
        ) : null}
        {timeError && draft.examSubjectId ? <ApiNotice tone="error">{timeError}</ApiNotice> : <ApiNotice>{draft.examRoomIds.length ? `${draft.examRoomIds.length} room${draft.examRoomIds.length === 1 ? "" : "s"} selected. Each room remains independently assignable and publishable.` : "Select at least one room to continue."}</ApiNotice>}
        <Button type="submit" className="mt-6 w-full" disabled={!ready || saveShift.isPending || Boolean(editId && !editShift.data)}>{saveShift.isPending ? "Saving the shift…" : editId ? "Save the shift" : "Create the shift"}<ArrowRight /></Button>
      </aside>
    </form>
  </main>;
}

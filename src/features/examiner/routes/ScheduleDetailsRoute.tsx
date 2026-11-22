import { useEffect, useRef, useState } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, CalendarRange, MapPin } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getRoomSeats } from "@/api/admin";
import { ApiFailure } from "@/api/client";
import { getSemesters } from "@/api/catalog";
import { createSharedExamShift, getExamRooms, getExamSchedule, getExamSubjects, getSealedExamPapers, getSharedExamShift, previewSharedExamShift, selectShiftPaper, updateSharedExamShift, type SharedExamShiftInput } from "@/api/exams";
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

function formatDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function ScheduleDetailsRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  // With ?edit=<shift id> the page changes a shift that has no package-bound people yet instead of creating one.
  const [params] = useSearchParams();
  const editId = params.get("edit") ?? "";
  const attachOperationId = useRef(crypto.randomUUID());
  const [createdWithoutPackage, setCreatedWithoutPackage] = useState<{ shiftId: string; message: string } | null>(null);
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
  const handedOverPapers = useQuery({ queryKey: ["examiner", "sealed-papers"], queryFn: getSealedExamPapers });
  const semesters = useQuery({ queryKey: ["catalog", "semesters"], queryFn: () => getSemesters({ PageSize: 100 }) });
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
  // Scheduling is allowed from the examiner's handed-over package pool. ExamSubject status alone
  // cannot prove that a lecturer has handed a package over, and was leaving this select empty.
  const handedOverExamIds = [...new Set((handedOverPapers.data ?? []).map((paper) => paper.examSubjectId))];
  const schedulableExams = handedOverExamIds.map((examSubjectId) => {
    const subject = subjects.data?.items.find((item) => item.examSubjectId === examSubjectId);
    const paper = handedOverPapers.data?.find((item) => item.examSubjectId === examSubjectId);
    return {
      examSubjectId,
      name: subject?.name ?? paper?.name ?? examSubjectId,
      durationMinutes: subject?.durationMinutes ?? paper?.durationMinutes ?? 0,
      semesterId: subject?.semesterId ?? paper?.semesterId ?? "",
    };
  });
  const selectedExam = schedulableExams.find((item) => item.examSubjectId === draft.examSubjectId);
  const selectedPackageCount = (handedOverPapers.data ?? []).filter((paper) => paper.examSubjectId === draft.examSubjectId).length;
  const selectedSemester = semesters.data?.items.find((item) => item.semesterId === selectedExam?.semesterId);
  const timeError = getScheduleTimeError({
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    entryOpensAt: draft.entryOpensAt,
    entryClosesAt: draft.entryClosesAt,
    durationMinutes: selectedExam?.durationMinutes ?? 0,
  });
  const shiftStartDate = draft.startsAt.slice(0, 10);
  const shiftEndDate = draft.endsAt.slice(0, 10);
  const semesterError = selectedSemester && shiftStartDate && shiftEndDate
    && (shiftStartDate < selectedSemester.startDate.slice(0, 10) || shiftEndDate > selectedSemester.endDate.slice(0, 10))
    ? `Shift must fit the semester (${formatDateOnly(selectedSemester.startDate)}–${formatDateOnly(selectedSemester.endDate)}).`
    : null;
  const validationError = !draft.examSubjectId
    ? "Select a handed-over exam."
    : !draft.shiftName.trim()
      ? "Enter a shift name."
      : draft.examRoomIds.length === 0
        ? "Select at least one active room."
        : timeError ?? semesterError;
  const ready = validationError === null;
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
    mutationFn: async () => {
      if (editId) {
        const shift = await updateSharedExamShift(editId, shiftInput(), editShift.data?.eTag);
        return { shift, packageAttached: false, attachError: null };
      }
      const shift = await createSharedExamShift(shiftInput());
      try {
        await selectShiftPaper(shift.shiftId, shift.eTag, attachOperationId.current);
        return { shift, packageAttached: true, attachError: null };
      } catch (attachError) {
        return { shift, packageAttached: false, attachError };
      }
    },
    onSuccess: ({ shift, packageAttached, attachError }) => {
      setDraft((current) => ({ ...current, sharedShiftId: shift.shiftId }));
      if (editId) {
        toast({ title: "Shift updated", description: "The rooms and times of the shift were changed." });
      } else if (packageAttached) {
        toast({ title: "Shift and package ready", description: "The matching sealed package was attached automatically. Next, add the students and invigilators." });
        void navigate(`/examiner/schedule/shared/${shift.shiftId}`);
      } else {
        const noUnusedPackage = attachError instanceof ApiFailure && attachError.detail.kind === "server" && attachError.detail.status === 409;
        const message = noUnusedPackage
          ? "No unused package is available for this exam. Release its package from another Draft shift, or ask the lecturer to seal and hand over a new version."
          : describeError(attachError);
        setCreatedWithoutPackage({ shiftId: shift.shiftId, message });
        toast({
          title: "Shift created, but its package could not be attached",
          description: message,
          variant: "error",
        });
      }
      if (editId) void navigate(`/examiner/schedule/shared/${shift.shiftId}`);
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
    {handedOverPapers.isSuccess && schedulableExams.length === 0 ? <ApiNotice>No handed-over exam package is ready to schedule. A lecturer must seal the paper and hand it over first.</ApiNotice> : null}
    {subjects.error || handedOverPapers.error || rooms.error ? <ApiNotice tone="error">We couldn’t load the handed-over exams or rooms. Check your connection and try again.</ApiNotice> : null}
    {createdWithoutPackage ? <ApiNotice tone="error"><strong>The shift was created, but no package was attached.</strong> {createdWithoutPackage.message} <Link className="font-semibold underline" to={`/examiner/schedule/shared/${createdWithoutPackage.shiftId}`}>Open this shift</Link>.</ApiNotice> : null}
    <form className="grid gap-6 xl:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      if (validationError) {
        toast({ title: "Complete the schedule", description: validationError, variant: "error" });
        return;
      }
      saveShift.mutate();
    }}>
      <section className="examiner-major p-6">
        <div className="flex items-center gap-3"><CalendarClock className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam and time window</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Exam configuration" hint="Choose an exam that has at least one sealed package handed over by a lecturer."><Select value={draft.examSubjectId} disabled={Boolean(editId) || Boolean(createdWithoutPackage)} onValueChange={(examSubjectId) => { setCreatedWithoutPackage(null); setDraft((value) => ({ ...value, examSubjectId })); }}><SelectTrigger className="w-full"><SelectValue placeholder="Select handed-over exam" /></SelectTrigger><SelectContent>{schedulableExams.map((item) => <SelectItem key={item.examSubjectId} value={item.examSubjectId}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
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
        {selectedExam && !editId ? <div className="mt-5 rounded-xl border border-warning-foreground/30 bg-warning p-4 text-warning-foreground"><strong className="block">{selectedPackageCount} sealed exam package{selectedPackageCount === 1 ? " has" : "s have"} been submitted</strong><p className="mt-1 text-sm">When you create the shift, LearnAble will attach an available package automatically. If every package is already in use, you can release one from another draft shift or ask the lecturer to submit a new package.</p></div> : null}
        {selectedSemester ? <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4"><CalendarRange className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><div><strong className="block">{selectedSemester.semesterName} · {selectedSemester.academicYear}</strong><span className="text-sm text-muted-foreground">Valid scheduling period: {formatDateOnly(selectedSemester.startDate)} – {formatDateOnly(selectedSemester.endDate)}</span></div></div> : null}
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
        {validationError
          ? <ApiNotice tone="error">{validationError}</ApiNotice>
          : <ApiNotice>{`${draft.examRoomIds.length} room${draft.examRoomIds.length === 1 ? "" : "s"} selected. Each room remains independently assignable and publishable.`}</ApiNotice>}
        <Button type="submit" className="mt-6 w-full" disabled={saveShift.isPending || Boolean(createdWithoutPackage) || Boolean(editId && !editShift.data)}>{saveShift.isPending ? "Saving the shift…" : createdWithoutPackage ? "Shift created — resolve package" : editId ? "Save the shift" : "Create the shift"}<ArrowRight /></Button>
      </aside>
    </form>
  </main>;
}

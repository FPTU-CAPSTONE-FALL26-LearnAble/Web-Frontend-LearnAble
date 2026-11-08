import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { getExamRooms, getExamSubjects } from "@/api/exams";
import { getInvigilationPeriod, getInvigilationPeriods } from "@/api/invigilation";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, Field, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { getScheduleTimeError } from "@/features/examiner/workflow/scheduleValidation";
import { combineLocalDateTime, copyLocalDate, formatDateEntry, formatTimeEntry, localDatePrefix, splitLocalDateTime } from "@/features/examiner/workflow/dateTime";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";

const steps = ["Exam, time & rooms", "People & allocation preview", "Validate & publish"];
function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = splitLocalDateTime(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  useEffect(() => {
    const next = splitLocalDateTime(value);
    setDate(next.date);
    setTime(next.time);
  }, [value]);

  const commit = (nextDate: string, nextTime: string) => {
    const nextValue = combineLocalDateTime(nextDate, nextTime);
    if (nextValue) onChange(nextValue);
    else {
      const datePrefix = localDatePrefix(nextDate);
      if (datePrefix) onChange(datePrefix);
      else if (!nextDate && !nextTime) onChange("");
    }
  };

  return (
    <Field label={label} hint="DD/MM/YYYY · 24-hour time">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} date`}
          placeholder="dd/mm/yyyy"
          value={date}
          onChange={(event) => {
            const nextDate = formatDateEntry(event.target.value);
            setDate(nextDate);
            commit(nextDate, time);
          }}
        />
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          aria-label={`${label} time`}
          placeholder="HH:mm"
          value={time}
          onChange={(event) => {
            const nextTime = formatTimeEntry(event.target.value);
            setTime(nextTime);
            commit(date, nextTime);
          }}
        />
      </div>
    </Field>
  );
}

export function ScheduleDetailsRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  const subjects = useQuery({ queryKey: ["exam-subjects", "schedule"], queryFn: () => getExamSubjects() });
  const rooms = useQuery({ queryKey: ["exam-rooms", "schedule"], queryFn: () => getExamRooms() });
  const periods = useQuery({ queryKey: ["invigilation-periods", "schedule"], queryFn: () => getInvigilationPeriods() });
  const period = useQuery({
    queryKey: ["invigilation-period", draft.invigilationPeriodId],
    queryFn: () => getInvigilationPeriod(draft.invigilationPeriodId),
    enabled: Boolean(draft.invigilationPeriodId),
  });
  const selectedExam = subjects.data?.items.find((item) => item.examSubjectId === draft.examSubjectId);
  const timeError = getScheduleTimeError({
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    entryOpensAt: draft.entryOpensAt,
    entryClosesAt: draft.entryClosesAt,
    durationMinutes: selectedExam?.durationMinutes ?? 0,
  });
  const ready = Boolean(draft.examSubjectId && draft.invigilationSlotId && draft.examRoomIds.length && draft.shiftName.trim() && !timeError);
  return <main className="space-y-6"><PreparationHeader title="Create an exam schedule" description="Choose the prepared exam, room, shift, and entry window. Entry times control when candidates may enter; they do not change the exam duration." /><PreparationSteps steps={steps} current={0} />
    {subjects.error || rooms.error ? <ApiNotice tone="error">We couldn’t load the prepared exams or rooms. Check your connection and try again.</ApiNotice> : null}
    <form className="grid gap-6 xl:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      if (!ready) return;
      setDraft((current) => ({
        ...current,
        bulkRequestId: current.bulkRequestId || crypto.randomUUID(),
        examRoomId: current.examRoomIds[0] ?? "",
        examShiftId: "",
        examScheduleId: "",
        scheduleRooms: [],
        assignmentsBySchedule: {},
        assignedScheduleIds: [],
      }));
      navigate("/examiner/schedule/new/candidates");
    }}>
      <section className="examiner-major p-6">
        <div className="flex items-center gap-3"><CalendarClock className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam and time window</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Exam configuration" hint="The prepared exam and policy used by this schedule."><Select value={draft.examSubjectId} onValueChange={(examSubjectId) => setDraft((value) => ({ ...value, examSubjectId }))}><SelectTrigger><SelectValue placeholder="Select prepared exam" /></SelectTrigger><SelectContent>{subjects.data?.items.map((item) => <SelectItem key={item.examSubjectId} value={item.examSubjectId}>{item.name ?? item.examSubjectId} · {item.status}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Shift name" hint="A short name for this room-bound exam shift."><Input value={draft.shiftName} onChange={(event) => setDraft((value) => ({ ...value, shiftName: event.target.value }))} placeholder="Morning shift · Room A302" /></Field>
          <Field label="Invigilation period" hint="The registration period used to verify lecturer availability."><Select value={draft.invigilationPeriodId} onValueChange={(invigilationPeriodId) => setDraft((value) => ({ ...value, invigilationPeriodId, invigilationSlotId: "" }))}><SelectTrigger><SelectValue placeholder="Select a period" /></SelectTrigger><SelectContent>{periods.data?.items.filter((item) => item.status !== "Cancelled").map((item) => <SelectItem key={item.periodId} value={item.periodId}>{item.name} · {item.status}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Invigilation slot" hint="Only lecturers registered for this slot can be allocated."><Select value={draft.invigilationSlotId} disabled={!draft.invigilationPeriodId || period.isPending} onValueChange={(invigilationSlotId) => {
            const slot = period.data?.slots.find((item) => item.slotId === invigilationSlotId);
            setDraft((value) => ({
              ...value,
              invigilationSlotId,
              startsAt: slot?.startsAt ?? value.startsAt,
              endsAt: slot?.endsAt ?? value.endsAt,
              entryOpensAt: slot?.startsAt ?? value.entryOpensAt,
              entryClosesAt: slot?.startsAt ?? value.entryClosesAt,
              lecturerIds: [],
            }));
          }}><SelectTrigger><SelectValue placeholder="Select a slot" /></SelectTrigger><SelectContent>{period.data?.slots.map((slot) => <SelectItem key={slot.slotId} value={slot.slotId}>{slot.name} · {new Date(slot.startsAt).toLocaleString()}</SelectItem>)}</SelectContent></Select></Field>
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
          <p className="text-sm text-muted-foreground">The Backend previews the selected rooms together, distributes students and lecturers, then creates all room schedules as one operation.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {rooms.data?.items.filter((room) => room.isActive).map((room) => {
              const checked = draft.examRoomIds.includes(room.examRoomId);
              const checkboxId = `room-${room.examRoomId}`;
              return <label key={room.examRoomId} htmlFor={checkboxId} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <Checkbox id={checkboxId} checked={checked} onCheckedChange={(next) => setDraft((value) => {
                  const examRoomIds = next === true ? [...new Set([...value.examRoomIds, room.examRoomId])] : value.examRoomIds.filter((id) => id !== room.examRoomId);
                  return { ...value, examRoomIds, examRoomId: examRoomIds[0] ?? "" };
                })} />
                <span className="min-w-0"><span className="block font-semibold">{room.roomCode} · {room.name ?? "Exam room"}</span><span className="block text-sm text-muted-foreground">{room.building ?? "Building not provided"} · Capacity {room.capacity ?? "not provided"}</span></span>
              </label>;
            })}
          </div>
        </fieldset>
        {timeError && draft.examSubjectId ? <ApiNotice tone="error">{timeError}</ApiNotice> : <ApiNotice>{draft.examRoomIds.length ? `${draft.examRoomIds.length} room${draft.examRoomIds.length === 1 ? "" : "s"} selected. Each room remains independently assignable and publishable.` : "Select at least one room to continue."}</ApiNotice>}
        <Button type="submit" className="mt-6 w-full" disabled={!ready}>Continue with {draft.examRoomIds.length || ""} room{draft.examRoomIds.length === 1 ? "" : "s"}<ArrowRight /></Button>
      </aside>
    </form>
  </main>;
}

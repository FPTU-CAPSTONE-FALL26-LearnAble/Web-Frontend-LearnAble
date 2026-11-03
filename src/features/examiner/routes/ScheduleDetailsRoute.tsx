import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { cancelExamShift, createExamSchedule, createExamShift, getExamRooms, getExamSubjects } from "@/api/exams";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, Field, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { getScheduleTimeError } from "@/features/examiner/workflow/scheduleValidation";
import { combineLocalDateTime, copyLocalDate, formatDateEntry, formatTimeEntry, localDatePrefix, splitLocalDateTime } from "@/features/examiner/workflow/dateTime";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";

const steps = ["Shift & room", "Add students & lecturers", "Automatic seating", "Validate & publish"];
const iso = (value: string) => new Date(value).toISOString();

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
  const create = useMutation({
    mutationFn: async () => {
      const room = rooms.data?.items.find((item) => item.examRoomId === draft.examRoomId);
      const shift = await createExamShift({ examRoomId: draft.examRoomId, name: `${draft.shiftName.trim()} · ${room?.roomCode ?? "Room"}`, startsAt: iso(draft.startsAt), endsAt: iso(draft.endsAt) });
      try {
        const schedule = await createExamSchedule({ examSubjectId: draft.examSubjectId, examShiftId: shift.examShiftId, entryOpensAt: iso(draft.entryOpensAt), entryClosesAt: iso(draft.entryClosesAt) });
        return { examRoomId: draft.examRoomId, roomLabel: `${room?.roomCode ?? "Room"} · ${room?.name ?? "Exam room"}`, examShiftId: shift.examShiftId, examScheduleId: schedule.examScheduleId };
      } catch (error) {
        await cancelExamShift(shift.examShiftId).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: (created) => {
      setDraft((current) => ({ ...current, examRoomIds: [created.examRoomId], examShiftId: created.examShiftId, examScheduleId: created.examScheduleId, scheduleRooms: [created], assignmentsBySchedule: {}, assignedScheduleIds: [] }));
      toast({ title: "Room schedule created", description: "Continue by adding students and lecturers to this room." });
      navigate("/examiner/schedule/new/candidates");
    },
  });
  const selectedExam = subjects.data?.items.find((item) => item.examSubjectId === draft.examSubjectId);
  const timeError = getScheduleTimeError({
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    entryOpensAt: draft.entryOpensAt,
    entryClosesAt: draft.entryClosesAt,
    durationMinutes: selectedExam?.durationMinutes ?? 0,
  });
  const ready = Boolean(draft.examSubjectId && draft.examRoomId && draft.shiftName.trim() && !timeError);
  return <main className="space-y-6"><PreparationHeader title="Create an exam schedule" description="Choose the prepared exam, room, shift, and entry window. Entry times control when candidates may enter; they do not change the exam duration." /><PreparationSteps steps={steps} current={0} />
    {subjects.error || rooms.error ? <ApiNotice tone="error">We couldn’t load the prepared exams or rooms. Check your connection and try again.</ApiNotice> : null}
    {create.error ? <ApiNotice tone="error">We couldn’t create this schedule. The temporary shift was cancelled, so you can safely review the details and try again.</ApiNotice> : null}
    <form className="grid gap-6 xl:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (ready) create.mutate(); }}>
      <section className="examiner-major p-6">
        <div className="flex items-center gap-3"><CalendarClock className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam and time window</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Exam configuration" hint="The prepared exam and policy used by this schedule."><Select value={draft.examSubjectId} onValueChange={(examSubjectId) => setDraft((value) => ({ ...value, examSubjectId }))}><SelectTrigger><SelectValue placeholder="Select prepared exam" /></SelectTrigger><SelectContent>{subjects.data?.items.map((item) => <SelectItem key={item.examSubjectId} value={item.examSubjectId}>{item.name ?? item.examSubjectId} · {item.status}</SelectItem>)}</SelectContent></Select></Field>
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
      <aside className="examiner-panel p-6"><div className="flex items-center gap-3"><MapPin className="size-5 text-primary" /><h2 className="text-xl font-semibold">Exam room</h2></div><div className="mt-6"><Field label="Select one room" hint="The Backend binds each shift and schedule to exactly one room."><Select value={draft.examRoomId} onValueChange={(examRoomId) => setDraft((value) => ({ ...value, examRoomId, examRoomIds: [examRoomId] }))}><SelectTrigger><SelectValue placeholder="Select an active exam room" /></SelectTrigger><SelectContent>{rooms.data?.items.filter((room) => room.isActive).map((room) => <SelectItem key={room.examRoomId} value={room.examRoomId}>{room.roomCode} · {room.name ?? "Exam room"}{room.building ? ` · ${room.building}` : ""} · Capacity {room.capacity ?? "not provided"}</SelectItem>)}</SelectContent></Select></Field></div>{timeError && draft.examSubjectId ? <ApiNotice tone="error">{timeError}</ApiNotice> : <ApiNotice>Complete and publish this room schedule first. To use another room for the same exam, create another schedule for that room.</ApiNotice>}<Button type="submit" className="mt-6 w-full" disabled={!ready || create.isPending}>{create.isPending ? "Creating room schedule…" : "Create room schedule"}<ArrowRight /></Button></aside>
    </form>
  </main>;
}

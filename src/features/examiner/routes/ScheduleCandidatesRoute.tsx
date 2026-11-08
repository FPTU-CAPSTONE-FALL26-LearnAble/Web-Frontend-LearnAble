/* eslint-disable jsx-a11y/label-has-associated-control -- Each selectable row contains its named Radix checkbox. */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Upload, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getStudentProfiles } from "@/api/admin";
import { createBulkExamSchedules, getExamRooms, previewBulkExamSchedules, type BulkExamScheduleInput } from "@/api/exams";
import { downloadStudentImportTemplate, getInvigilationCandidates, validateStudentImport, type StudentImportValidation } from "@/api/invigilation";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { toast } from "@/shared/ui/primitives/toast";

const steps = ["Exam, time & rooms", "People & allocation preview", "Validate & publish"];
const iso = (value: string) => new Date(value).toISOString();
const initials = (name?: string | null) => (name ?? "User").split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

export function ScheduleCandidatesRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [importReport, setImportReport] = useState<StudentImportValidation | null>(null);
  const [requestId] = useState(() => draft.bulkRequestId || crypto.randomUUID());
  const studentFileRef = useRef<HTMLInputElement>(null);
  const students = useQuery({ queryKey: ["student-profiles", "bulk-schedule"], queryFn: () => getStudentProfiles({ PageNumber: 1, PageSize: 200 }) });
  const lecturers = useQuery({
    queryKey: ["invigilation-candidates", draft.invigilationPeriodId, draft.invigilationSlotId],
    queryFn: () => getInvigilationCandidates(draft.invigilationPeriodId, draft.invigilationSlotId),
    enabled: Boolean(draft.invigilationPeriodId && draft.invigilationSlotId),
  });
  const rooms = useQuery({ queryKey: ["exam-rooms", "bulk-schedule"], queryFn: () => getExamRooms() });
  const input = useMemo<BulkExamScheduleInput>(() => ({
    requestId,
    examSubjectId: draft.examSubjectId,
    name: draft.shiftName.trim(),
    startsAt: iso(draft.startsAt),
    endsAt: iso(draft.endsAt),
    entryOpensAt: iso(draft.entryOpensAt),
    entryClosesAt: iso(draft.entryClosesAt),
    roomIds: draft.examRoomIds,
    students: draft.studentIds.map((studentId) => ({ studentId, extraTimeMinutes: 0, accommodationNotes: null })),
    lecturerIds: draft.lecturerIds,
    invigilationSlotId: draft.invigilationSlotId,
    invigilatorsPerRoom,
  }), [draft, invigilatorsPerRoom, requestId]);
  const preview = useMutation({ mutationFn: () => previewBulkExamSchedules(input) });
  const create = useMutation({
    mutationFn: async () => {
      if (!preview.data?.isValid || !preview.data.planHash) throw new Error("Preview a valid allocation before creating schedules.");
      return createBulkExamSchedules({ ...input, expectedPlanHash: preview.data.planHash });
    },
    onSuccess: (result) => {
      const scheduleRooms = result.schedules.map((item) => {
        const room = rooms.data?.items.find((candidate) => candidate.examRoomId === item.roomId);
        return { examRoomId: item.roomId, roomLabel: `${room?.roomCode ?? "Room"} · ${room?.name ?? "Exam room"}`, examShiftId: item.examShiftId, examScheduleId: item.examScheduleId };
      });
      const first = scheduleRooms[0];
      setDraft((current) => ({ ...current, bulkRequestId: result.requestId, examRoomId: first?.examRoomId ?? "", examShiftId: first?.examShiftId ?? "", examScheduleId: first?.examScheduleId ?? "", scheduleRooms, assignedScheduleIds: scheduleRooms.map((item) => item.examScheduleId) }));
      toast({ title: `${scheduleRooms.length} room schedules created`, description: "Students, seats, and lecturers were allocated from the Backend previewed plan." });
      navigate("/examiner/schedule/new/readiness");
    },
  });
  const resetPreview = () => preview.reset();
  const toggle = (key: "studentIds" | "lecturerIds", id: string) => setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  const selectableStudentIds = (students.data?.items ?? []).map((student) => student.userId);
  const allStudentsSelected = selectableStudentIds.length > 0 && selectableStudentIds.every((id) => draft.studentIds.includes(id));
  const toggleAllStudents = () => setDraft((current) => ({ ...current, studentIds: allStudentsSelected ? [] : selectableStudentIds }));
  const importStudents = async (file?: File) => {
    if (!file) return;
    try {
      const report = await validateStudentImport(draft.examSubjectId, file);
      const matched = report.rows.flatMap((row) => row.isValid && row.studentId ? [row.studentId] : []);
      setImportReport(report);
      setDraft((current) => ({ ...current, studentIds: [...new Set([...current.studentIds, ...matched])] }));
      resetPreview();
      toast({ title: `${report.validRows} students validated`, description: report.invalidRows ? `${report.invalidRows} row(s) need correction before they can be added.` : "The list is ready for allocation." });
    } finally {
      if (studentFileRef.current) studentFileRef.current.value = "";
    }
  };
  const downloadTemplate = async () => {
    const { blob, fileName } = await downloadStudentImportTemplate(draft.examSubjectId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName ?? "exam-student-import.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };
  if (!draft.examSubjectId || !draft.invigilationSlotId || !draft.examRoomIds.length) return <ApiNotice tone="error">Complete exam, invigilation slot, time, and room setup before selecting people. <Link className="font-semibold underline" to="/examiner/schedule/new/details">Return to shift setup</Link>.</ApiNotice>;
  const canPreview = draft.studentIds.length > 0 && draft.lecturerIds.length >= draft.examRoomIds.length * invigilatorsPerRoom;
  return <main className="space-y-6">
    <PreparationHeader title="Add Students and Lecturers" description="Select one shared pool. The Backend previews how students, seats, and lecturers will be distributed across all selected rooms." />
    <PreparationSteps steps={steps} current={1} />
    {(preview.error || create.error) ? <ApiNotice tone="error">{preview.error instanceof Error ? preview.error.message : create.error instanceof Error ? create.error.message : "The bulk schedule request could not be completed."}</ApiNotice> : null}
    <section className="examiner-panel flex flex-wrap items-end justify-between gap-4 p-5"><div><p className="text-sm font-semibold text-muted-foreground">Bulk allocation</p><h2 className="mt-1 text-xl font-semibold">{draft.examRoomIds.length} rooms · {draft.studentIds.length} students · {draft.lecturerIds.length} lecturers</h2></div><label className="w-52 text-sm font-semibold">Invigilators per room<Input className="mt-2" type="number" min={1} max={10} value={invigilatorsPerRoom} onChange={(event) => { setInvigilatorsPerRoom(Math.max(1, Number(event.target.value) || 1)); resetPreview(); }} /></label></section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="examiner-major overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div className="flex items-center gap-3"><Users className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Students</h2><p className="text-sm text-muted-foreground">{draft.studentIds.length} selected for automatic room and seat allocation</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!selectableStudentIds.length} onClick={() => { toggleAllStudents(); resetPreview(); }}>{allStudentsSelected ? "Clear all" : "Select all"}</Button><Button type="button" variant="outline" onClick={() => void downloadTemplate()}>Download template</Button><input ref={studentFileRef} className="sr-only" type="file" accept=".xlsx,.xls" aria-label="Import student list" onChange={(event) => void importStudents(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => studentFileRef.current?.click()}><Upload />Validate student list</Button></div></header>{importReport ? <div className="border-b border-border bg-secondary p-4 text-sm"><strong>{importReport.validRows} valid · {importReport.invalidRows} invalid</strong>{importReport.errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">{importReport.errors.slice(0, 5).map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.rowNumber ? `Row ${issue.rowNumber}: ` : ""}{issue.message}</li>)}</ul> : null}</div> : null}<div className="max-h-[520px] divide-y divide-border overflow-auto">{students.data?.items.map((student) => <label key={student.userId} className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent"><Checkbox checked={draft.studentIds.includes(student.userId)} onCheckedChange={() => { toggle("studentIds", student.userId); resetPreview(); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarImage className="rounded-md" src={student.avatarUrl ?? undefined} alt="" /><AvatarFallback className="rounded-md">{initials(student.fullName)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{student.fullName ?? `Student ${student.userId.slice(0, 8)}`}</strong><span className="block text-sm text-muted-foreground">{student.studentCode ?? student.userId.slice(0, 8)} · {student.enrollmentStatus ?? "Status unavailable"}</span></span></label>)}</div></section>
      <section className="examiner-panel overflow-hidden"><header className="border-b border-border p-5"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Registered Lecturers</h2><p className="text-sm text-muted-foreground">{draft.lecturerIds.length} selected from lecturers available for this slot</p></div></div></header><div className="max-h-[520px] divide-y divide-border overflow-auto">{lecturers.data?.items.map((lecturer) => <label key={lecturer.lecturerId} className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent"><Checkbox checked={draft.lecturerIds.includes(lecturer.lecturerId)} onCheckedChange={() => { toggle("lecturerIds", lecturer.lecturerId); resetPreview(); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarFallback className="rounded-md">{initials(lecturer.name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{lecturer.name}</strong><span className="block text-sm text-muted-foreground">{lecturer.userCode} · Registered {new Date(lecturer.registeredAt).toLocaleDateString()}</span></span></label>)}{!lecturers.isPending && !lecturers.data?.items.length ? <p className="p-6 text-center text-muted-foreground">No active lecturer has registered for this invigilation slot.</p> : null}</div></section>
    </div>
    {preview.data ? <section className="examiner-major p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Backend allocation preview</h2><p className="text-sm text-muted-foreground">Plan hash {preview.data.planHash?.slice(0, 12) ?? "not returned"}</p></div><strong className={preview.data.isValid ? "text-success" : "text-destructive"}>{preview.data.isValid ? "Ready to create" : "Needs attention"}</strong></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{preview.data.rooms.map((room) => <article key={room.roomId} className="rounded-xl border border-border p-4"><h3 className="font-semibold">{room.roomCode} · {room.roomName}</h3><p className="mt-1 text-sm text-muted-foreground">{room.students.length}/{room.capacity} students · {room.invigilators.length} lecturers</p><p className="mt-2 text-xs text-muted-foreground">Seats {room.students.slice(0, 4).map((student) => student.seatCode).filter(Boolean).join(", ") || "not allocated"}{room.students.length > 4 ? "…" : ""}</p></article>)}</div>{preview.data.unusedRoomIds.length || preview.data.unusedLecturerIds.length ? <ApiNotice><strong>Not used by this plan:</strong> {preview.data.unusedRoomIds.length ? `${preview.data.unusedRoomIds.length} room(s)` : ""}{preview.data.unusedRoomIds.length && preview.data.unusedLecturerIds.length ? " · " : ""}{preview.data.unusedLecturerIds.length ? `${preview.data.unusedLecturerIds.length} lecturer(s)` : ""}.</ApiNotice> : null}{preview.data.issues.length ? <ul className="mt-4 space-y-2">{preview.data.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{issue.message ?? issue.code ?? "Allocation issue"}</li>)}</ul> : null}</section> : null}
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5"><Button variant="outline" asChild><Link to="/examiner/schedule/new/details"><ArrowLeft />Back</Link></Button><Button variant="outline" disabled={!canPreview || preview.isPending} onClick={() => preview.mutate()}>{preview.isPending ? "Previewing allocation…" : "Preview allocation"}</Button><Button disabled={!preview.data?.isValid || !preview.data.planHash || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating schedules…" : "Create all schedules"}<ArrowRight /></Button></div>
  </main>;
}

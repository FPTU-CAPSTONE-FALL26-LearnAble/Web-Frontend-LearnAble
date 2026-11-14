/* eslint-disable jsx-a11y/label-has-associated-control -- Each selectable row contains its named Radix checkbox. */
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Upload, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getAllLecturerProfiles, getAllStudentProfiles, getAllStudentUsers, getRoomSeats } from "@/api/admin";
import { addExamEnrollments, autoAssignSeats, getExamSchedule, getExamSubject, getSharedExamShift, getShiftPaperSelection, setExamInvigilators } from "@/api/exams";
import { describeError } from "@/app/providers";
import { planSharedShiftPeople, type RoomSlot } from "@/features/examiner/workflow/sharedShiftPlan";
import { downloadStudentImportTemplate, validateStudentImport, type StudentImportValidation } from "@/api/invigilation";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { toast } from "@/shared/ui/primitives/toast";
import { describeImportFailure, describeImportIssue } from "@/features/examiner/workflow/studentImportMessages";
import { matchesStudentSearch, studentLabel } from "@/features/examiner/workflow/studentLabel";
import { loadStudentAccounts, readStudentNames, rememberStudentNames } from "@/features/examiner/workflow/studentNames";

const steps = ["Exam, time & rooms", "Package & people", "Publish & open"];
const initials = (name?: string | null) => (name ?? "User").split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

export function ScheduleCandidatesRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSchedulePreparationDraft();
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [importReport, setImportReport] = useState<StudentImportValidation | null>(null);

  const studentFileRef = useRef<HTMLInputElement>(null);
  const students = useQuery({ queryKey: ["student-profiles", "bulk-schedule"], queryFn: () => getAllStudentProfiles() });
  // The profile has no name or student code; those belong to the user account, matched by userId.
  const studentUsers = useQuery({ queryKey: ["student-users", "bulk-schedule"], queryFn: () => loadStudentAccounts(getAllStudentUsers), staleTime: 60_000, retry: false, meta: { silent: true } });
  // Where the account list is closed to this user, a validated student list still gives names and codes.
  const [knownNames, setKnownNames] = useState(readStudentNames);
  const accounts = useMemo(() => {
    const byId = new Map<string, { fullName?: string | null; userCode?: string | null }>(Object.entries(knownNames));
    for (const user of studentUsers.data?.items ?? []) byId.set(user.userId, user);
    return byId;
  }, [knownNames, studentUsers.data]);
  const [studentSearch, setStudentSearch] = useState("");
  // Only students whose name and code are known are listed; a row made of the start of an id says nothing.
  const namedStudents = useMemo(
    () => (students.data?.items ?? [])
      .map((profile) => ({ profile, label: studentLabel(profile, accounts.get(profile.userId)) }))
      .filter(({ label }) => label.known),
    [accounts, students.data],
  );
  const studentRows = useMemo(() => namedStudents.filter(({ label }) => matchesStudentSearch(label, studentSearch)), [namedStudents, studentSearch]);
  // Lecturers come from the list the school imported; they no longer register for shifts themselves.
  const lecturerProfiles = useQuery({ queryKey: ["lecturer-profiles", "schedule"], queryFn: getAllLecturerProfiles });
  const lecturers = useMemo(
    () => (lecturerProfiles.data?.items ?? []).map((profile) => ({ lecturerId: profile.userId, name: profile.fullName?.trim() || profile.lecturerCode?.trim() || "Lecturer", userCode: profile.lecturerCode?.trim() || "No code" })),
    [lecturerProfiles.data],
  );
  // A sealed exam is scheduled as a shared shift: its rooms already exist, so people are added room by room.
  const sharedShiftId = draft.sharedShiftId;
  const sharedShift = useQuery({ queryKey: ["examiner", "shift-package", sharedShiftId, "shift"], queryFn: () => getSharedExamShift(sharedShiftId), enabled: Boolean(sharedShiftId), meta: { silent: true } });
  const sharedPackage = useQuery({ queryKey: ["examiner", "shift-package", sharedShiftId, "selection"], queryFn: () => getShiftPaperSelection(sharedShiftId), enabled: Boolean(sharedShiftId), meta: { silent: true } });
  const sharedExam = useQuery({ queryKey: ["exam-subject", sharedShift.data?.examSubjectId], queryFn: () => getExamSubject(sharedShift.data!.examSubjectId), enabled: Boolean(sharedShift.data?.examSubjectId), meta: { silent: true } });
  // The Backend seats a student only at a seat with a computer, and with a camera when the exam blocks students without one.
  const needsCameraSeat = sharedExam.data?.cameraRequired === true && sharedExam.data.cameraUnavailablePolicy === "Block";
  const sharedSchedules = useQueries({ queries: (sharedShift.data?.scheduleIds ?? []).map((id) => ({ queryKey: ["examiner", "shared-room", id, "schedule"], queryFn: () => getExamSchedule(id), meta: { silent: true } })) });
  const sharedSeats = useQueries({ queries: sharedSchedules.map((query) => ({ queryKey: ["exam-room-seats", query.data?.examRoomId], queryFn: () => getRoomSeats(query.data!.examRoomId), enabled: Boolean(query.data), staleTime: 60_000, meta: { silent: true } })) });
  const sharedRooms: RoomSlot[] = sharedSchedules.flatMap((query, index) => (query.data ? [{ scheduleId: query.data.examScheduleId, roomId: query.data.examRoomId, roomLabel: query.data.roomName ?? "Exam room", seats: (sharedSeats[index]?.data ?? []).filter((seat) => seat.isAvailable && seat.hasComputer && (!needsCameraSeat || seat.hasCamera)).length }] : []));
  const sharedLoading = Boolean(sharedShiftId) && (sharedShift.isPending || sharedExam.isLoading || sharedPackage.isPending || sharedSchedules.some((query) => query.isPending) || sharedSeats.some((query) => query.isPending));
  const sharedPlan = planSharedShiftPeople({ rooms: sharedRooms, studentIds: draft.studentIds, lecturerIds: draft.lecturerIds, perRoom: invigilatorsPerRoom });
  const addPeople = useMutation({
    mutationFn: async () => {
      const failures: string[] = [];
      for (const room of sharedPlan.rooms) {
        try {
          if (room.studentIds.length) await addExamEnrollments(room.scheduleId, room.studentIds.map((studentId) => ({ studentId, extraTimeMinutes: 0, accommodationNotes: null })));
          if (room.invigilators.length) await setExamInvigilators(room.scheduleId, room.invigilators);
          await autoAssignSeats(room.scheduleId);
        } catch (error) {
          failures.push(`${room.roomLabel}: ${describeError(error)}`);
        }
      }
      if (failures.length) throw new Error(failures.join(" "));
    },
    onSuccess: () => {
      toast({ title: "People added", description: "Students, seats and invigilators are set for every room. Check each room, then publish the shift." });
      navigate(`/examiner/schedule/shared/${sharedShiftId}`);
    },
    onError: (error) => toast({ title: "Some rooms could not be filled", description: error instanceof Error ? error.message : "Try again from the shift page.", variant: "error" }),
  });
  const toggle = (key: "studentIds" | "lecturerIds", id: string) => setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  // Only students who are studying can sit an exam; the allocation check refuses anyone else.
  const canSit = (status?: string | null) => status === "Studying";
  const sitStatusById = useMemo(() => new Map((students.data?.items ?? []).map((profile) => [profile.userId, profile.enrollmentStatus])), [students.data]);
  // "Select all" works on the students shown who can sit the exam, so a search can pick out one group at a time.
  const selectableStudentIds = studentRows.filter(({ profile }) => canSit(profile.enrollmentStatus)).map(({ profile }) => profile.userId);
  const outsideIds = useMemo(() => draft.studentIds.filter((id) => sitStatusById.has(id) && sitStatusById.get(id) !== "Studying"), [draft.studentIds, sitStatusById]);
  useEffect(() => {
    // A student who stopped studying is taken out of the selection instead of failing the check later.
    if (!outsideIds.length) return;
    setDraft((current) => ({ ...current, studentIds: current.studentIds.filter((id) => !outsideIds.includes(id)) }));
  }, [outsideIds, setDraft]);
  const allStudentsSelected = selectableStudentIds.length > 0 && selectableStudentIds.every((id) => draft.studentIds.includes(id));
  const toggleAllStudents = () => setDraft((current) => ({
    ...current,
    studentIds: allStudentsSelected
      ? current.studentIds.filter((id) => !selectableStudentIds.includes(id))
      : [...new Set([...current.studentIds, ...selectableStudentIds])],
  }));
  const importStudents = async (file?: File) => {
    if (!file) return;
    try {
      // A new file starts from a clean report, so an error from the last file never outlives its cause.
      setImportReport(null);
      const report = await validateStudentImport(draft.examSubjectId, file);
      setKnownNames(rememberStudentNames(report.rows));
      const matched = report.rows.flatMap((row) => row.isValid && row.studentId ? [row.studentId] : []);
      setImportReport(report);
      setDraft((current) => ({ ...current, studentIds: [...new Set([...current.studentIds, ...matched])] }));
     
      toast({ title: `${report.validRows} students validated`, description: report.invalidRows ? `${report.invalidRows} row(s) need correction before they can be added.` : "The list is ready for allocation." });
    } catch (error) {
      toast({ title: "The student list could not be checked", description: describeImportFailure(error), variant: "error" });
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
  if (!sharedShiftId) return <ApiNotice tone="error">Create the exam shift first, then add the people. <Link className="font-semibold underline" to="/examiner/schedule/new/details">Go to shift setup</Link>.</ApiNotice>;
  return <main className="space-y-6">
    <PreparationHeader title="Add students and lecturers" description="Select one shared pool. The students and invigilators are spread over the rooms of the shift, and each room gets its seats." />
    <PreparationSteps steps={steps} current={1} />
    <section className="examiner-panel flex flex-wrap items-end justify-between gap-4 p-5"><div><p className="text-sm font-semibold text-muted-foreground">Allocation</p><h2 className="mt-1 text-xl font-semibold">{sharedRooms.length || draft.examRoomIds.length} rooms · {draft.studentIds.length} students · {draft.lecturerIds.length} lecturers</h2></div><label className="w-52 text-sm font-semibold">Invigilators per room<Input className="mt-2" type="number" min={1} max={10} value={invigilatorsPerRoom} onChange={(event) => { setInvigilatorsPerRoom(Math.max(1, Number(event.target.value) || 1)); }} /></label></section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="examiner-major overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div className="flex items-center gap-3"><Users className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Students</h2><p className="text-sm text-muted-foreground">{draft.studentIds.length} selected for automatic room and seat allocation</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!selectableStudentIds.length} onClick={() => { toggleAllStudents(); }}>{allStudentsSelected ? "Clear all" : studentSearch.trim() ? "Select shown" : "Select all"}</Button><Button type="button" variant="outline" onClick={() => void downloadTemplate()}>Download template</Button><input ref={studentFileRef} className="sr-only" type="file" accept=".xlsx,.xls" aria-label="Import student list" onChange={(event) => void importStudents(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => studentFileRef.current?.click()}><Upload />Validate student list</Button></div></header>{namedStudents.length ? <div className="space-y-2 border-b border-border p-4"><Input type="search" aria-label="Search students" placeholder="Search by name or student code" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} /><p role="status" className="text-xs text-muted-foreground">{studentRows.length} of {namedStudents.length} students shown</p></div> : null}{importReport ? <div className="border-b border-border bg-secondary p-4 text-sm"><div className="flex items-center justify-between gap-3"><strong>{importReport.validRows} valid · {importReport.invalidRows} invalid</strong><Button type="button" variant="ghost" onClick={() => setImportReport(null)}>Dismiss</Button></div>{importReport.errors.length ? <ul className="mt-3 space-y-2">{importReport.errors.slice(0, 5).map((issue, index) => { const row = issue.rowNumber ? importReport.rows.find((item) => item.rowNumber === issue.rowNumber) : undefined; const friendly = describeImportIssue(issue, row?.studentCode); return <li key={`${issue.code}-${index}`} className="rounded-lg border border-destructive/40 bg-background p-3"><p className="font-semibold text-destructive">{friendly.where}: {friendly.text}</p><p className="mt-1 text-muted-foreground">{friendly.fix}</p></li>; })}{importReport.errors.length > 5 ? <li className="text-muted-foreground">And {importReport.errors.length - 5} more problems. Fix these first, then choose the file again.</li> : null}</ul> : null}</div> : null}<div className="max-h-[520px] divide-y divide-border overflow-auto">{students.isPending || studentUsers.isPending ? <div role="status" aria-label="Loading students" className="animate-pulse space-y-2 p-5"><div className="h-14 rounded-lg bg-muted" /><div className="h-14 rounded-lg bg-muted" /><div className="h-14 rounded-lg bg-muted" /></div> : null}{!students.isPending && !studentUsers.isPending && namedStudents.length === 0 ? <div className="space-y-3 p-8 text-center"><p className="font-semibold">No student names to show yet</p><p className="text-sm text-muted-foreground">Choose Validate student list and pick a student file. The students in the file are listed here and selected for this exam.</p></div> : null}{namedStudents.length > 0 && studentRows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No student matches this search.</p> : null}{studentRows.map(({ profile: student, label }) => <label key={student.userId} className={`flex min-h-20 items-center gap-3 px-5 py-2 ${canSit(student.enrollmentStatus) ? "cursor-pointer hover:bg-accent" : "cursor-not-allowed bg-muted/40"}`}><Checkbox disabled={!canSit(student.enrollmentStatus)} checked={draft.studentIds.includes(student.userId)} onCheckedChange={() => { toggle("studentIds", student.userId); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarImage className="rounded-md" src={student.avatarUrl ?? undefined} alt="" /><AvatarFallback className="rounded-md">{initials(label.name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{label.name}</strong><span className="block text-sm text-muted-foreground">{label.code} · {student.enrollmentStatus ?? "Status unavailable"}</span>{canSit(student.enrollmentStatus) ? null : <span className="block text-xs font-semibold text-destructive">Not studying, so cannot sit this exam</span>}</span></label>)}</div></section>
      <section className="examiner-panel overflow-hidden"><header className="border-b border-border p-5"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Lecturers</h2><p className="text-sm text-muted-foreground">{draft.lecturerIds.length} selected to invigilate</p></div></div></header><div className="max-h-[520px] divide-y divide-border overflow-auto">{lecturers.map((lecturer) => <label key={lecturer.lecturerId} className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent"><Checkbox checked={draft.lecturerIds.includes(lecturer.lecturerId)} onCheckedChange={() => { toggle("lecturerIds", lecturer.lecturerId); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarFallback className="rounded-md">{initials(lecturer.name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{lecturer.name}</strong><span className="block text-sm text-muted-foreground">{lecturer.userCode}</span></span></label>)}{lecturerProfiles.isPending ? <p role="status" className="p-6 text-center text-muted-foreground">Loading lecturers…</p> : null}{lecturerProfiles.isError ? <p role="alert" className="p-6 text-center text-destructive">The lecturers could not be loaded. Try again.</p> : null}{lecturerProfiles.isSuccess && !lecturers.length ? <p className="p-6 text-center text-muted-foreground">No lecturer has been imported yet. Ask the school administrator to import the lecturer list.</p> : null}</div></section>
    </div>
        <section aria-label="Allocation plan" className="space-y-3 rounded-xl border border-border p-5">
          <h2 className="text-lg font-bold">How the people are spread over the rooms</h2>
          {sharedLoading ? <div role="status" aria-label="Loading the rooms" className="h-16 animate-pulse rounded-lg bg-muted" /> : null}
          {!sharedLoading && !sharedPackage.data ? <p role="alert" className="text-sm font-semibold text-destructive">Attach a package to the shift first, then come back to add people.</p> : null}
          {!sharedLoading ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sharedPlan.rooms.map((room) => <li key={room.scheduleId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span className="font-semibold">{room.roomLabel}</span><span className="text-muted-foreground">{room.studentIds.length} students · {room.invigilators.length} invigilators</span></li>)}
            </ul>
          ) : null}
          {!sharedLoading && sharedPlan.problems.length ? <ul role="status" className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{sharedPlan.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
        </section>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5"><Button variant="outline" asChild><Link to={`/examiner/schedule/shared/${sharedShiftId}`}><ArrowLeft />Back to the shift</Link></Button><Button disabled={sharedLoading || !sharedPackage.data || sharedPlan.problems.length > 0 || addPeople.isPending} onClick={() => addPeople.mutate()}>{addPeople.isPending ? "Adding people…" : "Add people to the shift"}<ArrowRight /></Button></div>
  </main>;
}

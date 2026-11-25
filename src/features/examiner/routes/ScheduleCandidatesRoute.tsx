/* eslint-disable jsx-a11y/label-has-associated-control -- Each selectable row contains its named Radix checkbox. */
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Upload, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getAllStudentProfiles, getAllStudentUsers, getRoomSeats } from "@/api/admin";
import {
  applyExamShiftAllocation,
  downloadInvigilatorImportTemplate,
  getExamSchedule,
  getSealedExamPapers,
  getExamShiftInvigilatorCandidates,
  getExamSubject,
  getSharedExamShift,
  getShiftPaperSelection,
  previewExamShiftAllocation,
  validateInvigilatorImport,
  type ExamShiftAllocationPlan,
} from "@/api/exams";
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
import { importReportMessages } from "@/features/examiner/workflow/importReport";
import { assertExcelImportFile, saveImportTemplate } from "@/lib/excelImport";
import { matchesStudentSearch, studentLabel } from "@/features/examiner/workflow/studentLabel";
import { loadStudentAccounts, readStudentNames, rememberStudentNames } from "@/features/examiner/workflow/studentNames";

const steps = ["Exam, time & rooms", "Package & people", "Publish & open"];
const initials = (name?: string | null) => (name ?? "User").split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

export function ScheduleCandidatesRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { draft, setDraft } = useSchedulePreparationDraft();
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [importReport, setImportReport] = useState<StudentImportValidation | null>(null);
  const [listError, setListError] = useState("");
  const [allocationPlan, setAllocationPlan] = useState<ExamShiftAllocationPlan | null>(null);

  const studentFileRef = useRef<HTMLInputElement>(null);
  const invigilatorFileRef = useRef<HTMLInputElement>(null);
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
  // This endpoint only returns lecturers the Backend considers eligible for this exact shift.
  const lecturerProfiles = useQuery({
    queryKey: ["exam-shift", draft.sharedShiftId, "invigilator-candidates"],
    queryFn: () => getExamShiftInvigilatorCandidates(draft.sharedShiftId),
    enabled: Boolean(draft.sharedShiftId),
  });
  const lecturers = useMemo(
    () => (lecturerProfiles.data?.items ?? []).map((profile) => ({ lecturerId: profile.lecturerId, name: profile.fullName?.trim() || profile.userCode?.trim() || "Lecturer", userCode: profile.userCode?.trim() || "No code" })),
    [lecturerProfiles.data],
  );
  // A sealed exam is scheduled as a shared shift: its rooms already exist, so people are added room by room.
  const sharedShiftId = draft.sharedShiftId;
  const sharedShift = useQuery({ queryKey: ["examiner", "shift-package", sharedShiftId, "shift"], queryFn: () => getSharedExamShift(sharedShiftId), enabled: Boolean(sharedShiftId), meta: { silent: true } });
  const sharedPackage = useQuery({ queryKey: ["examiner", "shift-package", sharedShiftId, "selection"], queryFn: () => getShiftPaperSelection(sharedShiftId), enabled: Boolean(sharedShiftId), meta: { silent: true } });
  const sealedPapers = useQuery({ queryKey: ["examiner", "sealed-papers"], queryFn: getSealedExamPapers, enabled: Boolean(sharedPackage.data), meta: { silent: true } });
  const selectedPackage = sealedPapers.data?.find((paper) => paper.versionId === sharedPackage.data?.versionId);
  const authoritativeExamSubjectId = sharedShift.data?.examSubjectId || draft.examSubjectId;
  const sharedExam = useQuery({
    queryKey: ["exam-subject", authoritativeExamSubjectId],
    queryFn: () => getExamSubject(authoritativeExamSubjectId),
    enabled: Boolean(authoritativeExamSubjectId),
    retry: false,
    meta: { silent: true },
  });
  // A sealed package is the authoritative exam snapshot for this shift. Some Backend deployments
  // no longer expose its original ExamSubject after handover; that must not block student import.
  const canImportStudents = Boolean(authoritativeExamSubjectId && sharedPackage.data);
  // The Backend seats a student only at a seat with a computer, and with a camera when the exam blocks students without one.
  const needsCameraSeat = sharedExam.data?.cameraRequired === true && sharedExam.data.cameraUnavailablePolicy === "Block";
  const sharedSchedules = useQueries({ queries: (sharedShift.data?.scheduleIds ?? []).map((id) => ({ queryKey: ["examiner", "shared-room", id, "schedule"], queryFn: () => getExamSchedule(id), meta: { silent: true } })) });
  const sharedSeats = useQueries({ queries: sharedSchedules.map((query) => ({ queryKey: ["exam-room-seats", query.data?.examRoomId], queryFn: () => getRoomSeats(query.data!.examRoomId), enabled: Boolean(query.data), staleTime: 60_000, meta: { silent: true } })) });
  const sharedRooms: RoomSlot[] = sharedSchedules.flatMap((query, index) => (query.data ? [{ scheduleId: query.data.examScheduleId, roomId: query.data.examRoomId, roomLabel: query.data.roomName ?? "Exam room", seats: (sharedSeats[index]?.data ?? []).filter((seat) => seat.isAvailable && seat.hasComputer && (!needsCameraSeat || seat.hasCamera)).length }] : []));
  const sharedLoading = Boolean(sharedShiftId) && (sharedShift.isPending || sharedExam.isLoading || sharedPackage.isPending || sharedSchedules.some((query) => query.isPending) || sharedSeats.some((query) => query.isPending));
  const sharedPlan = planSharedShiftPeople({ rooms: sharedRooms, studentIds: draft.studentIds, lecturerIds: draft.lecturerIds, perRoom: invigilatorsPerRoom });
  const allocationInput = () => ({
    requestId: crypto.randomUUID(),
    students: draft.studentIds.map((studentId) => ({ studentId, extraTimeMinutes: 0, accommodationNotes: null })),
    lecturerIds: draft.lecturerIds,
    invigilatorsPerRoom,
  });
  const previewAllocation = useMutation({
    mutationFn: () => previewExamShiftAllocation(sharedShiftId, allocationInput()),
    onSuccess: (plan) => setAllocationPlan(plan),
    onError: (error) => toast({ title: "The allocation could not be previewed", description: describeError(error), variant: "error" }),
  });
  const addPeople = useMutation({
    mutationFn: async () => {
      if (!allocationPlan?.planHash) throw new Error("Preview the allocation again before applying it.");
      return applyExamShiftAllocation(sharedShiftId, {
        requestId: allocationPlan.requestId,
        students: draft.studentIds.map((studentId) => ({ studentId, extraTimeMinutes: 0, accommodationNotes: null })),
        lecturerIds: draft.lecturerIds,
        invigilatorsPerRoom,
        expectedPlanHash: allocationPlan.planHash,
      }, allocationPlan.eTag ?? sharedShift.data?.eTag);
    },
    onSuccess: () => {
      navigate(`/examiner/schedule/shared/${sharedShiftId}`);
      void queryClient.invalidateQueries({ queryKey: ["examiner", "shared-room"] });
      void queryClient.invalidateQueries({ queryKey: ["examiner", "shift-package", sharedShiftId] });
      // Show the confirmation after navigation so it is not removed with this page.
      window.setTimeout(() => toast({ title: "Students and invigilators added", description: "Room and seat assignments were saved successfully. Review the rooms, then publish the shift." }), 0);
    },
    onError: (error) => toast({ title: "Some rooms could not be filled", description: error instanceof Error ? error.message : "Try again from the shift page.", variant: "error" }),
  });
  const applyBlockReason = sharedLoading
    ? "Wait until the shift and room information finishes loading."
    : !sharedPackage.data
      ? "Attach an exam package before assigning people."
      : draft.studentIds.length === 0
        ? "Select at least one student."
        : draft.lecturerIds.length === 0
          ? "Select at least one invigilator."
          : !allocationPlan
            ? "Check the room and seat placement first. Even one student needs a confirmed seat before the allocation can be applied."
            : !allocationPlan.isValid || !allocationPlan.planHash
              ? "Resolve the allocation problems shown above, then preview the allocation again."
              : null;
  const toggle = (key: "studentIds" | "lecturerIds", id: string) => {
    setAllocationPlan(null);
    setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  };
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
      setListError("");
      assertExcelImportFile(file);
      const report = await validateStudentImport(authoritativeExamSubjectId, file);
      report.errors = [...new Map([...report.errors, ...report.rows.flatMap((row) => row.errors)].map((issue) => [JSON.stringify(issue), issue])).values()];
      setKnownNames(rememberStudentNames(report.rows));
      const matched = report.rows.flatMap((row) => row.isValid && row.studentId ? [row.studentId] : []);
      setImportReport(report);
      setDraft((current) => ({ ...current, studentIds: [...new Set([...current.studentIds, ...matched])] }));
     
      toast({ title: `${report.validRows} students validated`, description: report.invalidRows ? `${report.invalidRows} row(s) need correction before they can be added.` : "The list is ready for allocation." });
    } catch (error) {
      setListError(describeImportFailure(error));
      toast({ title: "This student file cannot be imported", description: describeImportFailure(error), variant: "error" });
    } finally {
      if (studentFileRef.current) studentFileRef.current.value = "";
    }
  };
  const downloadTemplate = async () => {
    try {
      saveImportTemplate(await downloadStudentImportTemplate(authoritativeExamSubjectId), "exam-student-import.xlsx");
    } catch (error) {
      setListError(`Template could not be downloaded. ${describeError(error)}`);
    }
  };
  const downloadInvigilatorTemplate = async () => {
    try {
      saveImportTemplate(await downloadInvigilatorImportTemplate(sharedShiftId), "exam-invigilator-import.xlsx");
    } catch (error) {
      setListError(`Template could not be downloaded. ${describeError(error)}`);
    }
  };
  const importInvigilators = async (file?: File) => {
    if (!file) return;
    try {
      setListError("");
      assertExcelImportFile(file);
      const report = await validateInvigilatorImport(sharedShiftId, file);
      if (!report.canContinue || report.invalidRows > 0) {
        setListError(importReportMessages(report).join("\n") || "Correct the invalid lecturer rows using the downloaded template.");
        return;
      }
      const lecturerIds = report.rows.flatMap((row) => row.isValid && row.lecturerId ? [row.lecturerId] : []);
      setAllocationPlan(null);
      setDraft((current) => ({ ...current, lecturerIds: [...new Set([...current.lecturerIds, ...lecturerIds])] }));
      toast({
        title: `${report.validRows} invigilators validated`,
        description: report.invalidRows ? `${report.invalidRows} row(s) need correction.` : "The invigilators were added to this allocation.",
      });
    } catch (error) {
      setListError(describeImportFailure(error));
      toast({ title: "The invigilator list could not be checked", description: describeError(error), variant: "error" });
    } finally {
      if (invigilatorFileRef.current) invigilatorFileRef.current.value = "";
    }
  };
  if (!sharedShiftId) return <ApiNotice tone="error">Create the exam shift first, then add the people. <Link className="font-semibold underline" to="/examiner/schedule/new/details">Go to shift setup</Link>.</ApiNotice>;
  return <main className="space-y-6">
    <p className="rounded-xl border-2 border-border p-4 text-sm text-muted-foreground">Download the matching .xlsx template beside each import button. Keep its sheet name and columns unchanged. Student and lecturer codes must belong to active accounts at your university.</p>
    {listError ? <div role="alert" className="max-h-64 overflow-auto whitespace-pre-line rounded-xl border-2 border-destructive p-4 text-sm text-destructive">{listError}</div> : null}
    <PreparationHeader title="Add students and lecturers" description="Select one shared pool. The students and invigilators are spread over the rooms of the shift, and each room gets its seats." />
    <PreparationSteps steps={steps} current={1} />
    <section className="examiner-panel flex flex-wrap items-end justify-between gap-4 p-5"><div><p className="text-sm font-semibold text-muted-foreground">Allocation</p><h2 className="mt-1 text-xl font-semibold">{sharedRooms.length || draft.examRoomIds.length} rooms · {draft.studentIds.length} students · {draft.lecturerIds.length} lecturers</h2></div><label className="w-52 text-sm font-semibold">Invigilators per room<Input className="mt-2" type="number" min={1} max={10} value={invigilatorsPerRoom} onChange={(event) => { setAllocationPlan(null); setInvigilatorsPerRoom(Math.max(1, Number(event.target.value) || 1)); }} /></label></section>
    <div className="grid gap-6 xl:grid-cols-2">
  <section className="examiner-major overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div className="flex items-center gap-3"><Users className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Students</h2><p className="text-sm text-muted-foreground">{draft.studentIds.length} selected for automatic room and seat allocation</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!selectableStudentIds.length} onClick={() => { toggleAllStudents(); }}>{allStudentsSelected ? "Clear all" : studentSearch.trim() ? "Select shown" : "Select all"}</Button><Button type="button" variant="outline" disabled={!canImportStudents} onClick={() => void downloadTemplate()}>Download template</Button><input ref={studentFileRef} className="sr-only" type="file" accept=".xlsx" aria-label="Import student list" disabled={!canImportStudents} onChange={(event) => void importStudents(event.target.files?.[0])} /><Button type="button" variant="outline" disabled={!canImportStudents} onClick={() => studentFileRef.current?.click()}><Upload />Validate student list</Button></div></header>{sharedPackage.data ? <div className="border-b border-success-border bg-success p-4 text-sm text-success-foreground"><strong>{selectedPackage?.name?.trim() || sharedShift.data?.name?.trim() || "Sealed exam package"}</strong><p className="mt-1">The handed-over package is attached. Student import uses its exam identifier.</p></div> : null}{namedStudents.length ? <div className="space-y-2 border-b border-border p-4"><Input type="search" aria-label="Search students" placeholder="Search by name or student code" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} /><p role="status" className="text-xs text-muted-foreground">{studentRows.length} of {namedStudents.length} students shown</p></div> : null}{importReport ? <div className="border-b border-border bg-secondary p-4 text-sm"><div className="flex items-center justify-between gap-3"><strong>{importReport.validRows} valid · {importReport.invalidRows} invalid</strong><Button type="button" variant="ghost" onClick={() => setImportReport(null)}>Dismiss</Button></div>{importReport.errors.length ? <ul className="mt-3 space-y-2">{importReport.errors.slice(0, 5).map((issue, index) => { const row = issue.rowNumber ? importReport.rows.find((item) => item.rowNumber === issue.rowNumber) : undefined; const friendly = describeImportIssue(issue, row?.studentCode); return <li key={`${issue.code}-${index}`} className="rounded-lg border border-destructive/40 bg-background p-3"><p className="font-semibold text-destructive">{friendly.where}: {friendly.text}</p><p className="mt-1 text-muted-foreground">{friendly.fix}</p></li>; })}{importReport.errors.length > 5 ? <li className="text-muted-foreground">And {importReport.errors.length - 5} more problems. Fix these first, then choose the file again.</li> : null}</ul> : null}</div> : null}<div className="max-h-[520px] divide-y divide-border overflow-auto">{students.isPending || studentUsers.isPending ? <div role="status" aria-label="Loading students" className="animate-pulse space-y-2 p-5"><div className="h-14 rounded-lg bg-muted" /><div className="h-14 rounded-lg bg-muted" /><div className="h-14 rounded-lg bg-muted" /></div> : null}{!students.isPending && !studentUsers.isPending && namedStudents.length === 0 ? <div className="space-y-3 p-8 text-center"><p className="font-semibold">No student names to show yet</p><p className="text-sm text-muted-foreground">Choose Validate student list and pick a student file. The students in the file are listed here and selected for this exam.</p></div> : null}{namedStudents.length > 0 && studentRows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No student matches this search.</p> : null}{studentRows.map(({ profile: student, label }) => <label key={student.userId} className={`flex min-h-20 items-center gap-3 px-5 py-2 ${canSit(student.enrollmentStatus) ? "cursor-pointer hover:bg-accent" : "cursor-not-allowed bg-muted/40"}`}><Checkbox disabled={!canSit(student.enrollmentStatus)} checked={draft.studentIds.includes(student.userId)} onCheckedChange={() => { toggle("studentIds", student.userId); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarImage className="rounded-md" src={student.avatarUrl ?? undefined} alt="" /><AvatarFallback className="rounded-md">{initials(label.name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{label.name}</strong><span className="block text-sm text-muted-foreground">{label.code} · {student.enrollmentStatus ?? "Status unavailable"}</span>{canSit(student.enrollmentStatus) ? null : <span className="block text-xs font-semibold text-destructive">Not studying, so cannot sit this exam</span>}</span></label>)}</div></section>
      <section className="examiner-panel overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Eligible invigilators</h2><p className="text-sm text-muted-foreground">{draft.lecturerIds.length} selected for this shift</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void downloadInvigilatorTemplate()}>Download template</Button><input ref={invigilatorFileRef} className="sr-only" type="file" accept=".xlsx" aria-label="Import invigilator list" onChange={(event) => void importInvigilators(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => invigilatorFileRef.current?.click()}><Upload />Validate list</Button></div></header><div className="max-h-[520px] divide-y divide-border overflow-auto">{lecturers.map((lecturer) => <label key={lecturer.lecturerId} className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-2 hover:bg-accent"><Checkbox checked={draft.lecturerIds.includes(lecturer.lecturerId)} onCheckedChange={() => { toggle("lecturerIds", lecturer.lecturerId); }} /><Avatar className="h-18 w-14 rounded-md after:rounded-md"><AvatarFallback className="rounded-md">{initials(lecturer.name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate">{lecturer.name}</strong><span className="block text-sm text-muted-foreground">{lecturer.userCode}</span></span></label>)}{lecturerProfiles.isPending ? <p role="status" className="p-6 text-center text-muted-foreground">Loading eligible invigilators…</p> : null}{lecturerProfiles.isError ? <p role="alert" className="p-6 text-center text-destructive">The eligible invigilators could not be loaded. Try again.</p> : null}{lecturerProfiles.isSuccess && !lecturers.length ? <p className="p-6 text-center text-muted-foreground">No eligible invigilator is available for this shift.</p> : null}</div></section>
    </div>
        <section aria-label="Allocation plan" className="space-y-3 rounded-xl border border-border p-5">
          <h2 className="text-lg font-bold">How the people are spread over the rooms</h2>
          {sharedLoading ? <div role="status" aria-label="Loading the rooms" className="h-16 animate-pulse rounded-lg bg-muted" /> : null}
          {!sharedLoading && !sharedPackage.data ? <p role="alert" className="text-sm font-semibold text-destructive">Attach a package to the shift first, then come back to add people.</p> : null}
          {allocationPlan ? (
            <div className={`rounded-lg border p-4 text-sm ${allocationPlan.isValid ? "border-success-border bg-success text-success-foreground" : "border-destructive bg-destructive/10 text-destructive"}`}>
              <p className="font-bold">{allocationPlan.isValid ? "Room and seat placement is valid" : "Some people could not be placed"}</p>
              <p>{allocationPlan.rooms.length} rooms planned · revision {allocationPlan.revision}</p>
              {allocationPlan.issues.length ? <ul className="mt-2 list-disc pl-5">{allocationPlan.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message ?? issue.code ?? "Allocation issue"}</li>)}</ul> : null}
            </div>
          ) : !sharedLoading ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sharedPlan.rooms.map((room) => <li key={room.scheduleId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span className="font-semibold">{room.roomLabel}</span><span className="text-muted-foreground">{room.studentIds.length} students · {room.invigilators.length} invigilators</span></li>)}
            </ul>
          ) : null}
          {!sharedLoading && sharedPlan.problems.length ? <ul role="status" className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{sharedPlan.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
        </section>
        <div className="space-y-3 border-t border-border pt-5">{applyBlockReason ? <ApiNotice>{applyBlockReason}</ApiNotice> : <ApiNotice>The allocation has been checked and is ready to apply.</ApiNotice>}<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" asChild><Link to={`/examiner/schedule/shared/${sharedShiftId}`}><ArrowLeft />Back to the shift</Link></Button><Button variant="outline" disabled={sharedLoading || !sharedPackage.data || !draft.studentIds.length || !draft.lecturerIds.length || previewAllocation.isPending} onClick={() => previewAllocation.mutate()}>{previewAllocation.isPending ? "Checking…" : "Check room and seats"}</Button><Button disabled={addPeople.isPending} onClick={() => { if (applyBlockReason) { toast({ title: "Allocation is not ready", description: applyBlockReason, variant: "error" }); return; } addPeople.mutate(); }}>{addPeople.isPending ? "Applying allocation…" : "Apply allocation"}<ArrowRight /></Button></div></div>
  </main>;
}

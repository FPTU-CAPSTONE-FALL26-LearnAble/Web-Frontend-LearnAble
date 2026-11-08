/* eslint-disable jsx-a11y/label-has-associated-control -- Radix checkbox labels provide the accessible control name. */
import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, FileText } from "lucide-react";
import { useNavigate } from "react-router";
import { getSemesters, getSubjects } from "@/api/catalog";
import { createExamPaper, createExamSubject, getExamTypes } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useExamPreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, Field, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
import { ApiFailure } from "@/api/client";

const steps = ["Exam configuration", "Build paper", "Preview & publish", "Schedule exam"];

function creationErrorMessage(error: unknown) {
  if (!(error instanceof ApiFailure)) return "The exam could not be created. Please try again.";
  if (error.detail.kind === "network") return "The server could not be reached. Check your connection and try again.";
  if (error.detail.kind === "unauthorized") return "Your session has expired. Sign in again before creating the exam.";
  if (error.detail.kind === "not_found") return "Backend returned 404: one of the selected academic records no longer exists.";
  if (error.detail.kind === "parse") return "The Backend response could not be read. Please report this response-format issue.";
  const details = [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ");
  return `Backend returned ${error.detail.status}${details ? `: ${details}` : "."}`;
}

export function ExamSetupRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useExamPreparationDraft();
  const subjects = useQuery({ queryKey: ["catalog", "subjects"], queryFn: () => getSubjects() });
  const semesters = useQuery({ queryKey: ["catalog", "semesters"], queryFn: () => getSemesters() });
  const examTypes = useQuery({ queryKey: ["exam-types"], queryFn: getExamTypes });
  const lastAutomaticPaper = useRef({ code: "", name: "" });
  const selectedSubject = subjects.data?.items.find((item) => item.subjectId === draft.subjectId);
  const selectedSemester = semesters.data?.items.find((item) => item.semesterId === draft.semesterId);
  const selectedExamType = examTypes.data?.find((item) => item.examTypeId === draft.examTypeId);
  useEffect(() => {
    if (!selectedSubject || !selectedSemester || !selectedExamType) return;
    const code = `${selectedSubject.subjectCode}-${selectedExamType.code ?? "EXAM"}-${selectedSemester.semesterCode}-01`.toUpperCase();
    const name = `${selectedSubject.subjectCode} ${selectedExamType.name ?? "Exam"} ${selectedSemester.semesterCode} Paper 1`;
    setDraft((current) => {
      const nextCode = !current.paperCode.trim() || current.paperCode === lastAutomaticPaper.current.code ? code : current.paperCode;
      const nextName = !current.paperName.trim() || current.paperName === lastAutomaticPaper.current.name ? name : current.paperName;
      lastAutomaticPaper.current = { code, name };
      return nextCode === current.paperCode && nextName === current.paperName
        ? current
        : { ...current, paperCode: nextCode, paperName: nextName };
    });
  }, [selectedSubject, selectedSemester, selectedExamType, setDraft]);
  useExpiredSession(subjects.error || semesters.error || examTypes.error);
  const create = useMutation({
    mutationFn: async () => {
      let examSubjectId = draft.examSubjectId;
      if (!examSubjectId) {
        const examSubject = await createExamSubject({ subjectId: draft.subjectId, semesterId: draft.semesterId, examTypeId: draft.examTypeId, name: draft.name.trim(), instructions: draft.instructions.trim(), durationMinutes: draft.durationMinutes, passScore: draft.passScore, shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, scoringPolicy: draft.scoringPolicy, cameraRequired: draft.cameraRequired, cameraUnavailablePolicy: draft.cameraUnavailablePolicy });
        examSubjectId = examSubject.examSubjectId;
        setDraft((current) => ({ ...current, examSubjectId }));
      }
      const paper = await createExamPaper(examSubjectId, { paperCode: draft.paperCode.trim(), name: draft.paperName.trim() });
      return { examSubjectId, paper };
    },
    onSuccess: ({ examSubjectId, paper }) => {
      setDraft((current) => ({ ...current, examSubjectId, examPaperId: paper.examPaperId, paperETag: paper.eTag ?? "" }));
      toast({ title: "Draft exam created", description: "Continue by selecting questions for the new paper." });
      navigate("/examiner/exams/new/questions");
    },
  });
  const missingFields = [
    !draft.subjectId && "Subject",
    !draft.semesterId && "Semester",
    !draft.examTypeId && "Exam type",
    !draft.name.trim() && "Exam name",
    !draft.paperCode.trim() && "Paper code",
    !draft.paperName.trim() && "Paper name",
    (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes <= 0) && "Valid duration",
    (!Number.isFinite(draft.passScore) || draft.passScore < 0) && "Valid pass score",
  ].filter((item): item is string => Boolean(item));
  const ready = missingFields.length === 0;
  const pending = subjects.isPending || semesters.isPending || examTypes.isPending;
  const error = subjects.error || semesters.error || examTypes.error;
  const updateConfiguration = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch, examSubjectId: "", examPaperId: "", paperETag: "", selectedQuestions: [] }));
  return <main className="space-y-6">
    <PreparationHeader title="Create exam and paper" description="Set the exam rules and create its draft paper. You can select questions after this step is complete." />
    <PreparationSteps steps={steps} current={0} />
    {error ? <ApiNotice tone="error">We couldn’t create this exam. Check the required subject, semester, and exam type, then try again.</ApiNotice> : null}
    <form className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]" onSubmit={(event) => { event.preventDefault(); if (ready) create.mutate(); }}>
      <section className="examiner-major p-6">
        <div className="flex items-center gap-3"><BookOpenCheck className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Exam configuration</h2><p className="text-sm text-muted-foreground">Subject, semester, type and assessment policy.</p></div></div>
        {pending ? <p role="status" className="mt-5">Loading academic catalogs…</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Subject"><Select value={draft.subjectId} onValueChange={(subjectId) => updateConfiguration({ subjectId })}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.data?.items.map((item) => <SelectItem key={item.subjectId} value={item.subjectId}>{item.subjectCode} · {item.subjectNameEn ?? "Unnamed subject"}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Semester"><Select value={draft.semesterId} onValueChange={(semesterId) => updateConfiguration({ semesterId })}><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent>{semesters.data?.items.map((item) => <SelectItem key={item.semesterId} value={item.semesterId}>{item.semesterName} · {item.academicYear}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Exam type"><Select value={draft.examTypeId} onValueChange={(examTypeId) => updateConfiguration({ examTypeId })}><SelectTrigger><SelectValue placeholder="Select exam type" /></SelectTrigger><SelectContent>{examTypes.data?.map((item) => <SelectItem key={item.examTypeId} value={item.examTypeId}>{item.name ?? item.code ?? "Exam type"}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Exam name"><Input value={draft.name} onChange={(event) => updateConfiguration({ name: event.target.value })} placeholder="SWE201 Final Examination" /></Field>
          <Field label="Duration (minutes)"><Input type="number" min={1} value={draft.durationMinutes} onChange={(event) => updateConfiguration({ durationMinutes: Number(event.target.value) })} /></Field>
          <Field label="Pass score"><Input type="number" min={0} step="0.25" value={draft.passScore} onChange={(event) => updateConfiguration({ passScore: Number(event.target.value) })} /></Field>
          <div className="sm:col-span-2"><Field label="Student instructions"><Textarea value={draft.instructions} onChange={(event) => updateConfiguration({ instructions: event.target.value })} placeholder="Instructions shown before the exam begins" /></Field></div>
          <fieldset className="sm:col-span-2 grid gap-4 rounded-xl border border-border bg-muted/40 p-4">
            <legend className="px-1 font-semibold">Assessment policy</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3"><Checkbox checked={draft.shuffleQuestions} onCheckedChange={(checked) => updateConfiguration({ shuffleQuestions: checked === true })} /> Shuffle questions</label>
              <label className="flex min-h-11 items-center gap-3"><Checkbox checked={draft.shuffleOptions} onCheckedChange={(checked) => updateConfiguration({ shuffleOptions: checked === true })} /> Shuffle answer options</label>
            </div>
            <Field label="Scoring policy" hint="The current Backend supports All-or-Nothing scoring."><Select value={draft.scoringPolicy} onValueChange={(scoringPolicy: "AllOrNothing") => updateConfiguration({ scoringPolicy })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AllOrNothing">All-or-Nothing</SelectItem></SelectContent></Select></Field>
            <label className="flex min-h-11 items-center gap-3"><Checkbox checked={draft.cameraRequired} onCheckedChange={(checked) => updateConfiguration({ cameraRequired: checked === true })} /> Require a camera for this exam</label>
            <Field label="If a camera is unavailable"><Select value={draft.cameraUnavailablePolicy} onValueChange={(cameraUnavailablePolicy: "Block" | "AllowWithFlag" | "Allow") => updateConfiguration({ cameraUnavailablePolicy })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Block">Block exam entry</SelectItem><SelectItem value="AllowWithFlag">Allow and flag for review</SelectItem><SelectItem value="Allow">Allow without a flag</SelectItem></SelectContent></Select></Field>
          </fieldset>
        </div>}
      </section>
      <aside className="examiner-panel p-6">
        <div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><h2 className="text-xl font-semibold">Draft paper</h2><p className="text-sm text-muted-foreground">The container for selected questions.</p></div></div>
        <div className="mt-6 space-y-5"><Field label="Paper code"><Input value={draft.paperCode} onChange={(event) => setDraft((value) => ({ ...value, paperCode: event.target.value }))} placeholder="SWE201-FE-FA26-01" /></Field><Field label="Paper name"><Input value={draft.paperName} onChange={(event) => setDraft((value) => ({ ...value, paperName: event.target.value }))} placeholder="SWE201 final paper A" /></Field></div>
        <div className="mt-8 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">Paper code and name are suggested from the exam configuration. You can edit either value before creating the draft.</p>
          {draft.examSubjectId && !draft.examPaperId ? <ApiNotice><strong>Exam configuration saved.</strong> The next attempt will create only the Draft Paper.</ApiNotice> : null}
          <Button className="mt-4 w-full" type="submit" disabled={!ready || pending || create.isPending}>{create.isPending ? (draft.examSubjectId ? "Creating paper…" : "Creating exam…") : draft.examSubjectId ? "Retry draft paper" : "Create draft and select questions"}<ArrowRight /></Button>
          {!ready ? <div role="status" className="mt-3 rounded-xl border border-warning bg-warning p-3 text-sm text-warning-foreground"><p className="font-semibold">Complete these fields to continue:</p><ul className="mt-1 list-disc pl-5">{missingFields.map((field) => <li key={field}>{field}</li>)}</ul></div> : null}
          {create.error ? <div role="alert" className="mt-3 rounded-xl border border-destructive p-3 text-sm text-destructive"><p className="font-semibold">Draft creation failed</p><p className="mt-1">{creationErrorMessage(create.error)}</p></div> : null}
        </div>
      </aside>
    </form>
  </main>;
}

/* eslint-disable jsx-a11y/label-has-associated-control -- Radix checkbox labels provide the accessible control name. */
import { useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Camera, FileText, Shuffle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getSemesters, getSubjects } from "@/api/catalog";
import { createExamPaper, createExamSubject, getExamTypes, updateExamPaper, updateExamSubject } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { buildExamTypeOptions, formatExamTypeCode, formatExamTypeName } from "@/lib/examTypeLabel";
import { PREPARATION_STEPS as steps, usePreparationPaths } from "@/features/examiner/workflow/preparationPaths";
import { useExamPreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { summarisePlan } from "@/features/examiner/workflow/examPlan";
import { operation } from "@/features/examiner/workflow/operationProgress";
import { ApiNotice, Field, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
import { ApiFailure } from "@/api/client";


function creationErrorMessage(error: unknown) {
  if (!(error instanceof ApiFailure)) return "The exam could not be created. Please try again.";
  if (error.detail.kind === "network") return "The server could not be reached. Check your connection and try again.";
  if (error.detail.kind === "unauthorized") return "Your session has expired. Sign in again before creating the exam.";
  if (error.detail.kind === "not_found") return "Backend returned 404: one of the selected academic records no longer exists.";
  if (error.detail.kind === "parse") return "The Backend response could not be read. Please report this response-format issue.";
  const details = [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ");
  return `Backend returned ${error.detail.status}${details ? `: ${details}` : "."}`;
}

const blankIfZero = (value: number) => (value > 0 ? String(value) : "");

/** A numeric field that drops leading zeros once the person leaves it, so "090" reads as 90. */
function numberText(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function SectionTitle({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{step}</span>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** A switch laid out as a card, so the whole card is the click target and the effect is spelled out. */
function PolicyToggle({ icon, title, description, checked, onChange }: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/50"}`}>
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">{icon}{title}</span>
        <span className="mt-1 block text-sm font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function ExamSetupRoute() {
  const navigate = useNavigate();
  const paths = usePreparationPaths();
  const { draft, setDraft, reset } = useExamPreparationDraft();
  const [params] = useSearchParams();
  const subjects = useQuery({ queryKey: ["catalog", "subjects"], queryFn: () => getSubjects() });
  const semesters = useQuery({ queryKey: ["catalog", "semesters"], queryFn: () => getSemesters() });
  const examTypes = useQuery({ queryKey: ["exam-types"], queryFn: getExamTypes });
  const lastAutomaticPaper = useRef({ code: "", name: "" });
  const selectedSubject = subjects.data?.items.find((item) => item.subjectId === draft.subjectId);
  const selectedSemester = semesters.data?.items.find((item) => item.semesterId === draft.semesterId);
  const selectedExamType = examTypes.data?.find((item) => item.examTypeId === draft.examTypeId);
  // Editing is asked for by the address (?edit=1). Opening this step any other way starts a new exam,
  // so a draft left over from an earlier edit never locks the subject, semester and exam type.
  const wantsEdit = params.get("edit") === "1";
  const editing = draft.editingPaper && wantsEdit;
  useEffect(() => {
    if (draft.editingPaper && !wantsEdit) reset();
  }, [draft.editingPaper, wantsEdit, reset]);
  useEffect(() => {
    // An existing paper keeps its own code and name; only a new paper gets suggestions.
    if (editing || !selectedSubject || !selectedSemester || !selectedExamType) return;
    // The Backend marks non-production records, such as "Final (development)" with code DEV_FINAL.
    // A paper code and name are read by people, so they use the cleaned-up wording.
    const code = `${selectedSubject.subjectCode}-${formatExamTypeCode(selectedExamType)}-${selectedSemester.semesterCode}-01`.toUpperCase();
    const name = `${selectedSubject.subjectCode} ${formatExamTypeName(selectedExamType)} ${selectedSemester.semesterCode} Paper 1`;
    // Drafts saved by earlier versions hold the raw wording; replace those too, but never a value the person typed.
    const oldCode = `${selectedSubject.subjectCode}-${selectedExamType.code ?? "EXAM"}-${selectedSemester.semesterCode}-01`.toUpperCase();
    const oldName = `${selectedSubject.subjectCode} ${selectedExamType.name ?? "Exam"} ${selectedSemester.semesterCode} Paper 1`;
    setDraft((current) => {
      const codeIsAutomatic = !current.paperCode.trim() || current.paperCode === lastAutomaticPaper.current.code || current.paperCode === oldCode;
      const nameIsAutomatic = !current.paperName.trim() || current.paperName === lastAutomaticPaper.current.name || current.paperName === oldName;
      const nextCode = codeIsAutomatic ? code : current.paperCode;
      const nextName = nameIsAutomatic ? name : current.paperName;
      lastAutomaticPaper.current = { code, name };
      return nextCode === current.paperCode && nextName === current.paperName
        ? current
        : { ...current, paperCode: nextCode, paperName: nextName };
    });
  }, [editing, selectedSubject, selectedSemester, selectedExamType, setDraft]);
  useExpiredSession(subjects.error || semesters.error || examTypes.error);
  const create = useMutation({
    mutationFn: async () => {
      if (editing) {
        operation.start("Saving the draft exam", ["Updating the exam configuration", "Updating the paper details"]);
        // Change an existing Draft: the exam rules first, then the paper code and name.
        const subject = await updateExamSubject(draft.examSubjectId, { subjectId: draft.subjectId, semesterId: draft.semesterId, examTypeId: draft.examTypeId, name: draft.name.trim(), instructions: draft.instructions.trim(), durationMinutes: draft.durationMinutes, passScore: draft.passScore, shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, scoringPolicy: draft.scoringPolicy, cameraRequired: draft.cameraRequired, cameraUnavailablePolicy: draft.cameraUnavailablePolicy }, draft.examSubjectETag);
        setDraft((current) => ({ ...current, examSubjectETag: subject.eTag ?? current.examSubjectETag }));
        operation.step(1);
        const paper = await updateExamPaper(draft.examPaperId, { paperCode: draft.paperCode.trim(), name: draft.paperName.trim() }, draft.paperETag);
        return { examSubjectId: draft.examSubjectId, paper };
      }
      let examSubjectId = draft.examSubjectId;
      operation.start("Creating the draft exam", examSubjectId ? ["Creating the draft paper"] : ["Saving the exam configuration", "Creating the draft paper"]);
      if (!examSubjectId) {
        const examSubject = await createExamSubject({ subjectId: draft.subjectId, semesterId: draft.semesterId, examTypeId: draft.examTypeId, name: draft.name.trim(), instructions: draft.instructions.trim(), durationMinutes: draft.durationMinutes, passScore: draft.passScore, shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, scoringPolicy: draft.scoringPolicy, cameraRequired: draft.cameraRequired, cameraUnavailablePolicy: draft.cameraUnavailablePolicy });
        examSubjectId = examSubject.examSubjectId;
        setDraft((current) => ({ ...current, examSubjectId }));
      }
      if (!draft.examSubjectId) operation.step(1);
      const paper = await createExamPaper(examSubjectId, { paperCode: draft.paperCode.trim(), name: draft.paperName.trim() });
      return { examSubjectId, paper };
    },
    onError: (error) => operation.fail(creationErrorMessage(error)),
    onSuccess: ({ examSubjectId, paper }) => {
      operation.finish(editing ? "The draft exam was updated." : "The draft exam and its paper were created.");
      setDraft((current) => ({ ...current, examSubjectId, examPaperId: paper.examPaperId, paperETag: paper.eTag ?? "" }));
      toast(editing
        ? { title: "Draft exam updated", description: "Continue to review or change the questions of this paper." }
        : { title: "Draft exam created", description: "Continue by selecting questions for the new paper." });
      navigate(paths.questions);
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
  // Changing a new exam starts the draft over; an existing Draft keeps its records and its questions.
  const updateConfiguration = (patch: Partial<typeof draft>) => setDraft((current) => editing
    ? { ...current, ...patch }
    : { ...current, ...patch, examSubjectId: "", examPaperId: "", paperETag: "", selectedQuestions: [] });
  const plan = summarisePlan(draft);
  const summary: Array<[string, string]> = [
    ["Subject", selectedSubject ? `${selectedSubject.subjectCode} · ${selectedSubject.subjectNameEn ?? "Unnamed subject"}` : "Not chosen"],
    ["Semester", selectedSemester ? `${selectedSemester.semesterName} · ${selectedSemester.academicYear}` : "Not chosen"],
    ["Exam type", selectedExamType ? formatExamTypeName(selectedExamType) : "Not chosen"],
    ["Duration", Number.isFinite(draft.durationMinutes) && draft.durationMinutes > 0 ? `${draft.durationMinutes} minutes` : "Not set"],
    ["Pass score", Number.isFinite(draft.passScore) ? String(draft.passScore) : "Not set"],
    ["Questions", draft.plannedQuestionCount > 0 ? `${draft.plannedQuestionCount}${draft.pointsPerQuestion > 0 ? ` × ${draft.pointsPerQuestion} points` : ""}` : "Not planned"],
    ["Total score", plan.complete ? `${plan.totalScore} points` : "Not planned"],
  ];
  return <main className="space-y-6">
    <PreparationHeader title={editing ? "Edit draft exam and paper" : "Create exam and paper"} description={editing ? "Change the exam rules and the paper details. The subject, semester and exam type cannot change; create a new exam for that." : "Set the exam rules and create its draft paper. You can select questions after this step is complete."} />
    <PreparationSteps steps={steps} current={0} />
    {error ? <ApiNotice tone="error">We couldn’t create this exam. Check the required subject, semester, and exam type, then try again.</ApiNotice> : null}
    <form className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,.8fr)]" onSubmit={(event) => { event.preventDefault(); if (ready) create.mutate(); }}>
      <section className="examiner-major space-y-8 p-6">
        <div className="flex items-center gap-3"><BookOpenCheck className="size-5 text-primary" aria-hidden /><div><h2 className="text-xl font-semibold">Exam configuration</h2><p className="text-sm text-muted-foreground">Subject, semester, type and assessment policy.</p></div></div>
        {pending ? <div role="status" aria-label="Loading academic catalogs" className="animate-pulse space-y-4"><div className="h-12 rounded-lg bg-muted" /><div className="h-12 rounded-lg bg-muted" /><div className="h-32 rounded-lg bg-muted" /></div> : <>
          <div className="space-y-4">
            <SectionTitle step={1} title="What is being examined" hint="The subject, the semester and the kind of exam." />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Subject"><Select disabled={editing} value={draft.subjectId} onValueChange={(subjectId) => updateConfiguration({ subjectId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.data?.items.map((item) => <SelectItem key={item.subjectId} value={item.subjectId}>{item.subjectCode} · {item.subjectNameEn ?? "Unnamed subject"}</SelectItem>)}</SelectContent></Select></Field></div>
              <Field label="Semester"><Select disabled={editing} value={draft.semesterId} onValueChange={(semesterId) => updateConfiguration({ semesterId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent>{semesters.data?.items.map((item) => <SelectItem key={item.semesterId} value={item.semesterId}>{item.semesterName} · {item.academicYear}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Exam type"><Select disabled={editing} value={draft.examTypeId} onValueChange={(examTypeId) => updateConfiguration({ examTypeId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select exam type" /></SelectTrigger><SelectContent>{buildExamTypeOptions(examTypes.data ?? []).map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
            </div>
          </div>
          <div className="space-y-4 border-t border-border pt-6">
            <SectionTitle step={2} title="Exam details" hint="What students see, and how long and how well they must do." />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Exam name"><Input value={draft.name} onChange={(event) => updateConfiguration({ name: event.target.value })} placeholder="SWE201 Final Examination" /></Field></div>
              <Field label="Duration (minutes)"><Input type="number" inputMode="numeric" min={1} value={numberText(draft.durationMinutes)} onChange={(event) => updateConfiguration({ durationMinutes: Number(event.target.value) })} onBlur={(event) => { event.target.value = numberText(draft.durationMinutes); }} /></Field>
              <Field label="Pass score"><Input type="number" inputMode="decimal" min={0} step="any" value={numberText(draft.passScore)} onChange={(event) => updateConfiguration({ passScore: Number(event.target.value) })} onBlur={(event) => { event.target.value = numberText(draft.passScore); }} /></Field>
              <Field label="Number of questions"><Input type="number" inputMode="numeric" min={1} step={1} value={blankIfZero(draft.plannedQuestionCount)} placeholder="For example 40" onChange={(event) => setDraft((current) => ({ ...current, plannedQuestionCount: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} /></Field>
              <Field label="Points per question"><Input type="number" inputMode="decimal" min={0} step="any" value={blankIfZero(draft.pointsPerQuestion)} placeholder="For example 0.25" onChange={(event) => setDraft((current) => ({ ...current, pointsPerQuestion: Math.max(0, Number(event.target.value) || 0) }))} /></Field>
              <div className="sm:col-span-2" role="status" aria-live="polite">
                {plan.complete ? <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm">{draft.plannedQuestionCount} questions × {draft.pointsPerQuestion} points = <strong>{plan.totalScore} points in total</strong>{plan.passPercent !== null ? `. A pass score of ${draft.passScore} is ${plan.passPercent}% of the total.` : "."}</p> : <p className="text-sm text-muted-foreground">Fill in both to see the total score of the exam. This is a plan for the next step; the Backend adds up the real score from the questions you choose.</p>}
                {plan.warnings.map((warning) => <p key={warning} className="mt-2 rounded-xl border border-warning bg-warning p-3 text-sm text-warning-foreground">{warning}</p>)}
              </div>
              <div className="sm:col-span-2"><Field label="Student instructions" hint="Shown to students before the exam begins."><Textarea value={draft.instructions} onChange={(event) => updateConfiguration({ instructions: event.target.value })} placeholder="For example: no materials are allowed. Read each question carefully." /></Field></div>
            </div>
          </div>
          <fieldset className="space-y-4 border-t border-border pt-6">
            <legend className="sr-only">Assessment policy</legend>
            <SectionTitle step={3} title="Assessment policy" hint="How questions appear, how they are scored, and the camera rule." />
            <div className="grid gap-3 sm:grid-cols-2">
              <PolicyToggle icon={<Shuffle className="size-4 text-primary" aria-hidden />} title="Shuffle questions" description="Each student sees the questions in a different order." checked={draft.shuffleQuestions} onChange={(shuffleQuestions) => updateConfiguration({ shuffleQuestions })} />
              <PolicyToggle icon={<Shuffle className="size-4 text-primary" aria-hidden />} title="Shuffle answer options" description="The answer choices are mixed for every student." checked={draft.shuffleOptions} onChange={(shuffleOptions) => updateConfiguration({ shuffleOptions })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Scoring policy" hint="The current Backend supports All-or-Nothing scoring."><Select value={draft.scoringPolicy} onValueChange={(scoringPolicy: "AllOrNothing") => updateConfiguration({ scoringPolicy })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AllOrNothing">All-or-Nothing</SelectItem></SelectContent></Select></Field>
            </div>
            <div className="space-y-3">
              <PolicyToggle icon={<Camera className="size-4 text-primary" aria-hidden />} title="Require a camera for this exam" description="Students are asked to turn on their camera before they start." checked={draft.cameraRequired} onChange={(cameraRequired) => updateConfiguration({ cameraRequired })} />
              {draft.cameraRequired ? <div className="sm:max-w-sm"><Field label="If a camera is unavailable"><Select value={draft.cameraUnavailablePolicy} onValueChange={(cameraUnavailablePolicy: "Block" | "AllowWithFlag" | "Allow") => updateConfiguration({ cameraUnavailablePolicy })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Block">Block exam entry</SelectItem><SelectItem value="AllowWithFlag">Allow and flag for review</SelectItem><SelectItem value="Allow">Allow without a flag</SelectItem></SelectContent></Select></Field></div> : <p className="text-sm text-muted-foreground">No camera rule applies to this exam.</p>}
            </div>
          </fieldset>
        </>}
      </section>
      <aside className="examiner-panel space-y-6 p-6 xl:sticky xl:top-6">
        <div className="flex items-center gap-3"><FileText className="size-5 text-primary" aria-hidden /><div><h2 className="text-xl font-semibold">Draft paper</h2><p className="text-sm text-muted-foreground">The container for selected questions.</p></div></div>
        <dl className="divide-y divide-border rounded-xl border border-border text-sm">
          {summary.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 text-right font-medium wrap-anywhere">{value}</dd></div>)}
        </dl>
        <div className="space-y-5"><Field label="Paper code"><Input value={draft.paperCode} onChange={(event) => setDraft((value) => ({ ...value, paperCode: event.target.value }))} placeholder="SWE201-FE-FA26-01" /></Field><Field label="Paper name"><Input value={draft.paperName} onChange={(event) => setDraft((value) => ({ ...value, paperName: event.target.value }))} placeholder="SWE201 final paper A" /></Field></div>
        <div className="border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">The paper code and name are suggested from the configuration. You can edit either before creating the draft.</p>
          {draft.examSubjectId && !draft.examPaperId && !editing ? <ApiNotice><strong>Exam configuration saved.</strong> The next attempt will create only the Draft Paper.</ApiNotice> : null}
          <Button className="mt-4 w-full" type="submit" disabled={!ready || pending || create.isPending}>{create.isPending ? (editing ? "Saving changes…" : draft.examSubjectId ? "Creating paper…" : "Creating exam…") : editing ? "Save changes and review questions" : draft.examSubjectId ? "Retry draft paper" : "Create draft and select questions"}<ArrowRight /></Button>
          {editing ? <Button className="mt-2 w-full" variant="outline" asChild><Link to={paths.bank}>Cancel and go back to the paper bank</Link></Button> : null}
          {!ready ? <div role="status" className="mt-3 rounded-xl border border-warning bg-warning p-3 text-sm text-warning-foreground"><p className="font-semibold">Complete these fields to continue:</p><ul className="mt-1 list-disc pl-5">{missingFields.map((field) => <li key={field}>{field}</li>)}</ul></div> : null}
          {create.error ? <div role="alert" className="mt-3 rounded-xl border border-destructive p-3 text-sm text-destructive"><p className="font-semibold">Draft creation failed</p><p className="mt-1">{creationErrorMessage(create.error)}</p></div> : null}
        </div>
      </aside>
    </form>
  </main>;
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Save } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { getLecturerAttemptGrading, getLecturerGradingAssignments, gradeEssayQuestion, updateMarkingCompletion, type ExamGradingDetail } from "@/api/grading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

function message(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server") return [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ") || fallback;
  return fallback;
}
type Question = ExamGradingDetail["questions"][number];
type ScoreDraft = { score: string; feedback: string };
const savedDraft = (question: Question): ScoreDraft => ({ score: question.score == null ? "" : String(question.score), feedback: question.feedback ?? "" });
const validScore = (draft: ScoreDraft, question: Question) => draft.score.trim() !== "" && Number.isFinite(Number(draft.score)) && Number(draft.score) >= 0 && Number(draft.score) <= question.maxScore;

function EssayEditor({ question, draft, onChange, onSave, busy }: { question: Question; draft: ScoreDraft; onChange: (draft: ScoreDraft) => void; onSave: () => void; busy: boolean }) {
  const { score, feedback } = draft;
  const setScore = (value: string) => onChange({ ...draft, score: value });
  const setFeedback = (value: string) => onChange({ ...draft, feedback: value });
  const valid = validScore(draft, question);
  return <Card className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Question {question.position}</CardTitle><Badge variant="outline">Maximum {question.maxScore} points</Badge></div></CardHeader><CardContent className="space-y-5"><div><p className="font-semibold">{question.content}</p><p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">{question.answerText || "No written answer was submitted."}</p></div>{question.referenceAnswer ? <div><h3 className="text-sm font-bold">Reference answer</h3><p className="mt-1 text-sm text-muted-foreground">{question.referenceAnswer}</p></div> : null}{question.gradingCriteria ? <div><h3 className="text-sm font-bold">Grading criteria</h3><p className="mt-1 text-sm text-muted-foreground">{question.gradingCriteria}</p></div> : null}<div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]"><label htmlFor={`score-${question.attemptQuestionId}`} className="space-y-2 text-sm font-semibold">Score<Input id={`score-${question.attemptQuestionId}`} type="number" min={0} max={question.maxScore} step="0.25" disabled={busy} value={score} onChange={(event) => setScore(event.target.value)} /></label><label htmlFor={`feedback-${question.attemptQuestionId}`} className="space-y-2 text-sm font-semibold">Feedback<Textarea id={`feedback-${question.attemptQuestionId}`} disabled={busy} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback visible in the grading record" /></label></div><Button disabled={!valid || busy} onClick={onSave}><Save aria-hidden />Save score</Button></CardContent></Card>;
}

export function LecturerGradingRoute() {
  const [selectedAttemptId, setAttemptId] = useState("");
  const [filter, setFilter] = useState("pending");
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [savedCount, setSavedCount] = useState(0);
  const assignments = useQuery({ queryKey: ["lecturer", "grading-assignments"], queryFn: getLecturerGradingAssignments });
  const items = assignments.data?.items ?? [];
  const pendingCount = items.filter((item) => !item.markingCompletedAt).length;
  const visible = items.filter((item) => filter === "all" || (filter === "completed" ? Boolean(item.markingCompletedAt) : !item.markingCompletedAt));
  const attemptId = items.some((item) => item.attemptId === selectedAttemptId) ? selectedAttemptId : (items.find((item) => !item.markingCompletedAt) ?? items[0])?.attemptId ?? "";
  const detail = useQuery({ queryKey: ["lecturer", "grading", attemptId], queryFn: () => getLecturerAttemptGrading(attemptId), enabled: Boolean(attemptId) });
  const client = useQueryClient();
  const completion = useMutation({
    mutationFn: (completed: boolean) => updateMarkingCompletion(attemptId, detail.data!.revision, completed, completed ? "All assigned Essay answers have been reviewed." : "Marking reopened for correction."),
    onSuccess: async (_, completed) => { toast({ title: completed ? "Marking confirmed" : "Marking reopened", description: completed ? "The Examiner can now continue the result-release checks." : "Update the affected scores, then confirm marking again." }); await Promise.all([client.invalidateQueries({ queryKey: ["lecturer", "grading", attemptId] }), client.invalidateQueries({ queryKey: ["lecturer", "grading-assignments"] })]); },
    onError: (error) => toast({ title: "Marking status could not be updated", description: message(error, "Check that every Essay score is valid, then try again.") }),
  });
  const essays = detail.data?.questions.filter((question) => question.questionType === "Essay") ?? [];
  const unscored = essays.filter((question) => question.score == null).length;
  const changed = essays.filter((question) => {
    const draft = drafts[`${attemptId}:${question.attemptQuestionId}`];
    const original = savedDraft(question);
    return draft && (draft.score !== original.score || draft.feedback !== original.feedback);
  });
  const invalid = changed.filter((question) => !validScore(drafts[`${attemptId}:${question.attemptQuestionId}`], question));
  const saveScores = useMutation({
    mutationFn: async (questions: Question[]) => {
      setSavedCount(0);
      for (const question of questions) {
        const key = `${attemptId}:${question.attemptQuestionId}`;
        const draft = drafts[key] ?? savedDraft(question);
        if (!validScore(draft, question)) throw new Error(`Question ${question.position}: enter a score from 0 to ${question.maxScore}.`);
        // Every write changes the attempt revision. Read it again before the next score.
        const latest = await getLecturerAttemptGrading(attemptId);
        await gradeEssayQuestion(attemptId, question.attemptQuestionId, latest.revision, { score: Number(draft.score), feedback: draft.feedback.trim() || null });
        setSavedCount((count) => count + 1);
        setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      }
    },
    onSuccess: () => toast({ title: "Scores saved", description: "Your changes are saved. Confirm marking complete when you are ready." }),
    onError: (error) => toast({ title: "Saving stopped", description: message(error, "Some scores could not be saved. Your remaining edits are kept; try again."), variant: "error" }),
    onSettled: async () => { await client.invalidateQueries({ queryKey: ["lecturer", "grading", attemptId] }); },
  });
  return <main className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div><h1 className="text-3xl font-extrabold tracking-tight text-primary">Essay grading</h1></div>
      <Button variant="outline" onClick={() => void assignments.refetch()}>Refresh assignments</Button>
    </header>
    <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside aria-label="Grading assignments" className="overflow-hidden rounded-xl border-2 border-border bg-card">
        <div className="space-y-4 border-b border-border p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Assigned to you</h2><Badge variant="outline">{items.length} attempts</Badge></div><p className="text-sm text-muted-foreground">{pendingCount} pending · {items.length - pendingCount} completed</p>
          <div className="flex flex-wrap gap-2" aria-label="Filter assignments">{[["pending", "Pending"], ["completed", "Completed"], ["all", "All"]].map(([value, label]) => <Button key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
        </div>
        {assignments.isPending ? <div role="status" className="space-y-3 p-5"><p className="text-sm text-muted-foreground">Loading your assignments…</p><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" /></div>
          : assignments.error ? <p role="alert" className="p-5 text-sm text-destructive">{message(assignments.error, "Your assignments could not be loaded. Select Refresh assignments to retry.")}</p>
          : <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">{visible.map((assignment) => <li key={assignment.attemptId}><button type="button" disabled={saveScores.isPending || completion.isPending} aria-pressed={attemptId === assignment.attemptId} onClick={() => setAttemptId(assignment.attemptId)} className={`w-full space-y-2 p-5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px] ${attemptId === assignment.attemptId ? "bg-primary/5" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">Assignment {items.indexOf(assignment) + 1}</span><span className={`text-xs font-semibold ${assignment.markingCompletedAt ? "text-success-foreground" : "text-muted-foreground"}`}>{assignment.markingCompletedAt ? "Completed" : "Needs marking"}</span></div><p className="break-all text-xs text-muted-foreground">Attempt {assignment.attemptId.slice(0, 8).toUpperCase()}</p>{assignment.assignedAt ? <p className="text-xs text-muted-foreground">Assigned {new Date(assignment.assignedAt).toLocaleDateString("en-GB")}</p> : null}{assignment.assignmentNote ? <p className="break-words text-sm">{assignment.assignmentNote}</p> : null}</button></li>)}</ul>}
        {assignments.isSuccess && !visible.length ? <p className="p-5 text-sm text-muted-foreground">{items.length ? "No assignments in this filter. Choose All to see your other work." : "No attempts have been assigned to your account yet. An Examiner must assign marking before it appears here."}</p> : null}
      </aside>
      <div className="min-w-0 space-y-5">
        {detail.data && !detail.data.markingCompletedAt ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border bg-card p-4" aria-label="Save all grading changes"><div><p role="status" className="text-sm font-semibold">{saveScores.isPending ? `Saving scores… ${savedCount} saved` : changed.length ? `${changed.length} question(s) with unsaved changes` : "All changes saved"}</p>{invalid.length ? <p role="alert" className="mt-1 text-sm text-destructive">Check scores for question(s) {invalid.map((question) => question.position).join(", ")}. Each score must be between 0 and its maximum.</p> : null}{saveScores.isError ? <p role="alert" className="mt-1 text-sm text-destructive">{savedCount} saved before stopping. Remaining edits are kept. {saveScores.error instanceof ApiFailure ? saveScores.error.serverMessage ?? "Try again after refreshing the result." : "Try Save all scores again."}</p> : null}</div><Button disabled={!changed.length || invalid.length > 0 || saveScores.isPending || completion.isPending || detail.isFetching} onClick={() => saveScores.mutate(changed)}><Save aria-hidden />{saveScores.isPending ? "Saving…" : "Save all scores"}</Button></section> : null}
        {!attemptId ? <section className="rounded-xl border-2 border-border p-8 sm:p-12"><ClipboardCheck className="size-9 text-primary" aria-hidden /><h2 className="mt-5 text-xl font-semibold">{assignments.isPending ? "Preparing your grading workspace" : "Your grading workspace"}</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Assigned attempts appear on the left. The first pending attempt opens automatically, so you can start marking straight away.</p></section>
          : detail.isPending ? <div role="status" className="space-y-4 rounded-xl border-2 border-border p-6"><p>Loading assigned answers…</p><div className="h-28 animate-pulse rounded-lg bg-muted" /></div>
          : detail.error || !detail.data ? <div role="alert" className="space-y-4 rounded-xl border-2 border-destructive p-5"><p className="text-sm text-destructive">{message(detail.error, "The assigned attempt could not be loaded.")}</p><Button variant="outline" onClick={() => void detail.refetch()}>Retry loading answers</Button></div>
          : <><section className="space-y-5 rounded-xl border-2 border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{detail.data.studentName}</h2><p className="mt-2 text-sm text-muted-foreground">{essays.length} Essay questions · {essays.length - unscored} scored · {unscored} remaining</p></div><Badge variant="outline">{detail.data.markingCompletedAt ? "Marking completed" : "Marking in progress"}</Badge></div>
              <dl className="flex flex-wrap gap-x-10 gap-y-4 text-sm"><div><dt className="text-muted-foreground">Automatic score</dt><dd className="mt-1 text-lg font-semibold">{detail.data.autoScore ?? "Pending"}</dd></div><div><dt className="text-muted-foreground">Manual score</dt><dd className="mt-1 text-lg font-semibold">{detail.data.manualScore ?? "Pending"}</dd></div><div><dt className="text-muted-foreground">Current total</dt><dd className="mt-1 text-lg font-semibold">{detail.data.totalScore ?? "Pending"} / {detail.data.maxScore}</dd></div></dl></section>
            {detail.data.markingCompletedAt ? <p className="rounded-xl border border-success-border bg-success p-4 text-sm text-success-foreground">Marking is complete. The Examiner can review and release the result. Reopen marking below if a correction is needed.</p> : essays.map((question) => <EssayEditor key={attemptId + question.attemptQuestionId} question={question} draft={drafts[`${attemptId}:${question.attemptQuestionId}`] ?? savedDraft(question)} onChange={(draft) => setDrafts((current) => ({ ...current, [`${attemptId}:${question.attemptQuestionId}`]: draft }))} onSave={() => saveScores.mutate([question])} busy={saveScores.isPending || completion.isPending} />)}
            {!essays.length ? <p className="rounded-xl border-2 border-border p-6 text-sm text-muted-foreground">There are no Essay questions in this attempt.</p> : null}
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-border p-5"><div><h3 className="font-semibold">Finish marking</h3><p className="mt-1 max-w-prose text-sm text-muted-foreground">{unscored ? "Save a score for every Essay answer before confirming completion." : "All Essay answers have a score. Confirm completion to hand the result back to the Examiner."}</p></div><Button variant={detail.data.markingCompletedAt ? "outline" : "default"} disabled={completion.isPending || saveScores.isPending || changed.length > 0 || detail.isFetching || (!detail.data.markingCompletedAt && unscored > 0)} onClick={() => completion.mutate(!detail.data!.markingCompletedAt)}>{completion.isPending ? "Saving…" : detail.data.markingCompletedAt ? "Reopen marking" : "Confirm marking complete"}</Button></section>
          </>}
      </div>
    </div>
  </main>;
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Save } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { getLecturerAttemptGrading, getLecturerGradingAssignments, gradeEssayQuestion, updateMarkingCompletion, type ExamGradingDetail } from "@/api/grading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

function message(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server") return [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ") || fallback;
  return fallback;
}
type Question = ExamGradingDetail["questions"][number];

function EssayEditor({ attemptId, revision, question }: { attemptId: string; revision: string; question: Question }) {
  const [score, setScore] = useState(question.score == null ? "" : String(question.score));
  const [feedback, setFeedback] = useState(question.feedback ?? "");
  const client = useQueryClient();
  useEffect(() => { setScore(question.score == null ? "" : String(question.score)); setFeedback(question.feedback ?? ""); }, [question.score, question.feedback]);
  const save = useMutation({
    mutationFn: () => gradeEssayQuestion(attemptId, question.attemptQuestionId, revision, { score: Number(score), feedback: feedback.trim() || null }),
    onSuccess: async () => { toast({ title: "Essay score saved", description: `Question ${question.position} has been updated.` }); await client.invalidateQueries({ queryKey: ["lecturer", "grading", attemptId] }); },
    onError: (error) => toast({ title: "Score could not be saved", description: message(error, "Refresh the attempt and try again.") }),
  });
  const valid = score !== "" && Number.isFinite(Number(score)) && Number(score) >= 0 && Number(score) <= question.maxScore;
  return <Card className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Question {question.position}</CardTitle><Badge variant="outline">Maximum {question.maxScore} points</Badge></div></CardHeader><CardContent className="space-y-5"><div><p className="font-semibold">{question.content}</p><p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">{question.answerText || "No written answer was submitted."}</p></div>{question.referenceAnswer ? <div><h3 className="text-sm font-bold">Reference answer</h3><p className="mt-1 text-sm text-muted-foreground">{question.referenceAnswer}</p></div> : null}{question.gradingCriteria ? <div><h3 className="text-sm font-bold">Grading criteria</h3><p className="mt-1 text-sm text-muted-foreground">{question.gradingCriteria}</p></div> : null}<div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]"><label className="space-y-2 text-sm font-semibold">Score<Input type="number" min={0} max={question.maxScore} step="0.25" value={score} onChange={(event) => setScore(event.target.value)} /></label><label className="space-y-2 text-sm font-semibold">Feedback<Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback visible in the grading record" /></label></div><Button disabled={!valid || save.isPending} onClick={() => save.mutate()}><Save aria-hidden />{save.isPending ? "Saving…" : "Save score"}</Button></CardContent></Card>;
}

export function LecturerGradingRoute() {
  const [attemptId, setAttemptId] = useState("");
  const assignments = useQuery({ queryKey: ["lecturer", "grading-assignments"], queryFn: getLecturerGradingAssignments });
  const detail = useQuery({ queryKey: ["lecturer", "grading", attemptId], queryFn: () => getLecturerAttemptGrading(attemptId), enabled: Boolean(attemptId) });
  const client = useQueryClient();
  const completion = useMutation({
    mutationFn: (completed: boolean) => updateMarkingCompletion(attemptId, detail.data!.revision, completed, completed ? "All assigned Essay answers have been reviewed." : "Marking reopened for correction."),
    onSuccess: async (_, completed) => { toast({ title: completed ? "Marking confirmed" : "Marking reopened", description: completed ? "The Examiner can now continue the result-release checks." : "Update the affected scores, then confirm marking again." }); await client.invalidateQueries({ queryKey: ["lecturer", "grading", attemptId] }); },
    onError: (error) => toast({ title: "Marking status could not be updated", description: message(error, "Check that every Essay score is valid, then try again.") }),
  });
  return <div className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-primary">Essay grading</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Grade Essay answers assigned to your account. Scores use the frozen question and maximum score from the published exam paper.</p></header>
    {assignments.error ? <div role="alert" className="rounded-xl border border-destructive p-5 text-destructive">{message(assignments.error, "Your grading assignments could not be loaded.")}</div> : <label className="block max-w-xl space-y-2 text-sm font-semibold">Assigned attempt<Select value={attemptId} onValueChange={setAttemptId}><SelectTrigger><SelectValue placeholder={assignments.isPending ? "Loading assignments…" : "Select an assigned attempt"} /></SelectTrigger><SelectContent>{assignments.data?.items.map((assignment, index) => <SelectItem key={assignment.attemptId} value={assignment.attemptId}>Assignment {index + 1} · {assignment.attemptId.slice(0, 8).toUpperCase()} · {assignment.markingCompletedAt ? "Completed" : assignment.gradingStatus ?? "Pending"}</SelectItem>)}</SelectContent></Select></label>}
    {!attemptId ? <Card className="shadow-none"><CardContent className="py-14 text-center"><ClipboardCheck className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select an assigned attempt</h2><p className="mt-2 text-muted-foreground">Only attempts assigned by an Examiner are available here.</p></CardContent></Card> : detail.isPending ? <p role="status" className="rounded-xl border border-border p-6">Loading Essay answers…</p> : detail.error || !detail.data ? <div role="alert" className="rounded-xl border border-destructive p-5 text-destructive">{message(detail.error, "The assigned attempt could not be loaded.")}</div> : <><section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5"><div><h2 className="text-xl font-bold">{detail.data.studentName}</h2><p className="mt-1 text-sm text-muted-foreground">Attempt {detail.data.attemptId.slice(0, 8).toUpperCase()} · {detail.data.attemptStatus}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-sm text-muted-foreground">Current total</p><p className="text-xl font-extrabold">{detail.data.totalScore ?? "—"} / {detail.data.maxScore}</p></div><Button variant={detail.data.markingCompletedAt ? "outline" : "default"} disabled={completion.isPending} onClick={() => completion.mutate(!detail.data!.markingCompletedAt)}>{detail.data.markingCompletedAt ? "Reopen marking" : "Confirm marking complete"}</Button></div></section>{detail.data.questions.map((question) => <EssayEditor key={question.attemptQuestionId} attemptId={attemptId} revision={detail.data.revision} question={question} />)}{detail.data.questions.length === 0 ? <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">This attempt has no Essay questions to grade.</p> : null}</>}
  </div>;
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describeError } from "@/app/providers";
import { getPracticeGrading, gradePracticeQuestion } from "@/api/practiceSessions";
import { Button } from "@/shared/ui/primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

type Props = { sessionId: string; attemptId: string | null; studentName: string; onClose: () => void };

export function PracticeGradingDialog({ sessionId, attemptId, studentName, onClose }: Props) {
  const client = useQueryClient();
  const [questionId, setQuestionId] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const key = ["lecturer", "practice-grading", sessionId, attemptId];
  const grading = useQuery({
    queryKey: key,
    queryFn: () => getPracticeGrading(sessionId, attemptId!),
    enabled: Boolean(attemptId),
    retry: false,
  });
  const manualQuestions = grading.data?.questions.filter((question) => question.questionType === "Essay" || question.questionType === "Coding") ?? [];
  const selected = manualQuestions.find((question) => question.attemptQuestionId === questionId) ?? manualQuestions[0];
  useEffect(() => {
    if (!selected) return;
    setQuestionId(selected.attemptQuestionId);
    setScore(selected.score == null ? "" : String(selected.score));
    setFeedback(selected.feedback ?? "");
  }, [selected]);
  const parsedScore = Number(score);
  const validScore = score.trim() !== "" && Number.isFinite(parsedScore) && parsedScore >= 0 && Boolean(selected) && parsedScore <= selected.maxScore;
  const save = useMutation({
    mutationFn: () => gradePracticeQuestion(sessionId, attemptId!, selected!.attemptQuestionId, {
      expectedRevision: grading.data!.revision,
      score: parsedScore,
      feedback: feedback.trim() || null,
    }),
    onSuccess: async (updated) => {
      client.setQueryData(key, updated);
      await client.invalidateQueries({ queryKey: ["lecturer", "practice-session", sessionId] });
      toast({ title: "Grade saved", variant: "success" });
    },
    onError: (error) => toast({ title: "Grade could not be saved", description: describeError(error), variant: "error" }),
  });

  return (
    <Dialog open={Boolean(attemptId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade practice answers</DialogTitle>
          <DialogDescription>{studentName} · Review essay and coding answers, then save each score.</DialogDescription>
        </DialogHeader>
        {grading.isPending ? <p role="status">Loading answers…</p> : null}
        {grading.isError ? <p role="alert" className="text-destructive">Answers could not be loaded. Close this window and try again.</p> : null}
        {grading.isSuccess && !manualQuestions.length ? <p>No essay or coding answers need manual grading in this attempt.</p> : null}
        {selected ? (
          <div className="space-y-4">
            {manualQuestions.length > 1 ? (
              <div className="flex flex-wrap gap-2" aria-label="Questions to grade">
                {manualQuestions.map((question) => (
                  <Button key={question.attemptQuestionId} type="button" variant={question.attemptQuestionId === selected.attemptQuestionId ? "default" : "outline"} onClick={() => setQuestionId(question.attemptQuestionId)}>
                    Question {question.position}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="space-y-2 rounded-lg border border-border p-4">
              <h3 className="font-bold">Question {selected.position} · {selected.questionType}</h3>
              <p className="whitespace-pre-wrap">{selected.content}</p>
              <p className="text-sm font-semibold">Student answer</p>
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{selected.answerText || "No answer submitted"}</p>
              {selected.referenceAnswer ? <p className="text-sm"><strong>Reference answer:</strong> {selected.referenceAnswer}</p> : null}
              {selected.gradingCriteria ? <p className="text-sm"><strong>Grading criteria:</strong> {selected.gradingCriteria}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <div><Label htmlFor="practice-grade-score">Score (0–{selected.maxScore})</Label><Input id="practice-grade-score" className="mt-2" type="number" min={0} max={selected.maxScore} step="any" value={score} onChange={(event) => setScore(event.target.value)} aria-invalid={score.trim() !== "" && !validScore} /></div>
              <div><Label htmlFor="practice-grade-feedback">Feedback (optional)</Label><Textarea id="practice-grade-feedback" className="mt-2" value={feedback} onChange={(event) => setFeedback(event.target.value)} /></div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          {selected ? <Button type="button" disabled={!validScore || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save grade"}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

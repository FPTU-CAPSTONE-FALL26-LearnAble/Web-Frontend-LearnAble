import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { getExamPaper, sealExamPaper } from "@/api/exams";
import { describeError } from "@/app/providers";
import { matchesAudioFilter, useQuestionAudio, type QuestionAudio } from "@/features/lecturer/questions/audioStatus";
import { formatQuestionId } from "@/shared/strings/questionId";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { toast } from "@/shared/ui/primitives/toast";

const audioNames: Record<QuestionAudio["state"], string> = {
  ready: "Audio ready",
  waiting: "Audio in progress",
  failed: "Audio failed",
  none: "No audio",
  loading: "Checking…",
  unavailable: "Unknown",
};

/** Every question of a paper must have audio before the paper can be sealed into a locked package. */
export function SealPaperRoute() {
  const { paperId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const paper = useQuery({ queryKey: ["exam-paper", paperId], queryFn: () => getExamPaper(paperId), enabled: Boolean(paperId) });
  const questions = paper.data?.questions ?? [];
  const audioById = useQuestionAudio(questions.map((question) => question.questionId));
  const checking = questions.some((question) => audioById.get(question.questionId)?.state === "loading");
  const missing = questions.filter((question) => !matchesAudioFilter(audioById.get(question.questionId), "ready"));
  const seal = useMutation({
    mutationFn: () => sealExamPaper(paperId, paper.data?.eTag),
    onSuccess: async () => {
      setConfirming(false);
      toast({ title: "Paper sealed", description: "The paper is now a locked package. Hand it over to the examiners." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam-paper"] }),
        queryClient.invalidateQueries({ queryKey: ["lecturer", "sealed-papers"] }),
      ]);
      void navigate("/lecturer/sealed-papers");
    },
    onError: (error) => {
      setConfirming(false);
      toast({ title: "The paper could not be sealed", description: describeError(error), variant: "error" });
    },
  });
  if (paper.isPending) return <div role="status" aria-label="Loading the paper" className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (paper.isError || !paper.data) {
    return (
      <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
        <p className="font-bold">This paper could not be loaded.</p>
        <Button className="mt-3" variant="outline" onClick={() => void paper.refetch()}>Retry</Button>
      </div>
    );
  }
  const notDraft = paper.data.status !== "Draft";
  const ready = !checking && missing.length === 0 && questions.length > 0 && !notDraft;
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Seal the paper</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {paper.data.name ?? paper.data.paperCode ?? "Exam paper"} · {questions.length} questions · {paper.data.totalScore} points.
          Every question needs audio. Sealing locks the paper into a package that neither you nor the examiners can change.
        </p>
      </header>
      {notDraft ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          This paper is already {paper.data.status.toLowerCase()}. Only a draft paper can be sealed, so create a new draft paper if you need a new package.
        </p>
      ) : null}
      <section aria-label="Audio check" className={`rounded-2xl border p-5 ${ready ? "border-success-border bg-success/40" : "border-warning-foreground/30 bg-warning/40"}`}>
        <p className="flex items-center gap-2 font-bold">
          {ready ? <CheckCircle2 className="size-5 text-success-foreground" aria-hidden /> : <AlertTriangle className="size-5 text-warning-foreground" aria-hidden />}
          {checking
            ? "Checking the audio of every question…"
            : ready
              ? "Every question has audio."
              : questions.length === 0
                ? "This paper has no questions."
                : `${missing.length} of ${questions.length} questions still need audio.`}
        </p>
        {!ready && !checking && questions.length > 0 ? (
          <p className="mt-1 text-sm">Add audio to these questions, then come back. The paper cannot be sealed until none is missing.</p>
        ) : null}
      </section>
      <ul aria-label="Questions" className="divide-y divide-border rounded-2xl border border-border">
        {questions.map((question, index) => {
          const audio = audioById.get(question.questionId);
          const ok = audio?.state === "ready";
          return (
            <li key={question.questionId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{index + 1}. {formatQuestionId(question.questionId)}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{question.content ?? "Question content not available"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ok ? "default" : audio?.state === "failed" || audio?.state === "none" ? "destructive" : "outline"}>{audioNames[audio?.state ?? "loading"]}</Badge>
                {!ok && audio && audio.state !== "loading" ? (
                  <Button variant="outline" asChild><Link to={`/lecturer/questions/new?purpose=exam&edit=${question.questionId}`}>Fix</Link></Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link to="/lecturer/exam-papers">Back to exam papers</Link></Button>
        <Button disabled={!ready || seal.isPending} onClick={() => setConfirming(true)}>
          <Lock aria-hidden />
          {seal.isPending ? "Sealing…" : "Seal the paper"}
        </Button>
      </div>
      <AlertDialog open={confirming} onOpenChange={(open) => { if (!open && !seal.isPending) setConfirming(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seal this paper?</AlertDialogTitle>
            <AlertDialogDescription>Once sealed, the questions, scores and audio are locked. Nobody can open or change the package.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={seal.isPending}>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={seal.isPending} onClick={(event) => { event.preventDefault(); seal.mutate(); }}>
              {seal.isPending ? "Sealing…" : "Seal the paper"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { getExamPaper, sealExamPaper } from "@/api/exams";
import { describeQuestionImage, getQuestionImages, type questionImagesSchema } from "@/api/lecturer";
import type { z } from "zod";
import { Input } from "@/shared/ui/primitives/input";
import { describeError } from "@/app/providers";
import { matchesAudioFilter, useQuestionAudio, type QuestionAudio } from "@/features/lecturer/questions/audioStatus";
import { operation } from "@/features/examiner/workflow/operationProgress";
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

type Images = z.infer<typeof questionImagesSchema>;

function ImageDescriptionEditor({ questionId, image, revision }: { questionId: string; image: Images["images"][number]; revision: string }) {
  const [description, setDescription] = useState(image.description ?? "");
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () => describeQuestionImage(questionId, image.imageId, description.trim(), revision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["question-images", questionId] });
      toast({ title: "Image description saved", variant: "success" });
    },
    onError: (error) => toast({ title: "Description could not be saved", description: describeError(error), variant: "error" }),
  });
  return <label className="block space-y-2 text-sm font-semibold">Description for {image.originalFileName ?? "image"}
    <div className="flex flex-wrap gap-2"><Input className="min-w-48 flex-1" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the image shows" /><Button disabled={!description.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save description"}</Button></div>
  </label>;
}

/** Every question of a paper must have audio before the paper can be sealed into a locked package. */
export function SealPaperRoute() {
  const { paperId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const paper = useQuery({ queryKey: ["exam-paper", paperId], queryFn: () => getExamPaper(paperId), enabled: Boolean(paperId) });
  const questions = paper.data?.questions ?? [];
  const audioById = useQuestionAudio(questions.map((question) => question.questionId));
  const imageQueries = useQueries({ queries: questions.map((question) => ({
    queryKey: ["question-images", question.questionId], queryFn: () => getQuestionImages(question.questionId), meta: { silent: true },
  })) });
  const checking = questions.some((question) => audioById.get(question.questionId)?.state === "loading");
  const missing = questions.filter((question) => !matchesAudioFilter(audioById.get(question.questionId), "ready"));
  const imageChecking = imageQueries.some((query) => query.isPending);
  const imageErrors = imageQueries.some((query) => query.isError);
  const missingDescriptions = imageQueries.reduce((count, query) => count + (query.data?.images.filter((image) => !image.description?.trim()).length ?? 0), 0);
  const seal = useMutation({
    mutationFn: () => {
      operation.start("Sealing the paper", ["Checking the paper version and question audio", "Creating the locked package"]);
      return sealExamPaper(paperId, paper.data?.eTag);
    },
    onSuccess: (sealedPaper) => {
      setConfirming(false);
      operation.step(1);
      operation.finish(`${sealedPaper.name ?? paper.data?.name ?? "The exam paper"} is sealed and locked.`);
      toast({
        title: "Paper sealed successfully",
        description: `${sealedPaper.name ?? paper.data?.name ?? "The exam paper"} is now locked and available in Sealed Packages.`,
      });
      void navigate("/lecturer/sealed-papers", {
        replace: true,
        state: { sealedPaperId: sealedPaper.paperId },
      });
      // Refresh cached lists in the background. A slow refetch must never hold the lecturer on this page
      // after the Backend has already sealed the package successfully.
      void queryClient.invalidateQueries({ queryKey: ["exam-paper"] });
      void queryClient.invalidateQueries({ queryKey: ["lecturer", "sealed-papers"] });
    },
    onError: (error) => {
      setConfirming(false);
      operation.fail(describeError(error));
      toast({ title: "The paper could not be sealed", description: describeError(error), variant: "error" });
    },
  });
  const startSealing = () => {
    setConfirming(false);
    seal.mutate();
    toast({
      title: "Sealing started in the background",
      description: "You can continue working. Follow the progress panel for the result.",
    });
  };
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
  const ready = !checking && !imageChecking && !imageErrors && missing.length === 0 && missingDescriptions === 0 && questions.length > 0 && !notDraft;
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Seal the paper</h1>
        <section aria-label="Paper summary" className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <dl className="grid sm:grid-cols-3">
            <div className="p-4 sm:border-r sm:border-border"><dt className="text-xs font-semibold text-muted-foreground">Exam paper</dt><dd className="mt-1 font-bold">{paper.data.name ?? paper.data.paperCode ?? "Exam paper"}</dd></div>
            <div className="border-t border-border p-4 sm:border-r sm:border-t-0"><dt className="text-xs font-semibold text-muted-foreground">Questions</dt><dd className="mt-1 text-lg font-bold tabular-nums">{questions.length}</dd></div>
            <div className="border-t border-border p-4 sm:border-t-0"><dt className="text-xs font-semibold text-muted-foreground">Total score</dt><dd className="mt-1 text-lg font-bold tabular-nums">{paper.data.totalScore} points</dd></div>
          </dl>
          <p className="flex items-start gap-3 border-t border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground"><Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><span><strong className="text-foreground">What sealing does.</strong> Every question needs audio, and every image needs a description. Once sealed, the paper becomes a locked package that neither lecturers nor examiners can change.</span></p>
        </section>
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
      <section aria-label="Image description check" className="rounded-2xl border border-border p-5">
        <h2 className="font-bold">Image descriptions</h2>
        {imageChecking ? <p role="status">Checking images…</p> : imageErrors ? <div role="alert" className="mt-2 text-destructive">Images could not be checked. <Button variant="outline" onClick={() => imageQueries.forEach((query) => { if (query.isError) void query.refetch(); })}>Retry</Button></div> : <p className="mt-1 text-sm text-muted-foreground">{missingDescriptions ? `${missingDescriptions} image${missingDescriptions === 1 ? " needs" : "s need"} a description before sealing.` : "Every image has a description."}</p>}
        <div className="mt-4 space-y-4">{imageQueries.map((query, index) => query.data?.images.filter((image) => !image.description?.trim()).map((image) => <div key={image.imageId} className="rounded-xl bg-muted p-4"><p className="mb-2 font-semibold">Question {index + 1} · {formatQuestionId(questions[index].questionId)}</p><ImageDescriptionEditor questionId={questions[index].questionId} image={image} revision={query.data.revision} /></div>))}</div>
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
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seal this paper?</AlertDialogTitle>
            <AlertDialogDescription>Once sealed, the questions, scores and audio are locked. Nobody can open or change the package.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={startSealing}>
              Seal in background
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Volume2 } from "lucide-react";
import { getSealedPaperAudio, getSealedPaperPreview, type SealedPaper } from "@/api/exams";
import { describeError } from "@/app/providers";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";

/** The locked audio of one question or answer. The link is fetched only when the lecturer asks to hear it. */
function LockedAudio({ paper, examQuestionId, optionId, label }: { paper: SealedPaper; examQuestionId: string; optionId?: string; label: string }) {
  const [wanted, setWanted] = useState(false);
  const audio = useQuery({
    queryKey: ["sealed-audio", paper.versionId, examQuestionId, optionId ?? "question"],
    queryFn: () => getSealedPaperAudio(paper.paperId, paper.versionId, examQuestionId, optionId),
    enabled: wanted,
    staleTime: 8 * 60 * 1000,
    retry: false,
    meta: { silent: true },
  });
  if (!wanted) return <Button variant="outline" onClick={() => setWanted(true)}><Volume2 aria-hidden />Listen<span className="sr-only"> to {label}</span></Button>;
  if (audio.isPending) return <p className="text-xs text-muted-foreground">Loading audio…</p>;
  if (audio.isError || !audio.data.url) return <p className="text-xs text-muted-foreground">This audio could not be loaded. {audio.isError ? describeError(audio.error) : ""}</p>;
  return <audio controls autoPlay preload="metadata" aria-label={label} src={audio.data.url} className="w-full"><track kind="captions" /></audio>;
}

/** The questions of a sealed package exactly as they were locked, with their audio. Nothing here can be changed. */
export function SealedPackagePreview({ paper, onClose }: { paper: SealedPaper | null; onClose: () => void }) {
  const preview = useQuery({
    queryKey: ["sealed-preview", paper?.versionId],
    queryFn: () => getSealedPaperPreview(paper!.paperId, paper!.versionId),
    enabled: Boolean(paper),
    meta: { silent: true },
  });
  const questions = [...(preview.data?.questions ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <Dialog open={Boolean(paper)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{paper?.name ?? "Sealed package"} · version {paper?.versionNumber}</DialogTitle>
          <DialogDescription>The package as it was locked. You can read and listen, but nothing can be changed.</DialogDescription>
        </DialogHeader>
        {preview.isPending ? <div role="status" aria-label="Loading the package" className="space-y-3"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /></div> : null}
        {preview.isError ? <p role="alert" className="text-sm text-destructive">The package could not be opened. {describeError(preview.error)}</p> : null}
        {paper && preview.data ? (
          <ol aria-label="Questions" className="space-y-4">
            {questions.map((question, index) => {
              const options = [...question.snapshot.options].sort((a, b) => a.originalDisplayOrder - b.originalDisplayOrder);
              return (
                <li key={question.examQuestionId} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">Question {index + 1}</p>
                    <Badge variant="outline">{question.maxScore} points</Badge>
                  </div>
                  <p className="whitespace-pre-wrap">{question.snapshot.content}</p>
                  <LockedAudio paper={paper} examQuestionId={question.examQuestionId} label={`question ${index + 1}`} />
                  {options.length ? (
                    <ul className="space-y-2">
                      {options.map((option, position) => (
                        <li key={option.optionId} className="space-y-2 rounded-lg border border-border p-3">
                          <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">{String.fromCharCode(65 + position)}.</span>{option.content}{option.isCorrect ? <Badge>Correct answer</Badge> : null}</p>
                          <LockedAudio paper={paper} examQuestionId={question.examQuestionId} optionId={option.optionId} label={`answer ${String.fromCharCode(65 + position)} of question ${index + 1}`} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

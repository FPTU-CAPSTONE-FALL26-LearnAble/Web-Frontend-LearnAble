import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuestion, getQuestionImages } from "@/api/lecturer";
import { getCodingQuestion } from "@/api/coding";
import { QuestionAudioStatus } from "@/features/lecturer/questions/components/AudioGenerationStatus";
import { QuestionPreview } from "@/features/lecturer/questions/components/QuestionPreview";
import { QuestionSequenceAudio } from "@/features/lecturer/questions/components/QuestionSequenceAudio";
import { readingOrder } from "@/features/lecturer/questions/components/accessibilityReview";
import { createDraft, type QuestionDraft, type QuestionType } from "@/features/lecturer/questions/model";
import { questionPromptWithoutGeneratedDetails } from "@/features/lecturer/questions/model/codingSpokenContent";
import { formatQuestionId } from "@/shared/strings/questionId";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { Button } from "@/shared/ui/primitives/button";

/** Shows a saved question exactly as the live review shows it while writing, with its audio playable. */
export function QuestionPreviewDialog({ questionId, course, topic, onClose }: {
  questionId: string | null;
  course: string;
  topic: string;
  onClose: () => void;
}) {
  const question = useQuery({
    queryKey: ["question", questionId],
    queryFn: () => getQuestion(questionId!),
    enabled: Boolean(questionId),
    meta: { silent: true },
  });
  const source = question.data;
  const coding = useQuery({ queryKey: ["coding-question", questionId], queryFn: () => getCodingQuestion(questionId!), enabled: Boolean(questionId) && source?.questionType === "Coding", retry: false, meta: { silent: true } });
  const images = useQuery({ queryKey: ["question-images", questionId], queryFn: () => getQuestionImages(questionId!), enabled: Boolean(questionId), retry: false, meta: { silent: true } });
  const options = useMemo(() => [...(source?.options ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [source]);
  const draft = useMemo((): QuestionDraft | null => {
    if (!source) return null;
    const type: QuestionType = source.questionType === "Multiple" ? "multiple" : source.questionType === "Essay" ? "essay" : source.questionType === "Coding" ? "code" : "single";
    const difficulty = (["Easy", "Medium", "Hard"].includes(source.difficulty) ? source.difficulty : "Medium") as "Easy" | "Medium" | "Hard";
    const common = { examTypeId: source.examTypeId, course, topic, difficulty, points: String(source.defaultScore), content: source.content };
    const base = createDraft(type, common);
    if (base.type === "essay") return { ...base, instructions: source.referenceAnswer ?? "" };
    if (base.type === "code") {
      const language = Object.keys(coding.data?.starterCodes ?? {})[0] ?? base.language;
      const publicTest = coding.data?.testCases?.find((test) => test.isPublic);
      return { ...base, content: questionPromptWithoutGeneratedDetails(source.content), language, starterCode: coding.data?.starterCodes?.[language] ?? coding.data?.starterCode ?? "", constraints: coding.data?.constraints ?? "", testInput: publicTest?.input ?? "", expectedOutput: publicTest?.expectedOutput ?? "" };
    }
    if (base.type === "single" || base.type === "multiple") {
      return { ...base, options: options.map((option) => ({ text: option.content, description: "", correct: option.isCorrect })) };
    }
    return base;
  }, [coding.data, course, options, source, topic]);
  return (
    <Dialog open={Boolean(questionId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent data-contrast="yellow" className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
        {/* The title and description stay for screen readers; the live review below says the rest. */}
        <DialogHeader className="sr-only">
          <DialogTitle>Live review · {questionId ? formatQuestionId(questionId) : "question"}</DialogTitle>
          <DialogDescription>The question as a student sees it. Press play to hear the audio.</DialogDescription>
        </DialogHeader>
        {question.isPending ? (
          <div role="status" aria-label="Loading the question" className="animate-pulse space-y-3">
            <div className="h-10 rounded-lg bg-muted" />
            <div className="h-32 rounded-xl bg-muted" />
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-16 rounded-xl bg-muted" />
          </div>
        ) : null}
        {question.isError ? <p role="alert" className="text-sm text-destructive">The question could not be loaded. Close this window and try again.</p> : null}
        {draft && questionId ? (
          <div className="space-y-5">
            <QuestionPreview
              draft={draft}
              image=""
              images={images.data?.images ?? []}
              reviewUnavailable={images.isError || images.isPending}
              compact
              audio={{
                question: <QuestionSequenceAudio questionId={questionId} optionIds={options.map((option) => option.optionId)} />,
              }}
            />
            {images.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">Images and their descriptions could not be checked. <Button variant="outline" onClick={() => void images.refetch()}>Retry image check</Button></div> : null}
            {coding.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">Coding instructions could not be loaded. <Button variant="outline" onClick={() => void coding.refetch()}>Retry coding preview</Button></div> : null}
            <section aria-label="Screen reader reading order" className="space-y-2 rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold">How a screen reader reads this</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {readingOrder(draft, images.data?.images ?? []).map((line, index) => <li key={index}>{line}</li>)}
              </ol>
            </section>
            <QuestionAudioStatus questionId={questionId} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuestion } from "@/api/lecturer";
import { QuestionAudioStatus } from "@/features/lecturer/questions/components/AudioGenerationStatus";
import { QuestionPreview } from "@/features/lecturer/questions/components/QuestionPreview";
import { QuestionSequenceAudio } from "@/features/lecturer/questions/components/QuestionSequenceAudio";
import { createDraft, type QuestionDraft, type QuestionType } from "@/features/lecturer/questions/model";
import { formatQuestionId } from "@/shared/strings/questionId";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";

/** The words a screen reader says, in order, so a lecturer can hear the question the way a blind student does. */
export function readingOrder(draft: QuestionDraft): string[] {
  const spoken = [`Question, ${draft.points || "0"} ${Number(draft.points) === 1 ? "point" : "points"}.`, draft.content.trim() || "The question text is empty."];
  if (draft.type === "single" || draft.type === "multiple") {
    spoken.push(`${draft.options.length} answer options. ${draft.type === "single" ? "Select one answer." : "Select all answers that apply."}`);
    draft.options.forEach((option, index) => spoken.push(`Option ${String.fromCharCode(65 + index)}. ${option.text.trim() || "This option is empty."}`));
  } else if (draft.type === "essay") {
    spoken.push("Written answer. Edit text area.");
  }
  return spoken;
}

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
  const options = useMemo(() => [...(source?.options ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [source]);
  const draft = useMemo((): QuestionDraft | null => {
    if (!source) return null;
    const type: QuestionType = source.questionType === "Multiple" ? "multiple" : source.questionType === "Essay" ? "essay" : "single";
    const common = { examTypeId: source.examTypeId, course, topic, bloom: "Understand", points: String(source.defaultScore), content: source.content };
    const base = createDraft(type, common);
    if (base.type === "essay") return { ...base, instructions: source.referenceAnswer ?? "" };
    if (base.type === "single" || base.type === "multiple") {
      return { ...base, options: options.map((option) => ({ text: option.content, description: "", correct: option.isCorrect })) };
    }
    return base;
  }, [course, options, source, topic]);
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
              compact
              audio={{
                question: <QuestionSequenceAudio questionId={questionId} optionIds={options.map((option) => option.optionId)} />,
              }}
            />
            <section aria-label="Screen reader reading order" className="space-y-2 rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold">How a screen reader reads this</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {readingOrder(draft).map((line, index) => <li key={index}>{line}</li>)}
              </ol>
            </section>
            <QuestionAudioStatus questionId={questionId} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

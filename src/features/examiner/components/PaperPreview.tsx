/* eslint-disable jsx-a11y/label-has-associated-control -- Radix checkbox and radio rows are named by their labels. */
import { useState } from "react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, ListChecks, Monitor, Sigma } from "lucide-react";
import type { ExamPaperPreview } from "@/api/exams";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Textarea } from "@/shared/ui/primitives/textarea";

type PreviewQuestion = ExamPaperPreview["questions"][number];

function Audio({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  // The words spoken are the question and answer text printed right above the player.
  return <audio controls preload="none" aria-label={label} src={url} className="mt-3 w-full"><track kind="captions" /></audio>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold tabular-nums">{value}</dd>
      </div>
    </div>
  );
}

const letter = (index: number) => String.fromCharCode(65 + index);
const pointsLabel = (points: number | null) => `${points ?? 0} ${points === 1 ? "point" : "points"}`;

/**
 * The paper as a student would meet it: a map of the questions, one question at a time, with its
 * answers and audio. Answers given here stay on the page. The examiner can reveal the correct answers.
 */
export function PaperPreview({ preview, paperName, paperCode }: { preview: ExamPaperPreview; paperName: string; paperCode: string }) {
  const questions = preview.questions;
  const [index, setIndex] = useState(0);
  const [showCorrect, setShowCorrect] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const question: PreviewQuestion | undefined = questions[Math.min(index, questions.length - 1)];
  const answered = (item: PreviewQuestion) => (answers[item.questionId]?.length ?? 0) > 0;
  const choose = (item: PreviewQuestion, optionId: string, multiple: boolean, checked: boolean) =>
    setAnswers((current) => {
      const chosen = current[item.questionId] ?? [];
      return { ...current, [item.questionId]: multiple ? (checked ? [...chosen, optionId] : chosen.filter((id) => id !== optionId)) : [optionId] };
    });

  return (
    <section aria-label="Paper preview" className="examiner-major overflow-hidden">
      <header className="space-y-4 border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Monitor aria-hidden className="size-5 text-primary" />
          <h2 className="min-w-0 flex-1 text-xl font-semibold">{paperName || "Exam paper preview"}</h2>
          {paperCode ? <span className="font-mono text-sm text-muted-foreground">{paperCode}</span> : null}
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Clock className="size-5" aria-hidden />} label="Duration" value={`${preview.durationMinutes} minutes`} />
          <Stat icon={<ListChecks className="size-5" aria-hidden />} label="Questions" value={String(questions.length)} />
          <Stat icon={<Sigma className="size-5" aria-hidden />} label="Total score" value={String(preview.totalScore)} />
        </dl>
        {preview.instructions ? <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{preview.instructions}</p> : null}
      </header>

      {!question ? (
        <p className="p-6 text-sm text-muted-foreground">This paper has no questions yet.</p>
      ) : (
        <>
          <nav aria-label="Question map" className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
            {questions.map((item, position) => {
              const current = position === index;
              return (
                <button
                  key={item.questionId}
                  type="button"
                  aria-current={current ? "true" : undefined}
                  aria-label={`Question ${position + 1} of ${questions.length}${current ? ", current question" : ""}${answered(item) ? ", answered" : ""}`}
                  onClick={() => setIndex(position)}
                  className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 text-base font-bold transition-colors ${current ? "border-primary bg-primary/10 text-primary" : answered(item) ? "border-success-border bg-success text-success-foreground" : "border-border bg-background hover:bg-muted"}`}
                >
                  {position + 1}
                  {answered(item) ? <Check aria-hidden className="absolute right-0.5 top-0.5 size-3" strokeWidth={3} /> : null}
                </button>
              );
            })}
            <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox checked={showCorrect} onCheckedChange={(value) => setShowCorrect(value === true)} />
              <Eye aria-hidden className="size-4 text-muted-foreground" />
              Show correct answers
            </label>
          </nav>

          <article className="m-3 space-y-5 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 sm:m-5 sm:p-6" aria-label={`Question ${index + 1}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-2 text-xl font-bold">Question {index + 1} of {questions.length}</h3>
              <Badge variant="outline">{question.questionType ?? "Question"}</Badge>
              {question.difficulty ? <Badge variant="outline">{question.difficulty}</Badge> : null}
              <Badge variant="outline">{pointsLabel(question.maxScore)}</Badge>
            </div>
            <div className="border-t border-border/70 pt-5">
              <p className="whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed">{question.content ?? "Question content unavailable"}</p>
              <Audio url={question.audioUrl} label={`Audio for question ${index + 1}`} />
            </div>

            {question.questionType === "Essay" ? (
              <div className="space-y-3">
                <Label htmlFor="paper-preview-essay">Your response</Label>
                <Textarea id="paper-preview-essay" placeholder="Write your answer…" className="min-h-36" />
                {showCorrect && (question.referenceAnswer || question.gradingCriteria) ? (
                  <div className="space-y-2 rounded-xl border border-success-border bg-success/40 p-4 text-sm">
                    {question.referenceAnswer ? <p><strong>Reference answer.</strong> {question.referenceAnswer}</p> : null}
                    {question.gradingCriteria ? <p><strong>Grading criteria.</strong> {question.gradingCriteria}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm font-semibold text-muted-foreground">
                  {question.questionType === "Multiple" ? "Select all answers that apply." : "Select one answer."}
                </p>
                {(() => {
                  const multiple = question.questionType === "Multiple";
                  const chosen = answers[question.questionId] ?? [];
                  const row = (option: PreviewQuestion["options"][number], position: number, control: React.ReactNode) => {
                    const selected = chosen.includes(option.optionId);
                    const revealed = showCorrect && option.isCorrect;
                    return (
                      <li key={option.optionId}>
                        <div className={`flex min-h-[60px] items-start gap-3.5 rounded-xl border p-4 transition-colors ${revealed ? "border-success-border bg-success/40" : selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 bg-card hover:bg-secondary/40"}`}>
                          {control}
                          <Label htmlFor={`paper-preview-${option.optionId}`} className="min-w-0 flex-1 cursor-pointer text-base leading-relaxed">
                            <span className="flex items-start gap-3">
                            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50"}`}>{option.label ?? letter(position)}</span>
                            <span className="min-w-0 flex-1 break-words pt-1">
                              {option.content ?? "Answer option"}
                              {revealed ? <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-success-foreground"><CheckCircle2 aria-hidden className="size-4" />Correct answer</span> : null}
                            </span>
                            </span>
                          </Label>
                        </div>
                        {option.audioUrl ? <div className="px-4 pb-2"><Audio url={option.audioUrl} label={`Audio for answer ${option.label ?? letter(position)}`} /></div> : null}
                      </li>
                    );
                  };
                  return multiple ? (
                    <ol aria-label="Answer options" className="space-y-2">
                      {question.options.map((option, position) => row(option, position,
                        <Checkbox id={`paper-preview-${option.optionId}`} className="mt-1" checked={chosen.includes(option.optionId)} onCheckedChange={(value) => choose(question, option.optionId, true, value === true)} />))}
                    </ol>
                  ) : (
                    <RadioGroup aria-label="Answer options" value={chosen[0] ?? ""} onValueChange={(value) => choose(question, value, false, true)} className="gap-2">
                      <ol className="space-y-2">
                        {question.options.map((option, position) => row(option, position,
                          <RadioGroupItem id={`paper-preview-${option.optionId}`} value={option.optionId} className="mt-1" />))}
                      </ol>
                    </RadioGroup>
                  );
                })()}
              </div>
            )}
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">Answers given here are not saved or scored.</p>
          </article>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-5 py-3">
            <Button type="button" variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
              <ChevronLeft aria-hidden />Previous
            </Button>
            <Button type="button" variant="secondary" disabled={index >= questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>
              Next<ChevronRight aria-hidden />
            </Button>
            <span aria-live="polite" className="ml-auto text-xs font-semibold text-muted-foreground">
              {questions.filter(answered).length} of {questions.length} answered in this preview
            </span>
          </footer>
        </>
      )}
    </section>
  );
}

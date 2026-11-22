/* eslint-disable jsx-a11y/label-has-associated-control -- Radix checkbox and radio rows are named by their labels. */
import { useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, Keyboard, ListChecks, Monitor, Sigma } from "lucide-react";
import type { ExamPaperPreview } from "@/api/exams";
import { QuestionSequenceAudio } from "@/features/lecturer/questions/components/QuestionSequenceAudio";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Textarea } from "@/shared/ui/primitives/textarea";

type PreviewQuestion = ExamPaperPreview["questions"][number];

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
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const question: PreviewQuestion | undefined = questions[Math.min(index, questions.length - 1)];
  const answered = (item: PreviewQuestion) => (answers[item.questionId]?.length ?? 0) > 0;
  const choose = (item: PreviewQuestion, optionId: string, multiple: boolean, checked: boolean) =>
    setAnswers((current) => {
      const chosen = current[item.questionId] ?? [];
      return { ...current, [item.questionId]: multiple ? (checked ? [...chosen, optionId] : chosen.filter((id) => id !== optionId)) : [optionId] };
    });

  return (
    <section data-contrast="yellow" aria-label="Paper preview" className="examiner-major overflow-hidden bg-background text-foreground">
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
          <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-10">
          <article className="min-w-0 space-y-4 lg:col-span-7" aria-label={`Question ${index + 1}`}>
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <header className="space-y-4 border-b border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>QUESTION {String(index + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}</Badge>
                  <Badge variant="outline">{question.questionType ?? "Question"}</Badge>
                  {question.difficulty ? <Badge variant="outline">{question.difficulty}</Badge> : null}
                  <Badge variant="outline">{pointsLabel(question.maxScore)}</Badge>
                </div>
                <Button type="button" variant={flags[question.questionId] ? "secondary" : "outline"} onClick={() => setFlags((current) => ({ ...current, [question.questionId]: !current[question.questionId] }))}>
                  {flags[question.questionId] ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
                  {flags[question.questionId] ? "Flagged (F)" : "Flag for review (F)"}
                </Button>
              </div>
              <div className="space-y-2">
                <h3 className="whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed">{question.content ?? "Question content unavailable"}</h3>
                <p className="text-sm text-muted-foreground">Accessibility hint: use number keys to choose the corresponding answer.</p>
              </div>
            </header>
            <div className="space-y-4 p-5">
              <QuestionSequenceAudio questionId={question.questionId} optionIds={question.options.map((option) => option.optionId)} />

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
                        <div className={`group flex min-h-[52px] items-start gap-3.5 rounded-xl border p-4 transition-all ${revealed ? "border-success-border bg-success/40 text-success-foreground" : selected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs" : "border-border/70 bg-card hover:border-border hover:bg-secondary/40"}`}>
                          {control}
                          <Label htmlFor={`paper-preview-${option.optionId}`} className="min-w-0 flex-1 cursor-pointer text-base leading-relaxed">
                            <span className="flex items-start gap-3">
                            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50 text-foreground"}`}>{position + 1}</span>
                            <span className="min-w-0 flex-1 break-words pt-1">
                              {option.content ?? "Answer option"}
                              {revealed ? <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-success-foreground"><CheckCircle2 aria-hidden className="size-4" />Correct answer</span> : null}
                            </span>
                            </span>
                          </Label>
                        </div>
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
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">Answers given here are not saved or scored.</p>
            </div>
            </section>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
              <Button type="button" variant="outline" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><ChevronLeft aria-hidden />Previous (P)</Button>
              <span aria-live="polite" className="hidden text-sm text-muted-foreground sm:block">Preview only · answers are not saved</span>
              <Button type="button" disabled={index >= questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>Next (N)<ChevronRight aria-hidden /></Button>
            </div>
          </article>

          <div role="region" aria-label="Question navigation" className="lg:col-span-3">
            <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Question map</h3><Badge variant="outline">Answered: {questions.filter(answered).length}/{questions.length}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">Select a number or use P / N to navigate.</p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {questions.map((item, position) => {
                  const current = position === index;
                  return <button key={item.questionId} type="button" aria-current={current ? "true" : undefined} aria-label={`Question ${position + 1} of ${questions.length}${current ? ", current question" : ""}${answered(item) ? ", answered" : ""}${flags[item.questionId] ? ", flagged" : ""}`} onClick={() => setIndex(position)} className={`relative flex h-11 w-full items-center justify-center rounded-lg border font-mono text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${current ? "border-2 border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : answered(item) ? "border-success-border bg-success-border text-primary-foreground" : "border-border bg-card hover:bg-secondary/60"}`}>
                    {String(position + 1).padStart(2, "0")}
                    {flags[item.questionId] ? <Bookmark aria-hidden className="absolute -right-1 -top-1 size-4 fill-current" /> : null}
                  </button>;
                })}
              </div>
              <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-2 border-t border-border/60 pt-4 text-sm font-medium"><Checkbox checked={showCorrect} onCheckedChange={(value) => setShowCorrect(value === true)} /><Eye aria-hidden className="size-4 text-muted-foreground" />Show correct answers</label>
              <div className="mt-3 border-t border-border/60 pt-3 text-sm"><p className="text-muted-foreground">Completion</p><p className="mt-1 font-mono font-semibold">{questions.filter(answered).length} / {questions.length} questions</p></div>
            </section>
          </div>
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-5 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Keyboard aria-hidden className="size-4 text-primary" />Keyboard shortcuts:</span>
            {['Space: Play audio', '1–4: Choose answer', 'P: Previous', 'N: Next', 'F: Flag'].map((shortcut) => <kbd key={shortcut} className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">{shortcut}</kbd>)}
          </footer>
        </>
      )}
    </section>
  );
}

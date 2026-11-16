import { useState, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { Label } from "@/shared/ui/primitives/label";
import type { QuestionDraft } from "@/features/lecturer/questions/model";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
export function QuestionPreview({
  draft,
  image,
  audio,
  compact = false,
}: {
  draft: QuestionDraft;
  image: string;
  /** Optional players for a saved question: one under the question text, one under each answer. */
  audio?: { question?: ReactNode; option?: (index: number) => ReactNode };
  /** Inside a dialog that already says what it is: leaves out the "Student experience" and "Preview mode" labels. */
  compact?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([]);
  const [flagged, setFlagged] = useState(false);
  const warnings = [
    !draft.content.trim() ? "Question content is empty." : "",
    draft.type === "diagram" && image && !draft.alt.trim()
      ? "Diagram alternative text is missing."
      : "",
    (draft.type === "single" || draft.type === "multiple") &&
    draft.options.some((option) => !option.text.trim())
      ? "One or more answer options are empty."
      : "",
  ].filter(Boolean);
  let formula = "";
  let formulaError = "";
  if (draft.type === "math" && draft.format === "LaTeX" && draft.formula) {
    try {
      formula = katex.renderToString(draft.formula, {
        throwOnError: true,
        trust: false,
        output: "htmlAndMathml",
        maxExpand: 100,
      });
    } catch {
      formulaError = "Unable to render this formula. Check the LaTeX syntax.";
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Monitor aria-hidden className="size-5 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Live review
        </h2>
        {compact ? null : <Badge variant="outline" className="ml-auto">Student experience</Badge>}
      </div>
      <div className={`rounded-lg border px-4 py-3 text-sm ${warnings.length ? "border-warning-foreground/40 bg-warning text-warning-foreground" : "border-success-border bg-success text-success-foreground"}`}>
        <p className="font-bold">Accessibility check: {warnings.length ? `${warnings.length} issue${warnings.length > 1 ? "s" : ""}` : "Ready"}</p>
        {warnings.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="mt-1 text-xs">Question content and answer controls have a readable order.</p>}
      </div>
      <Card className="h-fit min-w-0 gap-0 overflow-hidden rounded-xl bg-background py-0 shadow-none ring-1 ring-border">
        <CardHeader className="sr-only">
          <CardTitle>Live student preview</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-card px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">
              {draft.course || "Course assessment"}
            </p>
            <p className="text-xs text-muted-foreground">Student question view</p>
          </div>
          {compact ? null : <Badge variant="outline" className="ml-auto">Preview mode</Badge>}
        </div>

        <div className="min-w-0">
          <nav
            aria-label="Preview question list"
            className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-card px-4 py-3"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              Question map
            </p>
            <button
              type="button"
              aria-current="true"
              aria-label={`Question 1 of 1, current question${answer || multipleAnswers.length ? ", answered" : ", unanswered"}${flagged ? ", flagged" : ""}`}
              className="relative flex min-h-[52px] min-w-[52px] items-center justify-center rounded-md border-2 border-primary bg-primary/10 text-lg font-bold text-primary outline-2 outline-primary outline-offset-2"
            >
              1
              {(answer || multipleAnswers.length > 0) && (
                <Check aria-hidden className="absolute right-1 top-1 size-4" strokeWidth={3} />
              )}
              {flagged && (
                <Bookmark aria-hidden className="absolute bottom-1 left-1 size-3.5 fill-current" />
              )}
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-3 border-l border-border/60 pl-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-4 rounded border-2 border-primary bg-primary/20" />
                Current
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded bg-success-border text-primary-foreground">
                  <Check aria-hidden className="size-3" />
                </span>
                Answered
              </div>
            </div>
          </nav>

          <CardContent className="m-3 gap-5 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 sm:m-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-foreground">Question 1 of 1</h3>
                <Badge className="mt-2">QUESTION 01 / 1</Badge>
              </div>
              <Button
                type="button"
                variant={flagged ? "secondary" : "outline"}
                aria-pressed={flagged}
                onClick={() => setFlagged((value) => !value)}
              >
                {flagged ? <BookmarkCheck aria-hidden className="text-warning-foreground" /> : <Bookmark aria-hidden />}
                {flagged ? "Flagged" : "Flag question"}
              </Button>
            </div>

            <div className="border-t border-border/70 pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-sm font-medium text-muted-foreground">
                  {draft.points || "0"} {Number(draft.points) === 1 ? "point" : "points"}
                </span>
                <span className="text-sm text-muted-foreground">
                  Keyboard: press 1–4 to choose an answer
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed text-foreground">
                {draft.content || "Your question content will appear here."}
              </p>
              {audio?.question}
            </div>
          {(draft.type === "single" || draft.type === "multiple") && (
            <div>
              <p className="mb-3 text-sm font-semibold text-muted-foreground">
                {draft.type === "single" ? "Select one answer." : "Select all answers that apply."}
              </p>
              {draft.type === "single" ? (
                <RadioGroup
                  aria-label="Answer options"
                  value={answer}
                  onValueChange={setAnswer}
                  className="gap-2"
                >
                  {draft.options.map((o, i) => (
                    <div key={i}>
                    <div
                      className={`group flex min-h-[60px] items-start gap-3.5 rounded-xl border p-4 transition-colors ${answer === String(i) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 bg-card hover:border-border hover:bg-secondary/40"}`}
                    >
                      <RadioGroupItem id={`preview-option-${i}`} value={String(i)} className="sr-only" />
                      <Label htmlFor={`preview-option-${i}`} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${answer === String(i) ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50 text-foreground"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0 flex-1 break-words pt-1 text-base leading-relaxed">
                          {o.text || "Answer option"}
                          {answer === String(i) && <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 aria-hidden className="size-4" />Selected answer</span>}
                          {o.description && <span className="mt-1 block text-sm font-normal text-muted-foreground">{o.description}</span>}
                        </span>
                        <span className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border ${answer === String(i) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                          {answer === String(i) && <Check aria-hidden className="size-3 stroke-[3]" />}
                        </span>
                      </Label>
                    </div>
                    {audio?.option?.(i)}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2" role="group" aria-label="Answer options">
                  {draft.options.map((o, i) => {
                    const optionId = String(i);
                    return (
                      <div key={i}>
                      <div className={`flex min-h-[60px] items-start gap-3.5 rounded-xl border p-4 transition-colors ${multipleAnswers.includes(optionId) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 bg-card hover:bg-secondary/40"}`}>
                        <Checkbox
                          id={`preview-multiple-${i}`}
                          checked={multipleAnswers.includes(optionId)}
                          onCheckedChange={(checked) => setMultipleAnswers((current) => checked
                            ? [...current, optionId]
                            : current.filter((value) => value !== optionId))}
                          className="mt-1"
                        />
                        <Label htmlFor={`preview-multiple-${i}`} className="min-w-0 cursor-pointer break-words text-base leading-relaxed">
                          <span className="font-bold">{String.fromCharCode(65 + i)}.</span>{" "}
                          {o.text || "Answer option"}
                          {multipleAnswers.includes(optionId) && <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 aria-hidden className="size-4" />Selected answer</span>}
                          {o.description && <span className="mt-1 block text-sm font-normal text-muted-foreground">{o.description}</span>}
                        </Label>
                      </div>
                      {audio?.option?.(i)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {draft.type === "essay" && (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">
                {draft.instructions || "Answer instructions will appear here."}
              </p>
              <Label htmlFor="preview-essay">Your response</Label>
              <Textarea
                id="preview-essay"
                placeholder="Write your answer…"
                className="min-h-40"
              />
            </div>
          )}
          {draft.type === "code" && (
            <div className="space-y-3">
              <Badge variant="outline">{draft.language}</Badge>
              <pre className="overflow-auto rounded-lg border border-border p-4 text-sm">
                <code>{draft.starterCode || "// Starter code"}</code>
              </pre>
              <p className="text-sm font-bold">Expected output</p>
              <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">
                {draft.expectedOutput || "Expected output will appear here."}
              </pre>
              <p className="text-xs text-muted-foreground">
                Code execution is not available in the preview.
              </p>
            </div>
          )}
          {draft.type === "math" && (
            <div className="space-y-3">
              {draft.format === "MathML" ? (
                <pre className="overflow-auto rounded-lg border border-border p-4 text-sm">
                  <code>{draft.formula || "MathML source"}</code>
                </pre>
              ) : (
                <div
                  className="overflow-x-auto py-4"
                  dangerouslySetInnerHTML={{ __html: formula }}
                />
              )}
              {formulaError && (
                <p role="status" className="text-sm text-destructive">
                  {formulaError}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">
                {draft.description || "Text description will appear here."}
              </p>
            </div>
          )}
          {draft.type === "diagram" && (
            <div className="space-y-4">
              {image ? (
                <img
                  src={image}
                  alt={draft.alt}
                  className="max-h-80 w-full object-contain"
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Upload a diagram to preview it here.
                </div>
              )}
              <p
                id="diagram-transcript"
                className="whitespace-pre-wrap text-sm"
              >
                {draft.description}
              </p>
            </div>
          )}
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              This is an interactive student preview. Answers and flags are not submitted or scored.
            </p>
          </CardContent>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/80 bg-card px-5 py-3 shadow-xs">
          <Button type="button" size="lg" variant="secondary" disabled>
            <ChevronLeft aria-hidden />
            Previous
          </Button>
          <Button type="button" size="lg" variant="secondary" disabled>
            Next
            <ChevronRight aria-hidden />
          </Button>
          <span aria-live="polite" className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="size-2 rounded-full bg-success-border" />
            {answer || multipleAnswers.length > 0
              ? "Answer saved in this preview"
              : "Preview answers stay on this page"}
          </span>
        </div>
      </Card>
    </div>
  );
}

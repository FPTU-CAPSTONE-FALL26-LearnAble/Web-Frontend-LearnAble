import { useState, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Bookmark, BookmarkCheck, Check, CheckCircle2, ChevronLeft, ChevronRight, Keyboard, Monitor } from "lucide-react";
import type { QuestionDraft } from "@/features/lecturer/questions/model";
import { questionWarnings, type PreviewImage } from "@/features/lecturer/questions/components/accessibilityReview";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { Textarea } from "@/shared/ui/primitives/textarea";

export function QuestionPreview({ draft, image, images = [], audio, compact = false, reviewUnavailable = false }: {
  draft: QuestionDraft;
  image: string;
  images?: PreviewImage[];
  audio?: { question?: ReactNode; option?: (index: number) => ReactNode };
  compact?: boolean;
  reviewUnavailable?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([]);
  const [flagged, setFlagged] = useState(false);
  const answered = Boolean(answer || multipleAnswers.length);
  const warnings = [...questionWarnings(draft, images), ...(reviewUnavailable ? ["Question images could not be checked."] : [])];

  let formula = "";
  let formulaError = "";
  if (draft.type === "math" && draft.format === "LaTeX" && draft.formula) {
    try {
      formula = katex.renderToString(draft.formula, { throwOnError: true, trust: false, output: "htmlAndMathml", maxExpand: 100 });
    } catch {
      formulaError = "Unable to render this formula. Check the LaTeX syntax.";
    }
  }

  const answerContent = (() => {
    if (draft.type === "single") {
      return <>
        {audio?.question}
        <div aria-label="Answer options" role="radiogroup" className="space-y-3">
          {draft.options.map((option, index) => {
            const optionId = String(index);
            const selected = answer === optionId;
            return <button
              key={optionId}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAnswer(optionId)}
              className={`group flex min-h-[52px] w-full cursor-pointer items-start gap-3.5 rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${selected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs" : "border-border/70 bg-card hover:border-border hover:bg-secondary/40"}`}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50 text-foreground group-hover:border-primary/60 group-hover:text-primary"}`}>{index + 1}</span>
              <span className="min-w-0 flex-1 pt-0.5 text-base leading-relaxed">
                <span className={selected ? "font-semibold" : "font-normal"}>{option.text || "Answer option"}</span>
                {selected ? <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 aria-hidden className="size-4" />Selected answer</span> : null}
              </span>
              <span className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{selected ? <Check aria-hidden className="size-3 stroke-[3]" /> : null}</span>
            </button>;
          })}
        </div>
      </>;
    }
    if (draft.type === "multiple") {
      return <>
        {audio?.question}
        <p className="font-semibold text-foreground">Select all answers that apply.</p>
        <div className="space-y-3" role="group" aria-label="Answer options">
          {draft.options.map((option, index) => {
            const optionId = String(index);
            const selected = multipleAnswers.includes(optionId);
            return <div key={optionId}>
              <div className={`flex min-h-[52px] items-start gap-3.5 rounded-xl border p-4 ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 bg-card hover:bg-secondary/40"}`}>
                <Checkbox
                  id={`preview-multiple-${index}`}
                  checked={multipleAnswers.includes(optionId)}
                  onCheckedChange={(checked) => setMultipleAnswers((current) => checked ? [...current, optionId] : current.filter((value) => value !== optionId))}
                  className="mt-1.5"
                />
                <Label htmlFor={`preview-multiple-${index}`} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5 text-base leading-relaxed">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50"}`}>{index + 1}</span>
                  <span className="pt-1">{option.text || "Answer option"}</span>
                </Label>
              </div>
              {audio?.option?.(index)}
            </div>;
          })}
        </div>
      </>;
    }
    if (draft.type === "essay") {
      return <div className="space-y-3">
        {audio?.question}
        <p className="whitespace-pre-wrap">{draft.instructions || "Answer instructions will appear here."}</p>
        <Label htmlFor="preview-essay">Your response</Label>
        <Textarea id="preview-essay" placeholder="Write your answer…" className="min-h-40" />
      </div>;
    }
    if (draft.type === "code") {
      return <div className="space-y-3">
        {audio?.question}<Badge variant="outline">{draft.language}</Badge>
        <div className="space-y-2">
          <p className="font-bold">Constraints</p>
          <p className="whitespace-pre-wrap">{draft.constraints || "Constraints will appear here."}</p>
        </div>
        <div className="space-y-2">
          <p className="font-bold">Starter code</p>
          <pre className="overflow-auto rounded-lg border border-border p-4 text-sm"><code>{draft.starterCode || "// Starter code"}</code></pre>
        </div>
        <div className="space-y-2">
          <p className="font-bold">Sample input</p>
          <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">{draft.testInput || "Sample input will appear here."}</pre>
          <p className="font-bold">Expected output</p>
          <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">{draft.expectedOutput || "Expected output will appear here."}</pre>
        </div>
      </div>;
    }
    if (draft.type === "math") {
      return <div className="space-y-3">
        {audio?.question}
        {draft.format === "MathML"
          ? <pre className="overflow-auto rounded-lg border border-border p-4 text-sm"><code>{draft.formula || "MathML source"}</code></pre>
          : <div className="overflow-x-auto py-4" dangerouslySetInnerHTML={{ __html: formula }} />}
        {formulaError ? <p role="status" className="text-sm text-destructive">{formulaError}</p> : null}
        <p className="whitespace-pre-wrap">{draft.description || "Text description will appear here."}</p>
      </div>;
    }
    if (draft.type !== "diagram") return null;
    return <div className="space-y-4">
      {audio?.question}
      {image
        ? <img src={image} alt={draft.alt} className="max-h-80 w-full object-contain" />
        : <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">Upload a diagram to preview it here.</div>}
      <p className="whitespace-pre-wrap">{draft.description}</p>
    </div>;
  })();

  return <div data-contrast="yellow" className="space-y-6 rounded-xl bg-background p-4 text-foreground">
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <Monitor aria-hidden className="size-5 text-primary" />
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Live review</h2>
    </div>

    <div className={`rounded-lg border px-4 py-3 text-sm ${warnings.length ? "border-warning-foreground/40 bg-warning text-warning-foreground" : "border-success-border bg-success text-success-foreground"}`}>
      <p className="font-bold">Accessibility check: {warnings.length ? `${warnings.length} issue${warnings.length > 1 ? "s" : ""}` : "Ready"}</p>
      {warnings.length
        ? <ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        : <p className="mt-1 text-xs">Question content and answer controls have a readable order.</p>}
    </div>

    <section aria-label="Student exam preview" className="overflow-hidden rounded-xl border border-border bg-background">
      <header className="border-b border-border/80 bg-background px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">{draft.course || "Course assessment"}</h3>
            <p className="font-mono text-sm text-muted-foreground">Secure student exam preview</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Question 01 / 01</Badge>
            {compact ? null : <Badge variant="outline">Preview mode</Badge>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-10">
        <section aria-labelledby="preview-question-heading" className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Badge>QUESTION 01 / 01</Badge>
                  <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-sm font-medium text-muted-foreground">
                    {draft.points || "0"} {Number(draft.points) === 1 ? "point" : "points"}
                  </span>
                </div>
                <Button type="button" variant={flagged ? "secondary" : "outline"} onClick={() => setFlagged((value) => !value)} aria-label="Flag this question for review">
                  {flagged ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
                  {flagged ? "Flagged (F)" : "Flag for review (F)"}
                </Button>
              </div>
              <div className="space-y-2 pt-1">
                <CardTitle id="preview-question-heading">{draft.content || "Your question content will appear here."}</CardTitle>
                <CardDescription>{draft.type === "single" || draft.type === "multiple" ? "Accessibility hint: use number keys 1–4 to choose the corresponding answer." : "Use Tab to move through the question and answer fields."}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.map((item, index) => <figure key={item.imageId} className="space-y-2">
                {item.url ? <img src={item.url} alt={item.description?.trim() || ""} className="max-h-80 w-full object-contain" /> : <p role="status">Image {index + 1} preview is unavailable.</p>}
                <figcaption className="text-sm text-muted-foreground">Image {index + 1}: {item.description?.trim() || "Accessible description missing"}</figcaption>
              </figure>)}
              {answerContent}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
            <Button type="button" variant="outline" disabled><ChevronLeft aria-hidden />Previous (P)</Button>
            <p aria-live="polite" className="hidden text-sm text-muted-foreground sm:block">Preview only · answers are not saved</p>
            <Button type="button" disabled>Next (N)<ChevronRight aria-hidden /></Button>
          </div>
        </section>

        <div role="region" aria-label="Question navigation" className="lg:col-span-3">
          <Card>
            <CardContent className="space-y-4">
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground">Question map</h4>
                  <Badge variant="outline">Answered: {answered ? 1 : 0}/1</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Select a number or use P / N to navigate.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-secondary/40 p-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><span className="size-4 rounded border-2 border-primary bg-primary/20" />Current</span>
                <span className="flex items-center gap-2"><span className={`flex size-4 items-center justify-center rounded ${answered ? "bg-success-border text-primary-foreground" : "border border-border bg-card"}`}>{answered ? <Check aria-hidden className="size-3" /> : null}</span>{answered ? "Answered" : "Unanswered"}</span>
              </div>
              <button
                type="button"
                aria-current="true"
                aria-label={`Question 1, ${answered ? "answered" : "unanswered"}${flagged ? ", flagged" : ""}`}
                className="relative flex h-11 w-14 items-center justify-center rounded-lg border-2 border-primary bg-primary/10 font-mono text-sm font-bold text-primary ring-2 ring-primary/30 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              >
                01
                {flagged ? <Bookmark aria-hidden className="absolute -right-1 -top-1 size-4 fill-current" /> : null}
              </button>
              <div className="border-t border-border/60 pt-3">
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="mt-1 font-mono font-semibold text-foreground">{answered ? "1 / 1 question (100%)" : "0 / 1 question (0%)"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="border-t border-border/80 bg-background px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Keyboard aria-hidden className="size-4 text-primary" />Keyboard shortcuts:</span>
          {['Space: Play audio', '1–4: Choose answer', 'P: Previous', 'N: Next', 'F: Flag'].map((shortcut) => <kbd key={shortcut} className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">{shortcut}</kbd>)}
        </div>
      </footer>
    </section>
  </div>;
}

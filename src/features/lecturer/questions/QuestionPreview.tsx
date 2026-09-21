import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { Label } from "@/shared/ui/primitives/label";
import type { QuestionDraft } from "./model";
import { Monitor } from "lucide-react";
export function QuestionPreview({
  draft,
  image,
}: {
  draft: QuestionDraft;
  image: string;
}) {
  const [answer, setAnswer] = useState("");
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
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
        <Monitor aria-hidden className="size-5 text-secondary" />
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Live review
        </h2>
      </div>
      <Card className="h-fit min-w-0 rounded-2xl border border-[var(--color-border-subtle)] shadow-sm ring-0">
        <CardHeader className="sr-only">
          <CardTitle>Live student preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
            <Badge className="bg-[var(--color-action)] text-[var(--color-action-text)]">
              {draft.course} · New question
            </Badge>
            <span className="text-sm font-bold">
              {draft.points || "0"} points
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-lg font-bold leading-snug tracking-tight">
            {draft.content || "Your question content will appear here."}
          </p>
          {(draft.type === "single" || draft.type === "multiple") && (
            <div className="space-y-3">
              {draft.type === "single" ? (
                <RadioGroup
                  aria-label="Preview answer"
                  value={answer}
                  onValueChange={setAnswer}
                >
                  {draft.options.map((o, i) => (
                    <Label
                      key={i}
                      className={`flex min-h-14 items-start gap-3 rounded-xl border p-3 ${answer === String(i) ? "border-secondary text-secondary ring-1 ring-secondary" : "border-[var(--color-border-subtle)]"}`}
                    >
                      <RadioGroupItem value={String(i)} className="mt-1" />
                      <span className="min-w-0 break-words">
                        <span className="font-bold">
                          {String.fromCharCode(65 + i)}.
                        </span>{" "}
                        {o.text || "Answer option"}
                        {answer === String(i) && (
                          <span className="ml-2 text-xs font-bold">
                            Selected
                          </span>
                        )}
                        {o.description && (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {o.description}
                          </span>
                        )}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                draft.options.map((o, i) => (
                  <Label
                    key={i}
                    className="flex min-h-14 items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] p-4"
                  >
                    <Checkbox aria-label={`Preview answer ${i + 1}`} />
                    <span className="min-w-0 break-words">
                      {String.fromCharCode(65 + i)}. {o.text || "Answer option"}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {o.description}
                      </span>
                    </span>
                  </Label>
                ))
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
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer py-3 font-semibold">
                  Author rubric
                </summary>
                <p className="whitespace-pre-wrap">
                  {draft.rubric || "No rubric entered."}
                </p>
              </details>
            </div>
          )}
          {draft.type === "code" && (
            <div className="space-y-3">
              <Badge variant="outline">{draft.language}</Badge>
              <pre className="overflow-auto rounded-lg border border-[var(--color-border-subtle)] p-4 text-sm">
                <code>{draft.starterCode || "// Starter code"}</code>
              </pre>
              <p className="text-sm font-bold">Expected output</p>
              <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">
                {draft.expectedOutput || "Expected output will appear here."}
              </pre>
              <p className="text-xs text-muted-foreground">
                Code execution is not connected.
              </p>
            </div>
          )}
          {draft.type === "math" && (
            <div className="space-y-3">
              {draft.format === "MathML" ? (
                <pre className="overflow-auto rounded-lg border border-[var(--color-border-subtle)] p-4 text-sm">
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
          <p className="border-t border-[var(--color-border-subtle)] pt-4 text-xs text-muted-foreground">
            Preview answers are not submitted or scored.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

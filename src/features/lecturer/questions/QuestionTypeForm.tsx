import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { ChoiceField, TextField } from "./QuestionFields";
import type { QuestionDraft } from "./model";
import { Trash2 } from "lucide-react";
export function QuestionTypeForm({
  draft,
  onChange,
  onFile,
}: {
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
  onFile: (kind: "image" | "audio", file?: File) => void;
}) {
  if (draft.type === "single" || draft.type === "multiple") {
    const options = draft.options.map((option, i) => (
      <div
        key={i}
        className={`space-y-2 rounded-xl border p-4 ${option.correct ? "border-success-foreground/50" : "border-border"}`}
      >
        <div className="flex items-center justify-between">
          <p className="flex size-7 items-center justify-center rounded-lg border border-border text-xs font-bold">
            {String.fromCharCode(65 + i)}
          </p>
          <Label className="flex min-h-11 items-center gap-2">
            {draft.type === "single" ? (
              <RadioGroupItem
                value={String(i)}
                aria-label={`Option ${i + 1} is correct`}
              />
            ) : (
              <Checkbox
                checked={option.correct}
                onCheckedChange={(checked) =>
                  onChange({
                    ...draft,
                    options: draft.options.map((o, index) =>
                      index === i ? { ...o, correct: checked === true } : o,
                    ),
                  })
                }
              />
            )}
            Correct answer
          </Label>
          {draft.options.length > 2 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove option ${i + 1}`}
              onClick={() =>
                onChange({
                  ...draft,
                  options: draft.options.filter((_, index) => index !== i),
                })
              }
            >
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
        <TextField
          label={`Answer ${i + 1}`}
          value={option.text}
          onChange={(text) =>
            onChange({
              ...draft,
              options: draft.options.map((o, index) =>
                index === i ? { ...o, text } : o,
              ),
            })
          }
        />
      </div>
    ));
    return (
      <section className="space-y-4">
        <h3 className="font-bold">Answer options</h3>
        {draft.type === "single" ? (
          <RadioGroup
            aria-label="Correct answer"
            value={String(draft.options.findIndex((o) => o.correct))}
            onValueChange={(value) =>
              onChange({
                ...draft,
                options: draft.options.map((o, i) => ({
                  ...o,
                  correct: i === Number(value),
                })),
              })
            }
            className="space-y-3"
          >
            {options}
          </RadioGroup>
        ) : (
          options
        )}
        <Button
          variant="outline"
          disabled={draft.options.length >= 8}
          onClick={() =>
            onChange({
              ...draft,
              options: [
                ...draft.options,
                { text: "", description: "", correct: false },
              ],
            })
          }
        >
          Add answer option
        </Button>
      </section>
    );
  }
  if (draft.type === "essay")
    return (
      <div className="space-y-4">
        <TextField
          label="Answer instructions"
          multiline
          value={draft.instructions}
          onChange={(instructions) => onChange({ ...draft, instructions })}
        />
        <TextField
          label="Assessment rubric"
          multiline
          value={draft.rubric}
          onChange={(rubric) => onChange({ ...draft, rubric })}
        />
      </div>
    );
  if (draft.type === "code")
    return (
      <div className="space-y-4">
        <ChoiceField
          label="Programming language"
          value={draft.language}
          options={["C#", "Java", "JavaScript", "Python", "C++"]}
          onChange={(language) => onChange({ ...draft, language })}
        />
        <TextField
          label="Starter code"
          multiline
          value={draft.starterCode}
          onChange={(starterCode) => onChange({ ...draft, starterCode })}
        />
        <TextField
          label="Expected output"
          multiline
          value={draft.expectedOutput}
          onChange={(expectedOutput) => onChange({ ...draft, expectedOutput })}
        />
      </div>
    );
  if (draft.type === "math")
    return (
      <div className="space-y-4">
        <ChoiceField
          label="Formula format"
          value={draft.format}
          options={["LaTeX", "MathML"]}
          onChange={(format) =>
            onChange({ ...draft, format: format as "LaTeX" | "MathML" })
          }
        />
        <TextField
          label="Formula source"
          multiline
          value={draft.formula}
          onChange={(formula) => onChange({ ...draft, formula })}
        />
        <TextField
          label="Formula text description"
          multiline
          value={draft.description}
          onChange={(description) => onChange({ ...draft, description })}
        />
        <p className="text-xs text-muted-foreground">
          LaTeX is rendered locally. MathML is shown as source only.
        </p>
      </div>
    );
  if (draft.type === "diagram")
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="diagram-file">Diagram image</Label>
          <Input
            id="diagram-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onFile("image", e.target.files?.[0])}
          />
        </div>
        <TextField
          label="Image alt text"
          value={draft.alt}
          onChange={(alt) => onChange({ ...draft, alt })}
        />
        <TextField
          label="Diagram long description"
          multiline
          value={draft.description}
          onChange={(description) => onChange({ ...draft, description })}
        />
        <p className="text-xs text-muted-foreground">
          The image stays in this session only. Select it again after reloading.
        </p>
      </div>
    );
  return null;
}

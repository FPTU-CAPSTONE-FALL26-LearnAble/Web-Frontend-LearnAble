import { Bookmark, CircleHelp, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/ui/primitives/radio-group";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface TrueFalseQuestionProps {
  /** 1-based question number displayed within the question area. */
  questionNumber: number;
  questionCount: number;
  title: string;
  stem: string;
  value: string | null;
  onValueChange: (value: string) => void;
  onReset: () => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  className?: string;
}

export function TrueFalseQuestion({
  questionNumber,
  questionCount,
  title,
  stem,
  value,
  onValueChange,
  onReset,
  flagged = false,
  onToggleFlag,
  className,
}: TrueFalseQuestionProps) {
  const strings = vi.exam.player;
  return (
    <section
      aria-labelledby="question-heading"
      className={cn(
        "rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8",
        className,
      )}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {strings.questionOf(questionNumber, questionCount)}
          </p>
          <h2
            id="question-heading"
            className="mt-1 text-balance text-2xl font-medium"
          >
            {title}
          </h2>
        </div>
        {onToggleFlag ? (
          <Button
            variant={flagged ? "secondary" : "outline"}
            size="icon-xl"
            aria-label={flagged ? strings.unflagQuestion : strings.flagQuestion}
            aria-pressed={flagged}
            onClick={onToggleFlag}
          >
            <Bookmark
              aria-hidden
              className={cn("size-5", flagged && "fill-current")}
            />
          </Button>
        ) : null}
      </div>
      <p className="mb-8 max-w-3xl text-pretty text-lg leading-8">{stem}</p>
      <RadioGroup
        value={value ?? ""}
        onValueChange={onValueChange}
        aria-label={vi.exam.selectOneAlternative}
        className="grid gap-3 sm:grid-cols-2"
      >
        {[strings.true, strings.false].map((option) => (
          <Label
            key={option}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-base transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
          >
            <RadioGroupItem value={option} />
            {option}
          </Label>
        ))}
      </RadioGroup>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button variant="ghost" size="xl" onClick={onReset}>
          <RotateCcw aria-hidden />
          {strings.resetResponse}
        </Button>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleHelp aria-hidden className="size-4" /> {strings.savedAsYouWork}
        </p>
      </div>
    </section>
  );
}

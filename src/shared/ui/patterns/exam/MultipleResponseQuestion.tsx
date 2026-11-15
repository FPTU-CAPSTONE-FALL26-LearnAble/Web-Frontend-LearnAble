import { type ReactNode } from "react";
import { Bookmark } from "lucide-react";
import { announce } from "@/shared/a11y/announcer";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface MultipleResponseOption {
  id: string;
  text: string;
  disabled?: boolean;
}

export interface MultipleResponseQuestionProps {
  /** 1-based question number displayed within the question area. */
  questionNumber: number;
  /** Total questions in the assessment; renders "Question X of Y" when provided. */
  questionCount?: number;
  stem: string;
  stemLang?: string;
  image?: { src: string; alt: string };
  /** `inline` keeps the image beside the stem; `above` gives it a full-width row. */
  imageLayout?: "inline" | "above";
  options: MultipleResponseOption[];
  selectedOptionIds: string[];
  onSelectionChange: (optionId: string, selected: boolean) => void;
  onReset: () => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  disabled?: boolean;
  supportingContent?: ReactNode;
  className?: string;
}

/**
 * The question-content pattern for automatically marked multiple-response items.
 * Navigation, save state, timing, and submission stay with the surrounding shell.
 */
export function MultipleResponseQuestion({
  questionNumber,
  questionCount,
  stem,
  stemLang,
  image,
  imageLayout = "inline",
  options,
  selectedOptionIds,
  onSelectionChange,
  onReset,
  flagged = false,
  onToggleFlag,
  disabled = false,
  className,
}: MultipleResponseQuestionProps) {
  const questionId = `multiple-response-question-${questionNumber}`;
  const hasSelection = selectedOptionIds.length > 0;

  return (
    <section
      aria-labelledby={questionId}
      className={cn("flex w-full flex-col gap-6", className)}
    >
      <p className="text-base font-medium text-muted-foreground">
        {questionCount
          ? vi.exam.player.questionOf(questionNumber, questionCount)
          : vi.exam.questionNumber(questionNumber)}
      </p>

      <div className="flex flex-col gap-6">
        {image && imageLayout === "above" ? (
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-80 w-full rounded object-cover"
          />
        ) : null}
        <div
          className={cn(
            "grid gap-6 sm:items-start",
            image &&
              imageLayout === "inline" &&
              "sm:grid-cols-[minmax(0,1fr)_10rem]",
          )}
        >
          <h2
            id={questionId}
            lang={stemLang}
            tabIndex={-1}
            className="text-lg font-medium leading-snug text-foreground"
          >
            {stem}
          </h2>
          {image && imageLayout === "inline" ? (
            <img
              src={image.src}
              alt={image.alt}
              className="h-50 w-full rounded object-cover sm:w-40"
            />
          ) : null}
        </div>

        <fieldset disabled={disabled} className="min-w-0">
          <legend className="mb-3 select-text text-base font-normal text-muted-foreground">
            {vi.exam.selectOneOrMore}
          </legend>
          <div className="flex flex-col gap-1">
            {options.map((option) => {
              const optionId = `${questionId}-option-${option.id}`;
              const selected = selectedOptionIds.includes(option.id);
              const optionDisabled = disabled || option.disabled === true;

              return (
                <Label
                  key={option.id}
                  htmlFor={optionId}
                  className={cn(
                    "relative flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded border p-4 transition-colors",
                    selected
                      ? "border-player-selected-border bg-player-accent-soft"
                      : "border-border bg-background",
                    !optionDisabled && !selected && "hover:bg-muted/50",
                    optionDisabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Checkbox
                    id={optionId}
                    checked={selected}
                    disabled={optionDisabled}
                    className={cn(
                      "size-[calc(1rem*var(--text-scale))] shrink-0",
                      selected &&
                        "data-checked:border-player-accent data-checked:bg-player-accent data-checked:text-player-accent-foreground",
                    )}
                    onCheckedChange={(checked) => {
                      const nextSelected = checked === true;
                      announce(
                        nextSelected
                          ? vi.announce.answerSelected(option.text)
                          : vi.announce.answerDeselected(option.text),
                      );
                      onSelectionChange(option.id, nextSelected);
                    }}
                  />
                  <p
                    className={cn(
                      "min-w-0 flex-1 select-text break-words text-base leading-snug text-foreground",
                      selected ? "font-medium" : "font-normal",
                    )}
                  >
                    {option.text}
                  </p>
                </Label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {onToggleFlag ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label={flagged ? vi.exam.unflagQuestion : vi.exam.flagQuestion}
            aria-pressed={flagged}
            className={cn(
              "h-auto min-h-10 max-h-none rounded px-[0.75em] py-[0.5em] text-base font-normal",
              flagged &&
                "border-player-flag-border bg-player-flag font-medium text-player-flag-foreground hover:bg-player-flag/80",
            )}
            onClick={onToggleFlag}
          >
            <Bookmark
              aria-hidden
              className={cn(
                "size-[calc(1rem*var(--text-scale))]",
                flagged && "fill-current",
              )}
            />
            <span>
              {flagged ? vi.exam.unflagQuestion : vi.exam.flagQuestion}
            </span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled || !hasSelection}
          className="h-auto min-h-10 max-h-none rounded px-[0.75em] py-[0.5em] text-base font-normal"
          onClick={() => {
            onReset();
            announce(vi.announce.answerCleared);
          }}
        >
          {vi.exam.resetAnswer}
        </Button>
      </div>
    </section>
  );
}

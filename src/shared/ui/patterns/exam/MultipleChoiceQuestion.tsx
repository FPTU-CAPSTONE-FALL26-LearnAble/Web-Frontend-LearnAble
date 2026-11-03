import { Bookmark } from "lucide-react";
import { announce } from "@/shared/a11y/announcer";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/ui/primitives/radio-group";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface MultipleChoiceOption {
  id: string;
  text: string;
  disabled?: boolean;
}

export interface MultipleChoiceQuestionProps {
  questionNumber: number;
  questionCount?: number;
  stem: string;
  stemLang?: string;
  image?: { src: string; alt: string };
  /** `inline` keeps the image beside the stem; `above` gives it a full-width row. */
  imageLayout?: "inline" | "above";
  options: MultipleChoiceOption[];
  value: string | null;
  onValueChange: (optionId: string) => void;
  onReset?: () => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The question-content pattern for automatically marked single-answer items.
 * Navigation, timing, and submission remain the responsibility of the shell.
 */
export function MultipleChoiceQuestion({
  questionNumber,
  questionCount,
  stem,
  stemLang,
  image,
  imageLayout = "inline",
  options,
  value,
  onValueChange,
  onReset,
  flagged = false,
  onToggleFlag,
  disabled = false,
  className,
}: MultipleChoiceQuestionProps) {
  const questionId = `multiple-choice-question-${questionNumber}`;
  const selectOption = (optionId: string) => {
    onValueChange(optionId);
  };

  return (
    <section
      className={cn(
        "mt-4 grid gap-y-6 sm:grid-cols-[minmax(6rem,max-content)_minmax(0,1fr)_3rem] sm:gap-x-4",
        className,
      )}
    >
      <p id={`${questionId}-position`} className="text-base font-semibold text-foreground sm:col-start-1">
        {questionCount ? `${vi.exam.questionPosition(questionNumber, questionCount)}.` : vi.exam.questionNumber(questionNumber)}
      </p>

      {onToggleFlag ? (
        <Button
          type="button"
          variant={flagged ? "secondary" : "ghost"}
          size="icon"
          aria-label={flagged ? vi.exam.unflagQuestion : vi.exam.flagQuestion}
          aria-pressed={flagged}
          className="justify-self-end sm:col-start-3 sm:row-start-1"
          onClick={onToggleFlag}
        >
          <Bookmark
            aria-hidden
            className={cn("size-5", flagged && "fill-current")}
          />
        </Button>
      ) : null}

      <div className="flex flex-col gap-6 sm:col-start-2">
        {image && imageLayout === "above" ? (
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-80 w-full object-cover"
          />
        ) : null}
        <div
          className={cn(
            "grid gap-6 sm:items-start",
            imageLayout === "inline" && "sm:grid-cols-[minmax(0,1fr)_10rem]",
          )}
        >
          <h2
            id={questionId}
            aria-labelledby={questionCount ? `${questionId}-position ${questionId}` : undefined}
            lang={stemLang}
            tabIndex={-1}
            className="text-base font-normal text-foreground"
          >
            {stem}
          </h2>
          {image && imageLayout === "inline" ? (
            <img
              src={image.src}
              alt={image.alt}
              className="h-50 w-full aspect-auto object-cover sm:w-40"
            />
          ) : null}
        </div>

        <fieldset disabled={disabled} className="min-w-0">
          <legend className="mb-3 select-text text-base font-semibold text-foreground">
            {vi.exam.selectOneAlternative}
          </legend>
          <RadioGroup
            aria-label={vi.exam.selectOneAlternative}
            value={value ?? ""}
            disabled={disabled}
            onValueChange={selectOption}
            onKeyDown={(event) => {
              // Radix defers arrow focus. A fast keyup can clear its selection
              // flag before focus arrives, so select on keydown and let Radix
              // keep owning focus, wrapping and scroll behavior.
              if (disabled || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
                || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const target = (event.target as HTMLElement).closest('[role="radio"]');
              const enabled = options.filter((option) => !option.disabled);
              const index = enabled.findIndex((option) => option.id === target?.getAttribute("value"));
              if (index < 0 || !enabled.length) return;
              const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
              const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
              const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1
                : (index + (forward ? 1 : -1) + enabled.length) % enabled.length;
              if (enabled[next].id !== value) selectOption(enabled[next].id);
            }}
            className="divide-y divide-border overflow-hidden rounded bg-card gap-0"
          >
            {options.map((option) => {
              const optionId = `${questionId}-option-${option.id}`;
              const selected = value === option.id;
              const optionDisabled = disabled || option.disabled === true;

              return (
                <div
                  key={option.id}
                  className={cn(
                    "flex min-h-12 items-center gap-3 bg-card px-4 transition-colors",
                    !optionDisabled && !selected && "hover:bg-muted",
                    selected && "bg-primary/15",
                  )}
                >
                  <RadioGroupItem
                    id={optionId}
                    lang={stemLang}
                    value={option.id}
                    disabled={optionDisabled}
                  />
                  <Label
                    htmlFor={optionId}
                    lang={stemLang}
                    className="min-h-11 flex-1 cursor-pointer"
                  >
                    <p className="select-text text-base font-normal leading-relaxed">
                      {option.text}
                    </p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </fieldset>
      </div>

      <div className="border-t border-border pt-2 sm:col-start-2">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || !onReset || value === null}
          className="-ml-2 font-normal text-base"
          onClick={() => {
            onReset?.();
            announce(vi.announce.answerCleared);
          }}
        >
          {vi.exam.resetAnswer}
        </Button>
      </div>
    </section>
  );
}

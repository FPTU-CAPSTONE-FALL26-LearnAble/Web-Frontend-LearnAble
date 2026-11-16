import { Bookmark } from "lucide-react";
import { announce } from "@/shared/a11y/announcer";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface MultipleChoiceOption {
  id: string;
  text: string;
  disabled?: boolean;
}

export interface MultipleChoiceQuestionProps {
  questionNumber: number;
  /** Total questions in the assessment; renders "Question X of Y" when provided. */
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

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

  return (
    <section
      className={cn("flex w-full flex-col gap-6", className)}
    >
      <p
        id={`${questionId}-position`}
        className="text-base font-medium uppercase text-muted-foreground"
      >
        {questionCount
          ? `${vi.exam.questionPosition(questionNumber, questionCount)}.`
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
            aria-labelledby={
              questionCount ? `${questionId}-position ${questionId}` : undefined
            }
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
            {vi.exam.selectOneAlternative}
          </legend>
          <RadioGroup
            aria-label={vi.exam.selectOneAlternative}
            value={value ?? ""}
            disabled={disabled}
            onValueChange={onValueChange}
            onKeyDown={(event) => {
              // Radix defers arrow focus. A fast keyup can clear its selection
              // flag before focus arrives, so select on keydown and let Radix
              // keep owning focus, wrapping and scroll behavior.
              if (
                disabled ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                ![
                  "ArrowUp",
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ].includes(event.key)
              )
                return;
              const target = (event.target as HTMLElement).closest(
                '[role="radio"]',
              );
              const enabled = options.filter((option) => !option.disabled);
              const index = enabled.findIndex(
                (option) => option.id === target?.getAttribute("value"),
              );
              if (index < 0 || !enabled.length) return;
              const rtl =
                getComputedStyle(event.currentTarget).direction === "rtl";
              const forward =
                event.key === "ArrowDown" ||
                event.key === (rtl ? "ArrowLeft" : "ArrowRight");
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? enabled.length - 1
                    : (index + (forward ? 1 : -1) + enabled.length) %
                      enabled.length;
              if (enabled[next].id !== value) onValueChange(enabled[next].id);
            }}
            className="flex flex-col gap-1"
          >
            {options.map((option, index) => {
              const optionId = `${questionId}-option-${option.id}`;
              const selected = value === option.id;
              const optionDisabled = disabled || option.disabled === true;
              const letter = OPTION_LETTERS[index] ?? String(index + 1);

              return (
                <Label
                  key={option.id}
                  htmlFor={optionId}
                  lang={stemLang}
                  className={cn(
                    "relative flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded border p-4 transition-colors",
                    selected
                      ? "border-player-selected-border bg-player-accent-soft"
                      : "border-border bg-background",
                    !optionDisabled && !selected && "hover:bg-muted/50",
                    optionDisabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <RadioGroupItem
                    id={optionId}
                    lang={stemLang}
                    value={option.id}
                    disabled={optionDisabled}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[2em] shrink-0 items-center justify-center rounded text-sm font-semibold transition-colors",
                      selected
                        ? "bg-player-accent text-player-accent-foreground"
                        : "bg-player-option-badge text-muted-foreground",
                    )}
                  >
                    {letter}
                  </span>
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
          </RadioGroup>
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
          disabled={disabled || !onReset || value === null}
          className="h-auto min-h-10 max-h-none rounded px-[0.75em] py-[0.5em] text-base font-normal"
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

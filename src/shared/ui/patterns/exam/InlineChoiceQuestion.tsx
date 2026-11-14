import { Bookmark } from "lucide-react";
import { announce } from "@/shared/a11y/announcer";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { vi } from "@/shared/strings/vi";

export interface InlineChoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface InlineChoiceSlot {
  id: string;
  label: string;
  placeholder: string;
  options: InlineChoiceOption[];
  disabled?: boolean;
}

export type InlineChoiceSegment = string | { slotId: string };

export interface InlineChoiceQuestionProps {
  questionNumber: number;
  stem: string;
  stemLang?: string;
  image?: { src: string; alt: string };
  imageLayout?: "inline" | "above";
  segments: InlineChoiceSegment[];
  slots: InlineChoiceSlot[];
  values: Record<string, string | undefined>;
  onValueChange: (slotId: string, value: string) => void;
  onReset: () => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The question-content pattern for fill-in-the-blank items answered with inline
 * select controls. Navigation, timing, and submission stay with the shell.
 */
export function InlineChoiceQuestion({
  questionNumber,
  stem,
  stemLang,
  image,
  imageLayout = "inline",
  segments,
  slots,
  values,
  onValueChange,
  onReset,
  flagged = false,
  onToggleFlag,
  disabled = false,
  className,
}: InlineChoiceQuestionProps) {
  const questionId = `inline-choice-question-${questionNumber}`;
  const hasSelection = Object.values(values).some(Boolean);

  return (
    <section
      aria-labelledby={questionId}
      className={cn(
        "mt-4 grid gap-y-6 sm:grid-cols-[6rem_minmax(0,1fr)_3rem] sm:gap-x-4",
        className,
      )}
    >
      <p className="text-base font-semibold text-foreground sm:col-start-1">
        {vi.exam.questionNumber(questionNumber)}
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

        <div className="text-base leading-10 text-foreground">
          {segments.map((segment) => {
            if (typeof segment === "string") return segment;

            const slot = slots.find((item) => item.id === segment.slotId);
            if (!slot) return null;

            return (
              <Select
                key={slot.id}
                value={values[slot.id] ?? ""}
                disabled={disabled || slot.disabled}
                onValueChange={(value) => {
                  const option = slot.options.find(
                    (item) => item.value === value,
                  );
                  if (option)
                    announce(vi.announce.answerSelected(option.label));
                  onValueChange(slot.id, value);
                }}
              >
                <SelectTrigger
                  aria-label={slot.label}
                  className="mx-1 inline-flex h-11 min-w-40 align-middle bg-card text-base"
                >
                  <SelectValue placeholder={slot.placeholder} />
                </SelectTrigger>
                <SelectContent className=" text-base">
                  <SelectGroup>
                    {slot.options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className=" text-base"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-2 sm:col-start-2">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || !hasSelection}
          className="-ml-2 font-normal text-base"
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

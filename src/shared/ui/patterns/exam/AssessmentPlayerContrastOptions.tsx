import { Check } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export type ContrastOption = "default" | "inverted" | "yellowOnBlack";

export interface AssessmentPlayerContrastOptionsProps {
  value: ContrastOption;
  onChange?: (contrast: ContrastOption) => void;
}

function ContrastPreview({
  bgClass,
  lineClass,
}: {
  bgClass: string;
  lineClass: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-11 shrink-0 overflow-hidden rounded-[2px] border shadow-xs",
        bgClass,
      )}
    >
      <svg viewBox="0 0 44 28" className="size-full">
        <rect x="6" y="6" width="14" height="2" rx="1" className={lineClass} />
        <rect x="6" y="11" width="32" height="2" rx="1" className={lineClass} />
        <rect x="6" y="16" width="32" height="2" rx="1" className={lineClass} />
        <rect x="6" y="21" width="32" height="2" rx="1" className={lineClass} />
      </svg>
    </span>
  );
}

/** Contrast theme selector shown inside the assessment player options overlay. */
export function AssessmentPlayerContrastOptions({
  value,
  onChange,
}: AssessmentPlayerContrastOptionsProps) {
  const strings = vi.exam.player;
  const contrastOptions = [
    {
      id: "default",
      label: strings.contrastDefault,
      bgClass: "border-border bg-white",
      lineClass: "fill-[#1f2937]",
    },
    {
      id: "inverted",
      label: strings.contrastInverted,
      bgClass: "border-border bg-black",
      lineClass: "fill-white",
    },
    {
      id: "yellowOnBlack",
      label: strings.contrastYellowOnBlack,
      bgClass: "border-border bg-black",
      lineClass: "fill-[#ffff00]",
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 font-sans">
      <div
        role="radiogroup"
        aria-label={strings.contrast}
        className="divide-y divide-border overflow-hidden rounded border border-border bg-background"
      >
        {contrastOptions.map((option) => {
          const selected = value === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              variant="ghost"
              size="xl"
              className={cn(
                "min-h-[54px] w-full justify-between rounded-none px-5 text-base font-normal hover:bg-muted/60",
                selected &&
                  "bg-player-accent-soft font-semibold text-player-accent-soft-foreground hover:bg-player-accent-soft",
              )}
              onClick={() => onChange?.(option.id)}
            >
              <span className="flex items-center gap-4">
                <span className="flex size-[calc(1.25rem*var(--text-scale))] shrink-0 items-center justify-center">
                  {selected ? (
                    <Check
                      aria-hidden
                      className="size-[calc(1.25rem*var(--text-scale))]"
                    />
                  ) : null}
                </span>
                {option.label}
              </span>
              <ContrastPreview
                bgClass={option.bgClass}
                lineClass={option.lineClass}
              />
            </Button>
          );
        })}
      </div>
    </div>
  );
}

import { Check } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import { handleRadioGroupKeyDown } from "./radio-group-keys";

export const TEXT_SCALES = [100, 150, 175] as const;
export type TextScaleOption = (typeof TEXT_SCALES)[number];

export interface AssessmentPlayerTextSizeOptionsProps {
  value: TextScaleOption;
  onChange?: (textScale: TextScaleOption) => void;
}

/** Text size selector shown inside the assessment player options overlay. */
export function AssessmentPlayerTextSizeOptions({
  value,
  onChange,
}: AssessmentPlayerTextSizeOptionsProps) {
  const strings = vi.exam.player;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 font-sans">
      <div
        role="radiogroup"
        aria-label={strings.textSize}
        className="divide-y divide-border overflow-hidden rounded border border-border bg-background"
      >
        {TEXT_SCALES.map((scale) => {
          const selected = value === scale;
          return (
            <Button
              key={scale}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) =>
                handleRadioGroupKeyDown(event, TEXT_SCALES, value, onChange)
              }
              variant="ghost"
              size="xl"
              className={cn(
                "min-h-[54px] w-full justify-between rounded-none px-5 text-base font-normal hover:bg-muted/60",
                selected &&
                  "bg-player-accent-soft font-semibold text-player-accent-soft-foreground hover:bg-player-accent-soft",
              )}
              onClick={() => onChange?.(scale)}
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
                {scale}%
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

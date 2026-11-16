import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Contrast,
  EyeOff,
  Send,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import {
  AssessmentPlayerContrastOptions,
  type ContrastOption,
} from "./AssessmentPlayerContrastOptions";
import {
  AssessmentPlayerTextSizeOptions,
  type TextScaleOption,
} from "./AssessmentPlayerTextSizeOptions";

export type PlayerSetting = "contrast" | "textSize" | "remainingTime";
export type { ContrastOption, TextScaleOption };

export interface AssessmentPlayerOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Setting whose row is shown as the current selection. */
  selectedSetting?: PlayerSetting;
  contrast?: ContrastOption;
  onContrastChange?: (contrast: ContrastOption) => void;
  textScale?: TextScaleOption;
  onTextScaleChange?: (textScale: TextScaleOption) => void;
  onGoToSubmission?: () => void;
  onSelectSetting?: (setting: PlayerSetting) => void;
  interactionLocked?: boolean;
  enabledSettings?: PlayerSetting[];
  onRestoreFocus?: () => void;
}

/** Full-window options overlay opened from the player header. */
export function AssessmentPlayerOptions({
  open,
  onOpenChange,
  selectedSetting,
  contrast = "default",
  onContrastChange,
  textScale = 100,
  onTextScaleChange,
  onGoToSubmission,
  onSelectSetting,
  interactionLocked = false,
  enabledSettings,
  onRestoreFocus,
}: AssessmentPlayerOptionsProps) {
  const strings = vi.exam.player;
  const [view, setView] = useState<"menu" | "contrast" | "textSize">("menu");
  const handoff = useRef(false);
  const displaySettings = [
    { id: "contrast", label: strings.contrast, icon: Contrast },
    { id: "textSize", label: strings.textSize, icon: ZoomIn },
  ] as const;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setView("menu");
    onOpenChange(nextOpen);
  };

  const canOpenSetting = (id: PlayerSetting) => {
    if (enabledSettings !== undefined && !enabledSettings.includes(id)) {
      return false;
    }
    if (id === "contrast" && onContrastChange) return true;
    if (id === "textSize" && onTextScaleChange) return true;
    return Boolean(onSelectSetting);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!handoff.current) onRestoreFocus?.();
          handoff.current = false;
        }}
        overlayClassName="bg-transparent duration-0 supports-backdrop-filter:backdrop-blur-none data-open:animate-none data-closed:animate-none"
        closeButtonSize="icon-xl"
        className="inset-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none bg-secondary p-4 font-sans duration-0 data-open:animate-none data-closed:animate-none sm:max-w-none sm:p-6"
      >
        <div className="relative mx-auto flex w-full max-w-2xl items-center justify-center">
          {view !== "menu" ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              aria-label={strings.backToOptions}
              onClick={() => setView("menu")}
              className="absolute left-0 h-auto min-h-10 gap-1 rounded px-3 py-2 text-base font-normal text-foreground hover:bg-muted"
            >
              <ChevronLeft aria-hidden />
              <span>{strings.options}</span>
            </Button>
          ) : null}
          <DialogTitle className="text-center text-xl font-semibold text-foreground">
            {view === "contrast"
              ? strings.contrast
              : view === "textSize"
                ? strings.textSize
                : strings.options}
          </DialogTitle>
        </div>

        {view === "contrast" ? (
          <AssessmentPlayerContrastOptions
            value={contrast}
            onChange={onContrastChange}
          />
        ) : view === "textSize" ? (
          <AssessmentPlayerTextSizeOptions
            value={textScale}
            onChange={onTextScaleChange}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 font-sans">
            <Button
              size="xl"
              disabled={!onGoToSubmission || interactionLocked}
              className="min-h-[54px] justify-between rounded bg-player-accent px-5 text-base font-semibold text-player-accent-foreground hover:bg-player-accent/90"
              onClick={() => {
                handoff.current = true;
                handleOpenChange(false);
                onGoToSubmission?.();
              }}
            >
              <span className="flex items-center gap-4">
                <Send
                  aria-hidden
                  className="size-[calc(1.25rem*var(--text-scale))]"
                />
                {strings.goToSubmission}
              </span>
              <ChevronRight
                aria-hidden
                className="size-[calc(1.25rem*var(--text-scale))]"
              />
            </Button>

            <div className="divide-y divide-border overflow-hidden rounded border border-border bg-background">
              {displaySettings.map(({ id, label, icon: Icon }) => {
                const selected = selectedSetting === id;
                const enabled = canOpenSetting(id);
                return (
                  <Button
                    key={id}
                    variant="ghost"
                    size="xl"
                    disabled={!enabled}
                    className={cn(
                      "min-h-[54px] w-full justify-between rounded-none px-5 text-base font-normal hover:bg-muted/60",
                      selected && "bg-muted/60 font-semibold",
                    )}
                    onClick={() => {
                      if (
                        (id === "contrast" && onContrastChange) ||
                        (id === "textSize" && onTextScaleChange)
                      ) {
                        setView(id);
                        onSelectSetting?.(id);
                        return;
                      }
                      handoff.current = true;
                      handleOpenChange(false);
                      onSelectSetting?.(id);
                    }}
                  >
                    <span className="flex items-center gap-4">
                      <Icon
                        aria-hidden
                        className="size-[calc(1.25rem*var(--text-scale))] text-muted-foreground"
                      />
                      {label}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-[calc(1.25rem*var(--text-scale))] text-muted-foreground"
                    />
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="xl"
              disabled={!canOpenSetting("remainingTime")}
              className={cn(
                "min-h-[54px] justify-between rounded border border-border bg-background px-5 text-base font-normal hover:bg-muted/60",
                selectedSetting === "remainingTime" &&
                  "border-player-selected-border bg-player-accent-soft font-semibold text-player-accent-soft-foreground hover:bg-player-accent-soft",
              )}
              onClick={() => {
                if (onSelectSetting && !onContrastChange && !onTextScaleChange) {
                  handleOpenChange(false);
                }
                onSelectSetting?.("remainingTime");
              }}
            >
              <span className="flex items-center gap-4">
                <EyeOff
                  aria-hidden
                  className={cn(
                    "size-[calc(1.25rem*var(--text-scale))]",
                    selectedSetting === "remainingTime"
                      ? "text-player-accent-soft-foreground"
                      : "text-muted-foreground",
                  )}
                />
                {strings.toggleRemainingTime}
              </span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-[calc(1.25rem*var(--text-scale))]",
                  selectedSetting === "remainingTime"
                    ? "text-player-accent-soft-foreground"
                    : "text-muted-foreground",
                )}
              />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import {
  ChevronRight,
  CircleHelp,
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

export type PlayerSetting = "language" | "contrast" | "textSize" | "remainingTime";

export interface AssessmentPlayerOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Setting whose row is shown as the current selection. */
  selectedSetting?: PlayerSetting;
  onGoToSubmission?: () => void;
  onSelectSetting?: (setting: PlayerSetting) => void;
}

/** Full-window options overlay opened from the player header. */
export function AssessmentPlayerOptions({
  open,
  onOpenChange,
  selectedSetting,
  onGoToSubmission,
  onSelectSetting,
}: AssessmentPlayerOptionsProps) {
  const strings = vi.exam.player;
  const displaySettings = [
    { id: "language", label: strings.language, icon: CircleHelp },
    { id: "contrast", label: strings.contrast, icon: Contrast },
    { id: "textSize", label: strings.textSize, icon: ZoomIn },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-transparent duration-0 supports-backdrop-filter:backdrop-blur-none data-open:animate-none data-closed:animate-none"
        closeButtonSize="icon-xl"
        className="inset-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none bg-secondary p-4 font-sans duration-0 data-open:animate-none data-closed:animate-none sm:max-w-none sm:p-6"
      >
        <DialogTitle className="text-center text-2xl font-normal">
          {strings.options}
        </DialogTitle>
        <div className="mx-auto flex w-full max-w-180 flex-col gap-4 font-sans">
          <Button
            size="xl"
            className="h-20 justify-between rounded bg-primary px-6 text-base font-normal text-primary-foreground hover:bg-primary/90"
            onClick={onGoToSubmission}
          >
            <span className="flex items-center gap-5">
              <Send aria-hidden className="size-5" />
              {strings.goToSubmission}
            </span>
            <ChevronRight aria-hidden className="size-6" />
          </Button>

          <div className="overflow-hidden rounded border border-border bg-card">
            {displaySettings.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant="ghost"
                size="xl"
                className={cn(
                  "h-20 w-full justify-between rounded-none px-6 text-base font-normal hover:bg-muted",
                  selectedSetting === id && "bg-primary/10",
                )}
                onClick={() => onSelectSetting?.(id)}
              >
                <span className="flex items-center gap-5">
                  <Icon aria-hidden className="size-5 text-muted-foreground" />
                  {label}
                </span>
                <ChevronRight aria-hidden className="size-6" />
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="xl"
            className={cn(
              "h-20 justify-between rounded border border-border bg-card px-6 text-base font-normal hover:bg-muted",
              selectedSetting === "remainingTime" && "bg-primary/10",
            )}
            onClick={() => onSelectSetting?.("remainingTime")}
          >
            <span className="flex items-center gap-5">
              <EyeOff aria-hidden className="size-5 text-muted-foreground" />
              {strings.toggleRemainingTime}
            </span>
            <ChevronRight aria-hidden className="size-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

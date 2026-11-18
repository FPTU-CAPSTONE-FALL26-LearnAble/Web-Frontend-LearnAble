import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { vi } from "@/shared/strings/vi";
import type { PlayerView } from "./assessment-player-types";

export interface QuestionPagerProps {
  currentIndex: number;
  questionCount: number;
  view: PlayerView;
  onGoTo: (index: number) => void;
  onViewChange: (view: "contents" | "review") => void;
}

/**
 * Previous/Next for the assessment player, floating at the bottom-right of the
 * question. Previous on the first question opens Contents; Next on the last
 * opens Review. The per-question grid lives in QuestionNavigatorPanel.
 */
export function QuestionPager({
  currentIndex,
  questionCount,
  view,
  onGoTo,
  onViewChange,
}: QuestionPagerProps) {
  const strings = vi.exam.player;
  return (
    <div className="relative shrink-0">
      <nav
        aria-label={strings.previousNext}
        className="absolute bottom-[calc(100%+2rem)] right-10 z-30 flex gap-1.5 [&_[data-slot=button]]:rounded!"
      >
        <Button
          variant="ghost"
          size="icon-xl"
          className="rounded border border-border bg-muted text-muted-foreground hover:bg-player-accent hover:text-player-accent-foreground focus-visible:bg-player-accent/30 focus-visible:ring-0"
          aria-label={strings.previous}
          disabled={view === "contents"}
          onClick={() => {
            if (view === "review") {
              onGoTo(questionCount - 1);
            } else if (currentIndex === 0) {
              onViewChange("contents");
            } else {
              onGoTo(currentIndex - 1);
            }
          }}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-xl"
          className="rounded border border-border bg-muted text-muted-foreground hover:bg-player-accent hover:text-player-accent-foreground focus-visible:bg-player-accent/30 focus-visible:ring-0"
          aria-label={strings.next}
          disabled={view === "review"}
          onClick={() => {
            if (view === "contents") {
              onGoTo(0);
            } else if (currentIndex === questionCount - 1) {
              onViewChange("review");
            } else {
              onGoTo(currentIndex + 1);
            }
          }}
        >
          <ChevronRight aria-hidden />
        </Button>
      </nav>
    </div>
  );
}

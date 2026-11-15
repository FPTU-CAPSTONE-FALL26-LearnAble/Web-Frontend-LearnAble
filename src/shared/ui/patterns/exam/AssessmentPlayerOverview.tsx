import { Button } from "@/shared/ui/primitives/button";
import { TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { vi } from "@/shared/strings/vi";
import type { PlayerFilter, PlayerView } from "./assessment-player-types";

export interface AssessmentPlayerOverviewProps {
  /** Assessment name shown above the contents table. */
  title: string;
  answeredCount: number;
  flaggedCount: number;
  questionCount: number;
  view: PlayerView;
  onFinishAndSubmit?: () => void;
}

const filters: PlayerFilter[] = ["all", "unanswered", "flagged"];

/**
 * Title or review summary plus the filter tabs, collapsed while a question is
 * open. Must render inside the player's `Tabs` root, which owns the filter value.
 */
export function AssessmentPlayerOverview({
  title,
  answeredCount,
  flaggedCount,
  questionCount,
  view,
  onFinishAndSubmit,
}: AssessmentPlayerOverviewProps) {
  const strings = vi.exam.player;
  const unattemptedCount = questionCount - answeredCount;
  const counts: Record<PlayerFilter, number> = {
    all: questionCount,
    unanswered: unattemptedCount,
    flagged: flaggedCount,
  };
  const labels: Record<PlayerFilter, string> = {
    all: strings.filterAll,
    unanswered: strings.filterUnanswered,
    flagged: strings.filterFlagged,
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-6 pb-5">
        {view === "review" ? (
          <>
            <div className="min-w-0">
              <h2
                id="review-heading"
                className="text-xl font-semibold text-foreground"
              >
                {strings.reviewHeading}
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                {strings.reviewBreakdown(
                  answeredCount,
                  flaggedCount,
                  unattemptedCount,
                  questionCount,
                )}
              </p>
            </div>
            <Button
              size="xl"
              className="shrink-0 rounded bg-player-accent font-semibold text-player-accent-foreground hover:bg-player-accent/90"
              onClick={onFinishAndSubmit}
            >
              {strings.finishAndSubmit}
            </Button>
          </>
        ) : (
          <h2
            id="contents-heading"
            className="text-xl font-semibold text-foreground"
          >
            {title}
          </h2>
        )}
      </div>
      <TabsList
        aria-label={strings.filterQuestions}
        variant="line"
        className="group-data-horizontal/tabs:h-auto w-full !justify-start gap-6 border-b border-border p-0"
      >
        {filters.map((name) => (
          <TabsTrigger
            key={name}
            value={name}
            className="will-change-transform !flex-none rounded-none px-0 pb-3 pt-2 text-base font-normal text-muted-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:bg-player-accent"
          >
            {labels[name]}{" "}
            <span className="will-change-transform">({counts[name]})</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

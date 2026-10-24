import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import type { PlayerFilter, PlayerView } from "./assessment-player-types";

export interface AssessmentPlayerOverviewProps {
  /** Assessment name shown above the contents table. */
  title: string;
  answeredCount: number;
  flaggedCount: number;
  questionCount: number;
  view: PlayerView;
  onStartOver: () => void;
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
  onStartOver,
}: AssessmentPlayerOverviewProps) {
  const strings = vi.exam.player;
  const counts: Record<PlayerFilter, number> = {
    all: questionCount,
    unanswered: questionCount - answeredCount,
    flagged: flaggedCount,
  };
  const labels: Record<PlayerFilter, string> = {
    all: strings.filterAll,
    unanswered: strings.filterUnanswered,
    flagged: strings.filterFlagged,
  };

  return (
    <section
      aria-hidden={view === "question"}
      inert={view === "question"}
      className={cn(
        "w-full overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
        view === "question" ? "max-h-0 opacity-0" : "max-h-56 opacity-100",
      )}
    >
      <div>
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-6 px-4 pb-8 pt-6 sm:px-6">
          {view === "review" ? (
            <>
              <div>
                <h2 id="review-heading" className="sr-only">
                  {strings.reviewHeading}
                </h2>
                <p className="text-lg font-normal text-foreground">
                  {strings.unattemptedSummary(questionCount - answeredCount)}
                </p>
              </div>
              <Button
                size="xl"
                className="shrink-0 bg-primary px-6 text-base font-normal text-primary-foreground hover:bg-primary/90"
                onClick={onStartOver}
              >
                <RotateCcw aria-hidden />
                {strings.startOver}
              </Button>
            </>
          ) : (
            <h2
              id="contents-heading"
              className="text-lg font-normal text-foreground"
            >
              {title}
            </h2>
          )}
        </div>
        <div className="mx-auto w-full max-w-4xl">
          <TabsList
            aria-label={strings.filterQuestions}
            variant="line"
            className="mx-auto group-data-horizontal/tabs:h-auto w-full max-w-4xl !justify-start px-4 sm:px-6"
          >
            {filters.map((name) => (
              <TabsTrigger
                key={name}
                value={name}
                className="will-change-transform !flex-none p-4 text-base font-normal data-[state=active]:shadow-none data-[state=active]:text-foreground group-data-horizontal/tabs:after:h-1"
              >
                {labels[name]}{" "}
                <span className="will-change-transform">({counts[name]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </section>
  );
}

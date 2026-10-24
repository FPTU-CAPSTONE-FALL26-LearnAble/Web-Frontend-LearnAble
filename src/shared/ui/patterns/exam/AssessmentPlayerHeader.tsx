import { Menu, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import type { PlayerFilter, PlayerView } from "./assessment-player-types";

export interface AssessmentPlayerHeaderProps {
  /** Assessment name shown above the contents table. */
  title: string;
  candidate: { id: string; name: string };
  answeredCount: number;
  flaggedCount: number;
  questionCount: number;
  view: PlayerView;
  optionsOpen: boolean;
  onOpenOptions: () => void;
  onStartOver: () => void;
}

const filters: PlayerFilter[] = ["all", "unanswered", "flagged"];

/** Must render inside the player's `Tabs` root, which owns the filter value. */
export function AssessmentPlayerHeader({
  title,
  candidate,
  answeredCount,
  flaggedCount,
  questionCount,
  view,
  optionsOpen,
  onOpenOptions,
  onStartOver,
}: AssessmentPlayerHeaderProps) {
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
    <header className="relative shrink-0 border-b border-border bg-background shadow-xs">
      <div className="flex min-h-16 items-center sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {strings.candidate(candidate.id, candidate.name)}
          </p>
          <p>{strings.connected}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground"></div>
        <Button
          variant="ghost"
          size="icon-xl"
          aria-label={strings.openOptions}
          aria-expanded={optionsOpen}
          onClick={onOpenOptions}
        >
          <Menu aria-hidden />
        </Button>
      </div>
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
                  <span className="will-change-transform">
                    ({counts[name]})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
      </section>
    </header>
  );
}

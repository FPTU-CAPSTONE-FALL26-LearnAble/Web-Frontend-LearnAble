import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Check, Flag } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

type ButtonProps = ComponentProps<typeof Button>;
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface QuestionNavigatorItem {
  id: string;
  answered: boolean;
  flagged: boolean;
}

export interface QuestionNavigatorPanelProps {
  questions: QuestionNavigatorItem[];
  /** 0-based index of the open question; `null` while the contents or review view is open. */
  currentIndex: number | null;
  onNavigate: (index: number) => void;
  onReview: () => void;
  /** Remaining-time indicator shown at the top of the panel, e.g. the host's exam timer. */
  timer?: ReactNode;
  className?: string;
}

export type TileTone = "current" | "flagged" | "answered" | "unanswered";

export const toneVariant = {
  current: "default",
  flagged: "flag",
  answered: "accent-soft",
  unanswered: "outline-strong",
} as const satisfies Record<TileTone, ButtonProps["variant"]>;

/** Key swatches mirror the Button variants used by the tiles. */
const toneClasses: Record<TileTone, string> = {
  current: "border-primary bg-primary text-primary-foreground",
  flagged:
    "border-player-flag-foreground bg-player-flag text-player-flag-foreground",
  answered:
    "border-player-accent bg-player-accent-soft text-player-accent-soft-foreground",
  unanswered: "border-muted-foreground bg-background text-foreground",
};

export function toneOf(item: QuestionNavigatorItem, current: boolean): TileTone {
  if (current) return "current";
  if (item.flagged) return "flagged";
  return item.answered ? "answered" : "unanswered";
}

export function StatusIcons({
  answered,
  flagged,
}: {
  answered: boolean;
  flagged: boolean;
}) {
  return (
    <span aria-hidden className="flex h-4 items-center gap-0.5">
      {answered ? <Check className="size-4" strokeWidth={3} /> : null}
      {flagged ? <Flag className="size-3.5 fill-current" /> : null}
    </span>
  );
}

/**
 * Exam contents sidebar: every question as a button with its status, plus the
 * way to the review screen. Place it AFTER <main> in the DOM (visually on the
 * right) so reading order and Tab order match the screen. Status is never
 * colour-only: icons, a visible key and the accessible name all carry it.
 *
 * Give the panel a bounded height (e.g. `h-full` in a flex column) and only
 * the grid scrolls, keeping the heading and "Review and submit" in view.
 */
export function QuestionNavigatorPanel({
  questions,
  currentIndex,
  onNavigate,
  onReview,
  timer,
  className,
}: QuestionNavigatorPanelProps) {
  const strings = vi.exam.questionsPanel;
  const gridRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  const total = questions.length;
  const answeredCount = questions.filter((q) => q.answered).length;
  const flaggedCount = questions.filter((q) => q.flagged).length;

  // Keep the open question visible inside the scrolling grid without
  // scrolling the page itself (the panel may sit below the question).
  useEffect(() => {
    const grid = gridRef.current;
    const tile = currentRef.current;
    if (!grid || !tile || grid.scrollHeight <= grid.clientHeight) return;
    const g = grid.getBoundingClientRect();
    const t = tile.getBoundingClientRect();
    if (t.top < g.top) grid.scrollTop -= g.top - t.top + 8;
    else if (t.bottom > g.bottom) grid.scrollTop += t.bottom - g.bottom + 8;
  }, [currentIndex]);

  const legend: { tone: TileTone; label: string; icons?: ReactNode }[] = [
    { tone: "current", label: strings.current },
    {
      tone: "answered",
      label: strings.answered,
      icons: <Check className="size-3" strokeWidth={4} />,
    },
    { tone: "unanswered", label: strings.notAnswered },
    {
      tone: "flagged",
      label: strings.flagged,
      icons: <Flag className="size-3 fill-current" />,
    },
  ];

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      {timer ? (
        <div className="shrink-0 rounded border border-border bg-background p-3">
          {timer}
        </div>
      ) : null}
      <aside
        aria-label={strings.heading}
        className="flex min-h-0 flex-col gap-4 rounded border border-border bg-background p-3"
      >
        <p className="text-base text-muted-foreground">
          {strings.summary(answeredCount, total, flaggedCount)}
        </p>

        <div ref={gridRef} className="-m-1.5 min-h-0 overflow-y-auto p-1.5">
          <ol
            aria-label={strings.gridLabel}
            className="grid grid-cols-5 gap-1.5"
          >
            {questions.map((item, index) => {
              const current = index === currentIndex;
              return (
                <li key={item.id}>
                  <Button
                    ref={current ? currentRef : undefined}
                    type="button"
                    variant={toneVariant[toneOf(item, current)]}
                    size="tile"
                    className="w-full"
                    aria-label={strings.tileLabel(
                      index + 1,
                      item.answered,
                      item.flagged,
                      current,
                    )}
                    aria-current={current ? "step" : undefined}
                    onClick={() => onNavigate(index)}
                  >
                    <span className="text-base leading-none font-semibold">
                      {index + 1}
                    </span>
                    <StatusIcons
                      answered={item.answered}
                      flagged={item.flagged}
                    />
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>

        <ul
          aria-label={strings.legendLabel}
          className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm"
        >
          {legend.map(({ tone, label, icons }) => (
            <li key={tone} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-sm border-2",
                  toneClasses[tone],
                )}
              >
                {icons}
              </span>
              {label}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Button size="xl" className="w-full" onClick={onReview}>
            {strings.review}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {strings.reviewHint}
          </p>
        </div>
      </aside>
    </div>
  );
}

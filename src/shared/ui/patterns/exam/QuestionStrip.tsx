import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import {
  StatusIcons,
  toneOf,
  type QuestionNavigatorItem,
  type TileTone,
} from "./QuestionNavigatorPanel";

/** Latest sample-test run for a coding question. */
export interface TestsSummary {
  passed: number;
  total: number;
}

export interface QuestionStripProps {
  questions: QuestionNavigatorItem[];
  /** 0-based index of the open question; `null` while contents or review is open. */
  currentIndex: number | null;
  /** Sample-test results by question id, shown under each tile once run. */
  results?: Record<string, TestsSummary>;
  /** Questions whose sample tests are running right now. */
  running?: Record<string, true>;
  onNavigate: (index: number) => void;
  className?: string;
}

const stripVariant = {
  current: "accent-soft",
  flagged: "flag",
  answered: "outline-strong",
  unanswered: "secondary",
} as const satisfies Record<TileTone, string>;

/** After a run the tile shows its result: green when every test passed, yellow otherwise. */
function variantOf(tone: TileTone, result: TestsSummary | undefined) {
  if (tone === "current" || !result) return stripVariant[tone];
  return result.passed === result.total ? "success" : "flag";
}

/**
 * One-row question navigation for the coding exam bar: equal-width tiles that
 * stretch to fill the row (scrolling sideways when there are many). Status is
 * never colour-only: icons, the visible test count and the spoken name carry it.
 */
export function QuestionStrip({
  questions,
  currentIndex,
  results = {},
  running = {},
  onNavigate,
  className,
}: QuestionStripProps) {
  const strings = vi.exam.questionsPanel;
  const coding = vi.exam.coding;
  const rowRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  // Keep the open question in view without scrolling the page.
  useEffect(() => {
    const row = rowRef.current;
    const tile = currentRef.current;
    if (!row || !tile || row.scrollWidth <= row.clientWidth) return;
    const r = row.getBoundingClientRect();
    const t = tile.getBoundingClientRect();
    if (t.left < r.left) row.scrollLeft -= r.left - t.left + 8;
    else if (t.right > r.right) row.scrollLeft += t.right - r.right + 8;
  }, [currentIndex]);

  return (
    <nav
      aria-label={vi.exam.player.questionNavigation}
      className={cn("min-w-0", className)}
    >
      <div ref={rowRef} className="h-full overflow-x-auto">
        <ol
          aria-label={strings.gridLabel}
          className="flex h-full min-h-[calc(3rem*var(--text-scale))] min-w-full gap-1 py-[1px]"
        >
          {questions.map((item, index) => {
            const current = index === currentIndex;
            const result = results[item.id];
            const isRunning = Boolean(running[item.id]);
            return (
              <li key={item.id} className="flex min-w-36 flex-1">
                <Button
                  ref={current ? currentRef : undefined}
                  type="button"
                  variant={variantOf(toneOf(item, current), result)}
                  size="tile"
                  className="h-full w-full"
                  aria-label={[
                    strings.tileLabel(
                      index + 1,
                      item.answered,
                      item.flagged,
                      current,
                    ),
                    isRunning
                      ? coding.runningSpoken
                      : result
                        ? coding.testsPassedSpoken(result.passed, result.total)
                        : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  aria-current={current ? "step" : undefined}
                  onClick={() => onNavigate(index)}
                >
                  <span className="flex items-center gap-1.5 text-base leading-none font-semibold">
                    {coding.stripTile(index + 1)}
                    <StatusIcons
                      answered={item.answered}
                      flagged={item.flagged}
                    />
                  </span>
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-sm leading-tight font-medium">
                      <LoaderCircle
                        aria-hidden
                        className="size-3.5 motion-safe:animate-spin"
                      />
                      {coding.running}
                    </span>
                  ) : result ? (
                    <span className="text-sm leading-tight font-medium">
                      {coding.testsPassed(result.passed, result.total)}
                    </span>
                  ) : null}
                </Button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

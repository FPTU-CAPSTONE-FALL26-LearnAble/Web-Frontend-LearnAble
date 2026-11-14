import { useState } from "react";
import { RotateCcw, Scale, Shuffle, Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import {
  balanceHints,
  DEFAULT_DIFFICULTY_TARGET,
  type BalanceSlice,
  type PaperBalance as Balance,
} from "@/features/examiner/workflow/paperBalance";

function Bar({ percent, target, tone = "bg-primary" }: { percent: number; target?: number; tone?: string }) {
  return (
    <div aria-hidden className="relative h-2.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} />
      {target !== undefined ? <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `calc(${Math.min(100, Math.max(0, target))}% - 1px)` }} /> : null}
    </div>
  );
}

function questionWord(count: number) {
  return `${count} question${count === 1 ? "" : "s"}`;
}

function Row({ slice, children }: { slice: BalanceSlice; children?: React.ReactNode }) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{slice.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {questionWord(slice.count)} · <strong className="text-foreground">{slice.countPercent}%</strong>
        </span>
      </div>
      {children}
      {slice.count > 0 ? <p className="text-xs text-muted-foreground">{slice.score} points · {slice.scorePercent}% of the score</p> : null}
    </li>
  );
}

export type AutoPickPanel = {
  /** How many questions the paper should have in the end. */
  plannedCount: number;
  onPlannedCountChange: (count: number) => void;
  /** Eligible questions in the bank, so the button can say when there is nothing to pick from. */
  eligibleCount: number;
  onAutoPick: (target: Record<string, number>, mode: "fill" | "restart") => void;
  /** What the last pick did, and anything that did not go to plan. */
  result: { summary: string; warnings: string[] } | null;
  canUndo: boolean;
  onUndo: () => void;
};

/**
 * How the chosen questions split by difficulty and by type, so the examiner can balance the paper.
 * It uses only what the Backend already returns; the targets are the examiner's own and are not saved.
 */
export function PaperBalance({ balance, autoPick }: { balance: Balance; autoPick?: AutoPickPanel }) {
  const [target, setTarget] = useState<Record<string, number>>({ ...DEFAULT_DIFFICULTY_TARGET });
  const hints = balanceHints(balance, target);
  return (
    <section aria-label="Paper balance" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Scale className="size-5 text-primary" aria-hidden />
          Paper balance
        </h2>
      </header>
      <div className="space-y-6 px-5 py-4">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">By difficulty</h3>
          <ul className="space-y-4">
            {balance.difficulty.map((slice) => {
              const goal = target[slice.key];
              return (
                <Row key={slice.key} slice={slice}>
                  <Bar percent={slice.countPercent} target={goal} />
                  {goal !== undefined ? (
                    <div className="grid grid-cols-[auto_5rem_1fr] items-center gap-2 text-xs text-muted-foreground">
                      <label htmlFor={`target-${slice.key}`}>Target %</label>
                      <Input
                        id={`target-${slice.key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={5}
                        value={String(goal)}
                        aria-label={`Target percent for ${slice.label}`}
                        onChange={(event) => setTarget((current) => ({ ...current, [slice.key]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))}
                      />
                      <span className="text-right">{slice.available} eligible in the bank</span>
                    </div>
                  ) : null}
                </Row>
              );
            })}
          </ul>
        </div>
        {autoPick ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Auto-pick</h3>
            <p className="text-sm text-muted-foreground">Chooses eligible questions at random so the paper follows the difficulty targets above.</p>
            <div className="grid gap-2 text-sm font-semibold">
              <label htmlFor="auto-pick-count">Questions in this paper</label>
              <Input id="auto-pick-count" type="number" inputMode="numeric" min={1} step={1} value={autoPick.plannedCount > 0 ? String(autoPick.plannedCount) : ""} placeholder="For example 40" onChange={(event) => autoPick.onPlannedCountChange(Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
            </div>
            {(() => {
              const targetTotal = Object.values(target).reduce((sum, value) => sum + value, 0);
              const blocked = autoPick.plannedCount < 1 || targetTotal <= 0 || autoPick.eligibleCount === 0;
              return (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" disabled={blocked} onClick={() => autoPick.onAutoPick(target, "fill")}>
                      <Shuffle aria-hidden />
                      Fill the rest
                    </Button>
                    <Button type="button" variant="outline" disabled={blocked} onClick={() => autoPick.onAutoPick(target, "restart")}>
                      <RotateCcw aria-hidden />
                      Pick again
                    </Button>
                  </div>
                  {blocked ? (
                    <p className="text-xs text-muted-foreground">
                      {autoPick.eligibleCount === 0 ? "There are no eligible questions to pick from." : targetTotal <= 0 ? "Set at least one target above 0." : "Enter how many questions the paper should have."}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Fill the rest keeps your current choices. Pick again starts over.</p>
                  )}
                </>
              );
            })()}
            <div role="status" aria-live="polite" className="space-y-2 text-sm">
              {autoPick.result ? <p className="font-semibold">{autoPick.result.summary}</p> : null}
              {autoPick.result?.warnings.length ? <ul className="list-disc space-y-1 pl-5 text-warning-foreground">{autoPick.result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
            </div>
            {autoPick.canUndo ? <Button type="button" variant="outline" onClick={autoPick.onUndo}><Undo2 aria-hidden />Undo auto-pick</Button> : null}
          </div>
        ) : null}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">By question type</h3>
          <ul className="space-y-4">
            {balance.type.map((slice) => (
              <Row key={slice.key} slice={slice}>
                <Bar percent={slice.countPercent} tone="bg-secondary-foreground" />
              </Row>
            ))}
          </ul>
        </div>
        {balance.count ? (
          <div role="status" aria-live="polite" className="border-t border-border pt-4 text-sm">
            {hints.length ? (
              <ul className="list-disc space-y-1 pl-5">{hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
            ) : (
              <p className="font-semibold text-success-foreground">The mix is close to your targets.</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

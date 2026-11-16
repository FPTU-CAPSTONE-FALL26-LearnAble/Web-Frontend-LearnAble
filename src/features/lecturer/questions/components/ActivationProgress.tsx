import { CheckCircle2, ChevronDown, ChevronUp, Loader2, TriangleAlert, X } from "lucide-react";

export type ActivationProgressState = {
  total: number;
  done: number;
  failed: number;
  /** The first reason the Backend gave for a refusal, if any. */
  reason?: string;
  running: boolean;
  minimized: boolean;
};

const iconButton = "inline-flex size-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** A floating tracker for a long bulk activation. It can be folded down to its title bar or closed once finished. */
export function ActivationProgress({ state, onToggle, onClose }: {
  state: ActivationProgressState;
  onToggle: () => void;
  onClose: () => void;
}) {
  const handled = state.done + state.failed;
  const percent = state.total ? Math.round((handled / state.total) * 100) : 0;
  const finished = !state.running;
  const title = state.running
    ? `Activating ${handled} of ${state.total}`
    : state.failed ? "Activation finished with problems" : "Questions activated";
  return (
    <section
      aria-label="Bulk activation progress"
      className="fixed right-4 top-20 z-50 w-[min(22rem,calc(100vw-2rem))] lg:top-4 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      <div className="flex items-center gap-2 pl-4">
        {state.running
          ? <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-primary" />
          : state.failed
            ? <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
            : <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success-foreground" />}
        <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
        <button type="button" className={iconButton} aria-expanded={!state.minimized} aria-label={state.minimized ? "Show activation progress" : "Hide activation progress"} onClick={onToggle}>
          {state.minimized ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
        </button>
        {finished ? (
          <button type="button" className={iconButton} aria-label="Close activation progress" onClick={onClose}>
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <div role="progressbar" aria-label="Questions handled" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 bg-muted">
        <div className="h-full bg-success-border transition-all" style={{ width: `${percent}%` }} />
      </div>
      {state.minimized ? null : (
        <div className="space-y-2 p-4 text-sm">
          <dl className="grid grid-cols-3 gap-2">
            <div><dt className="text-xs text-muted-foreground">Activated</dt><dd className="text-lg font-bold tabular-nums">{state.done}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Not activated</dt><dd className="text-lg font-bold tabular-nums">{state.failed}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Waiting</dt><dd className="text-lg font-bold tabular-nums">{Math.max(0, state.total - handled)}</dd></div>
          </dl>
          {state.running ? <p className="text-muted-foreground">You can keep working while this runs.</p> : null}
          {state.failed && state.reason ? <p className="text-destructive">{state.reason}</p> : null}
        </div>
      )}
    </section>
  );
}

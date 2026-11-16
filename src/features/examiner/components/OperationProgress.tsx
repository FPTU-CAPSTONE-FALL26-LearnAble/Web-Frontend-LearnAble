import { useEffect } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, CircleAlert, Loader2, X } from "lucide-react";
import { useOperationProgress, type StepStatus } from "@/features/examiner/workflow/operationProgress";

const iconButton = "inline-flex size-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
// A finished tracker with nothing wrong goes away by itself; a failed one stays until it is closed.
const AUTO_CLOSE_MS = 6000;

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-primary" />;
  if (status === "done") return <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success-foreground" />;
  if (status === "failed") return <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />;
  return <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />;
}

const statusWord: Record<StepStatus, string> = { pending: "Waiting", running: "In progress", done: "Done", failed: "Failed" };

/** A floating tracker for saving and publishing. It can be folded to its title bar, and closed once it is finished. */
export function OperationProgress() {
  const { open, title, steps, phase, message, minimized, toggle, close } = useOperationProgress();
  useEffect(() => {
    if (!open || phase !== "done") return;
    const timer = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, phase, close]);
  if (!open) return null;
  const done = steps.filter((item) => item.status === "done").length;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const heading = phase === "running" ? title : phase === "done" ? `${title} · done` : `${title} · failed`;
  return (
    <section
      aria-label="Save and publish progress"
      className="fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] lg:top-4 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      <div className="flex items-center gap-2 pl-4">
        {phase === "running"
          ? <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-primary" />
          : phase === "done"
            ? <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success-foreground" />
            : <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />}
        <p role={phase === "failed" ? "alert" : "status"} aria-live="polite" className="min-w-0 flex-1 truncate text-sm font-semibold">{heading}</p>
        <button type="button" className={iconButton} aria-expanded={!minimized} aria-label={minimized ? "Show progress" : "Hide progress"} onClick={toggle}>
          {minimized ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
        </button>
        {phase !== "running" ? (
          <button type="button" className={iconButton} aria-label="Close progress" onClick={close}>
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <div role="progressbar" aria-label="Steps completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 bg-muted">
        <div className={`h-full transition-all ${phase === "failed" ? "bg-destructive" : "bg-success-border"}`} style={{ width: `${phase === "failed" ? Math.max(percent, 8) : percent}%` }} />
      </div>
      {minimized ? null : (
        <div className="space-y-3 p-4 text-sm">
          <ol className="space-y-2">
            {steps.map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                <StepIcon status={item.status} />
                <span className="min-w-0 flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">{statusWord[item.status]}</span>
              </li>
            ))}
          </ol>
          {message ? <p className={phase === "failed" ? "text-destructive" : "text-muted-foreground"}>{message}</p> : null}
        </div>
      )}
    </section>
  );
}

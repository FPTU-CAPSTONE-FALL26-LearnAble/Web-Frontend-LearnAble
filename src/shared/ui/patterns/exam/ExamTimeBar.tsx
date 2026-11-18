import { Progress } from "@/shared/ui/primitives/progress";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface ExamTimeBarProps {
  /** Time left, in milliseconds. */
  remainingMs: number;
  /** The whole time limit, in milliseconds. */
  totalMs: number;
  /** The deadline being counted down to, kept machine-readable on the clock. */
  deadlineAt?: string;
  className?: string;
}

/** 35:12, or 1:05:09 once an hour or more is involved. */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "1 hour", "1 hour 30 minutes", "45 minutes" — for screen readers. */
export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (h === 0) return unit(m, "minute");
  return m === 0 ? unit(h, "hour") : `${unit(h, "hour")} ${unit(m, "minute")}`;
}

const CRITICAL_MS = 5 * 60 * 1000;

/**
 * Media-player style countdown: a bar that fills as time is used, with the
 * time left and the full limit underneath. Not a live region — the visible
 * clock ticks every second, but what a screen reader reads changes only once
 * a minute; hosts announce the minute milestones through the shared channel.
 */
export function ExamTimeBar({
  remainingMs,
  totalMs,
  deadlineAt,
  className,
}: ExamTimeBarProps) {
  const strings = vi.exam.timeBar;
  const remaining = Math.max(0, Math.min(remainingMs, totalMs));
  const elapsedPercent = totalMs > 0 ? ((totalMs - remaining) / totalMs) * 100 : 100;
  const critical = remaining <= CRITICAL_MS;
  const spokenMinutes = Math.max(1, Math.ceil(remaining / 60000));

  return (
    <div
      role="timer"
      className={cn(
        "flex flex-col gap-1.5 rounded-md",
        critical && "bg-warning p-2 text-warning-foreground",
        className,
      )}
    >
      <span className="sr-only">
        {strings.spoken(spokenMinutes, formatDuration(totalMs))}
      </span>
      <div aria-hidden className="text-sm font-medium">
        {critical ? strings.runningLow : vi.exam.timerLabel}
      </div>
      <div aria-hidden>
        <Progress value={elapsedPercent} />
      </div>
      <div aria-hidden className="flex items-baseline justify-between gap-2 tabular-nums">
        <time dateTime={deadlineAt} className="text-lg font-semibold">
          {strings.left(formatClock(remaining))}
        </time>
        <span
          className={cn(
            "text-sm",
            critical ? "text-warning-foreground" : "text-muted-foreground",
          )}
        >
          {strings.of(formatClock(totalMs))}
        </span>
      </div>
    </div>
  );
}

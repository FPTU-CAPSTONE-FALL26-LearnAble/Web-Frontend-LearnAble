export type ScheduleTiming = "upcoming" | "today" | "past";

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Where a schedule stands compared with now: finished, on its exam day, or still ahead.
 * A schedule that already ended counts as past even when it ended earlier today.
 */
export function getScheduleTiming(startsAt: string, endsAt: string, now: Date = new Date()): ScheduleTiming {
  if (new Date(endsAt).getTime() < now.getTime()) return "past";
  return sameLocalDay(new Date(startsAt), now) || new Date(startsAt).getTime() <= now.getTime() ? "today" : "upcoming";
}

/** The border is always darker than the fill so the card edge stays visible. */
export const scheduleTimingStyle: Record<ScheduleTiming, { card: string; label: string }> = {
  upcoming: { card: "border-warning-foreground/60 bg-warning/40", label: "Upcoming" },
  today: { card: "border-success-border bg-success", label: "Exam day" },
  past: { card: "border-muted-foreground/50 bg-muted/50", label: "Finished" },
};

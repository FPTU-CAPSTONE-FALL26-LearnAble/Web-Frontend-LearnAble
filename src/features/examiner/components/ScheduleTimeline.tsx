const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
export const clock = (value: string) => timeFormat.format(new Date(value));

/** The share of the shift, from 0 to 100, that a moment falls at. */
export function shiftPercent(startsAt: string, endsAt: string, moment: string) {
  const total = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (total <= 0) return 0;
  const share = ((new Date(moment).getTime() - new Date(startsAt).getTime()) / total) * 100;
  return Math.min(100, Math.max(0, Math.round(share * 10) / 10));
}

export const minutesBetween = (from: string, to: string) => Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));

/**
 * The shift drawn as a bar: when students may come in, and the time that is left for the exam after
 * the doors close. It shows at a glance whether the entry window looks right.
 */
export function ScheduleTimeline({ startsAt, endsAt, entryOpensAt, entryClosesAt }: { startsAt: string; endsAt: string; entryOpensAt: string; entryClosesAt: string }) {
  const opens = shiftPercent(startsAt, endsAt, entryOpensAt);
  const closes = shiftPercent(startsAt, endsAt, entryClosesAt);
  const examMinutes = minutesBetween(entryClosesAt, endsAt);
  const summary = `Shift ${clock(startsAt)} to ${clock(endsAt)}. Students may enter from ${clock(entryOpensAt)} to ${clock(entryClosesAt)}, leaving ${examMinutes} minutes for the exam.`;
  return (
    <div className="space-y-3">
      <div role="img" aria-label={summary} className="relative h-4 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 rounded-full bg-primary/30" style={{ left: `${opens}%`, width: `${Math.max(0, closes - opens)}%` }} />
        <div className="absolute inset-y-0 rounded-r-full bg-primary" style={{ left: `${closes}%`, right: 0 }} />
      </div>
      <div aria-hidden className="flex justify-between text-xs font-semibold tabular-nums text-muted-foreground">
        <span>{clock(startsAt)}</span>
        <span>{clock(endsAt)}</span>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-sm bg-primary/30" /><span className="text-muted-foreground">Students come in</span><strong className="tabular-nums">{clock(entryOpensAt)}–{clock(entryClosesAt)}</strong></li>
        <li className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-sm bg-primary" /><span className="text-muted-foreground">Exam time after the doors close</span><strong className="tabular-nums">{examMinutes} min</strong></li>
      </ul>
    </div>
  );
}

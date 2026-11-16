import type { MyExamSchedule } from "@/api/exams";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "Monday 23 November 2026", in the device's time zone. */
export const formatExamDate = (iso: string) => dateFormat.format(new Date(iso));
/** "07:30", in the device's time zone. */
export const formatExamTime = (iso: string) => timeFormat.format(new Date(iso));

/**
 * Splits a student's exams into the ones still ahead (soonest first) and the
 * ones behind them (most recent first). An exam stays "upcoming" until it has
 * ended, so a running exam is not hidden under past exams.
 */
export function groupSchedules(items: MyExamSchedule[], now: number = Date.now()) {
  const time = (item: MyExamSchedule, key: "startsAt" | "endsAt") =>
    new Date(item.schedule[key]).getTime();
  const isPast = (item: MyExamSchedule) =>
    item.schedule.status === "Closed" || time(item, "endsAt") < now;
  return {
    upcoming: items
      .filter((item) => !isPast(item))
      .sort((a, b) => time(a, "startsAt") - time(b, "startsAt")),
    past: items
      .filter(isPast)
      .sort((a, b) => time(b, "startsAt") - time(a, "startsAt")),
  };
}

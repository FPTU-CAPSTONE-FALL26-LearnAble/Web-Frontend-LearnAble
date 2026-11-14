const pad = (value: number) => String(value).padStart(2, "0");
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MINUTE = 60_000;

/** Local HH:mm, 24-hour. */
export function formatClock(value: string | Date) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local calendar day as yyyy-MM-dd, which sorts and compares as text. */
export function dayKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

/** From the start of today through the end of the day `days` days ahead. */
export function dayWindow(now: Date, days: number) {
  const from = startOfDay(now);
  return { from, to: addDays(from, days + 1) };
}

/** "Monday, 9 November 2026". */
export function formatLongDate(value: Date) {
  return `${WEEKDAYS[value.getDay()]}, ${value.getDate()} ${MONTHS_LONG[value.getMonth()]} ${value.getFullYear()}`;
}

/** "9 Nov 2026". */
export function formatShortDate(value: string | Date) {
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Today", "Tomorrow", or "Mon 16 Nov". */
export function formatDayLabel(key: string, now: Date) {
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(addDays(now, 1))) return "Tomorrow";
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()].slice(0, 3)} ${day} ${MONTHS[month - 1]}`;
}

export function greetingFor(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDuration(milliseconds: number) {
  const minutes = Math.max(1, Math.round(milliseconds / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export type StartDescription = { state: "upcoming" | "live" | "ended"; text: string };

/** How far a shift is from starting, so a list can say "Starts in 45 min" instead of only a clock time. */
export function describeStart(startsAt: string, endsAt: string, now: Date): StartDescription {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const current = now.getTime();
  if (current >= end) return { state: "ended", text: "Ended" };
  if (current >= start) return { state: "live", text: `In progress · ends ${formatClock(endsAt)}` };
  const wait = start - current;
  if (wait < 24 * 60 * MINUTE) return { state: "upcoming", text: `Starts in ${formatDuration(wait)}` };
  return { state: "upcoming", text: `${formatDayLabel(dayKey(startsAt), now)}, ${formatClock(startsAt)}` };
}

/** Groups already-sorted items by local day, keeping their order. */
export function groupByDay<T>(items: T[], startOf: (item: T) => string) {
  const groups: Array<{ key: string; items: T[] }> = [];
  for (const item of items) {
    const key = dayKey(startOf(item));
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

/** Keeps the first `limit` items across day groups, dropping groups that end up empty. */
export function limitGroups<T>(groups: Array<{ key: string; items: T[] }>, limit: number) {
  let left = limit;
  return groups.flatMap((group) => {
    if (left <= 0) return [];
    const items = group.items.slice(0, left);
    left -= items.length;
    return [{ key: group.key, items }];
  });
}

export const plural =(count: number, noun: string, many = `${noun}s`) => `${count} ${count === 1 ? noun : many}`;

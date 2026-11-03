export type ScheduleTimeInput = {
  startsAt: string;
  endsAt: string;
  entryOpensAt: string;
  entryClosesAt: string;
  durationMinutes: number;
};

export function getScheduleTimeError(input: ScheduleTimeInput): string | null {
  const { startsAt, endsAt, entryOpensAt, entryClosesAt, durationMinutes } = input;
  if (!startsAt || !endsAt || !entryOpensAt || !entryClosesAt) {
    return "Complete all shift and entry times.";
  }

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const entryOpen = new Date(entryOpensAt).getTime();
  const entryClose = new Date(entryClosesAt).getTime();
  if ([start, end, entryOpen, entryClose].some(Number.isNaN)) {
    return "Enter valid shift and entry times.";
  }
  if (start >= end) return "Shift end must be after shift start.";
  if (entryOpen < start || entryOpen > end) {
    return "Entry opens must be within the exam shift.";
  }
  if (entryClose <= entryOpen || entryClose > end) {
    return "Entry closes must be after entry opens and within the exam shift.";
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return "The selected exam must have a valid duration.";
  }
  if (end - entryClose < durationMinutes * 60_000) {
    return `Keep at least ${durationMinutes} minutes between entry closing and shift end for the full exam duration.`;
  }
  return null;
}

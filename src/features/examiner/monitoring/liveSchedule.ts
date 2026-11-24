type ScheduleWindow = {
  status: string;
  startsAt: string;
  endsAt: string;
};

/** A stale Open status must not keep an ended schedule in live operations. */
export function isScheduleLive(schedule: ScheduleWindow, now: number) {
  const startsAt = Date.parse(schedule.startsAt);
  const endsAt = Date.parse(schedule.endsAt);
  return (
    schedule.status === "Open" &&
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt <= now &&
    now < endsAt
  );
}

import { describe, expect, it } from "vitest";
import { isScheduleLive } from "./liveSchedule";

const now = Date.parse("2026-11-23T09:00:00Z");

describe("isScheduleLive", () => {
  it("shows only an open schedule inside its time window", () => {
    expect(
      isScheduleLive(
        {
          status: "Open",
          startsAt: "2026-11-23T08:00:00Z",
          endsAt: "2026-11-23T10:00:00Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("hides stale open schedules after their end time", () => {
    expect(
      isScheduleLive(
        {
          status: "Open",
          startsAt: "2026-11-17T08:00:00Z",
          endsAt: "2026-11-17T10:00:00Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("hides future, closed and invalid schedules", () => {
    expect(
      isScheduleLive(
        {
          status: "Open",
          startsAt: "2026-11-24T08:00:00Z",
          endsAt: "2026-11-24T10:00:00Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isScheduleLive(
        {
          status: "Closed",
          startsAt: "2026-11-23T08:00:00Z",
          endsAt: "2026-11-23T10:00:00Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isScheduleLive(
        { status: "Open", startsAt: "invalid", endsAt: "invalid" },
        now,
      ),
    ).toBe(false);
  });
});

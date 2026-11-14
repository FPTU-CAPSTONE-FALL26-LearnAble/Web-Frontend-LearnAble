import { describe, expect, it } from "vitest";
import { getScheduleTimeError } from "./scheduleValidation";

const valid = {
  startsAt: "2026-11-16T10:00",
  entryOpensAt: "2026-11-16T10:00",
  entryClosesAt: "2026-11-16T10:15",
  endsAt: "2026-11-16T11:45",
  durationMinutes: 90,
};

describe("getScheduleTimeError", () => {
  it("accepts an entry window inside a shift with enough exam time", () => {
    expect(getScheduleTimeError(valid)).toBeNull();
  });

  it("rejects entry opening before the shift", () => {
    expect(getScheduleTimeError({ ...valid, entryOpensAt: "2026-11-16T09:30" })).toMatch(/within the exam shift/i);
  });

  it("rejects a shift that cannot fit the exam after entry closes", () => {
    expect(getScheduleTimeError({ ...valid, endsAt: "2026-11-16T11:30" })).toMatch(/at least 90 minutes/i);
  });
});

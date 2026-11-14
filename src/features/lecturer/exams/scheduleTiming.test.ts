import { getScheduleTiming, scheduleTimingStyle } from "./scheduleTiming";

const now = new Date(2026, 10, 14, 9, 0); // 14 Nov 2026, 09:00 local

describe("getScheduleTiming", () => {
  it("calls a schedule on a later day upcoming", () => {
    expect(getScheduleTiming(new Date(2026, 10, 20, 7, 10).toISOString(), new Date(2026, 10, 20, 8, 40).toISOString(), now)).toBe("upcoming");
  });
  it("calls a schedule that starts later the same day today", () => {
    expect(getScheduleTiming(new Date(2026, 10, 14, 13, 0).toISOString(), new Date(2026, 10, 14, 14, 30).toISOString(), now)).toBe("today");
  });
  it("calls a schedule in progress today", () => {
    expect(getScheduleTiming(new Date(2026, 10, 14, 7, 10).toISOString(), new Date(2026, 10, 14, 10, 0).toISOString(), now)).toBe("today");
  });
  it("calls a schedule that already ended past, even when it ended earlier today", () => {
    expect(getScheduleTiming(new Date(2026, 10, 14, 7, 10).toISOString(), new Date(2026, 10, 14, 8, 40).toISOString(), now)).toBe("past");
    expect(getScheduleTiming(new Date(2026, 9, 24, 19, 0).toISOString(), new Date(2026, 9, 24, 22, 0).toISOString(), now)).toBe("past");
  });
});

describe("scheduleTimingStyle", () => {
  it("gives every state a visible border and a text label, not only a colour", () => {
    for (const style of Object.values(scheduleTimingStyle)) {
      expect(style.card).toMatch(/border-/);
      expect(style.card).toMatch(/bg-/);
      expect(style.label.length).toBeGreaterThan(0);
    }
  });
});

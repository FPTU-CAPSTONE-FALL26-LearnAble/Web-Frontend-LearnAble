import { describe, expect, it } from "vitest";
import { addDays, dayKey, describeStart, formatClock, formatDayLabel, formatLongDate, formatShortDate, greetingFor, groupByDay, limitGroups, plural, startOfDay } from "./dashboardTime";

const at = (value: string) => new Date(value);
const now = at("2026-11-09T10:00");

describe("dashboard time helpers", () => {
  it("formats local clock time and calendar day", () => {
    expect(formatClock("2026-11-09T07:05")).toBe("07:05");
    expect(dayKey("2026-11-09T23:59")).toBe("2026-11-09");
    expect(formatLongDate(now)).toBe("Monday, 9 November 2026");
  });

  it("formats a short date", () => {
    expect(formatShortDate("2026-11-09T10:00")).toBe("9 Nov 2026");
    expect(formatShortDate(new Date("2027-01-05T00:00"))).toBe("5 Jan 2027");
  });

  it("labels days relative to now", () => {
    expect(formatDayLabel("2026-11-09", now)).toBe("Today");
    expect(formatDayLabel("2026-11-10", now)).toBe("Tomorrow");
    expect(formatDayLabel("2026-11-16", now)).toBe("Mon 16 Nov");
    expect(formatDayLabel("2026-12-01", now)).toBe("Tue 1 Dec");
  });

  it("moves days across a month end and starts the day at midnight", () => {
    expect(dayKey(addDays(at("2026-11-30T12:00"), 1))).toBe("2026-12-01");
    expect(formatClock(startOfDay(now))).toBe("00:00");
  });

  it("greets by time of day", () => {
    expect(greetingFor(at("2026-11-09T07:00"))).toBe("Good morning");
    expect(greetingFor(at("2026-11-09T12:00"))).toBe("Good afternoon");
    expect(greetingFor(at("2026-11-09T19:30"))).toBe("Good evening");
  });

  describe("describeStart", () => {
    const shift = { startsAt: "2026-11-09T13:30", endsAt: "2026-11-09T15:00" };
    it.each([
      ["2026-11-09T13:00", "upcoming", "Starts in 30 min"],
      ["2026-11-09T11:15", "upcoming", "Starts in 2h 15m"],
      ["2026-11-09T11:30", "upcoming", "Starts in 2h"],
      ["2026-11-09T13:29:30", "upcoming", "Starts in 1 min"],
      ["2026-11-09T14:00", "live", "In progress · ends 15:00"],
      ["2026-11-09T15:00", "ended", "Ended"],
    ])("at %s is %s", (time, state, text) => {
      expect(describeStart(shift.startsAt, shift.endsAt, at(time))).toEqual({ state, text });
    });

    it("names the day when the shift is more than a day away", () => {
      expect(describeStart("2026-11-12T07:10", "2026-11-12T08:40", now)).toEqual({ state: "upcoming", text: "Thu 12 Nov, 07:10" });
    });
  });

  it("groups sorted items by day in order", () => {
    const items = [{ at: "2026-11-09T08:00" }, { at: "2026-11-09T14:00" }, { at: "2026-11-10T08:00" }];
    const groups = groupByDay(items, (item) => item.at);
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([["2026-11-09", 2], ["2026-11-10", 1]]);
  });

  it("limits items across groups and drops groups left empty", () => {
    const groups = [{ key: "a", items: [1, 2, 3] }, { key: "b", items: [4, 5] }, { key: "c", items: [6] }];
    expect(limitGroups(groups, 4)).toEqual([{ key: "a", items: [1, 2, 3] }, { key: "b", items: [4] }]);
    expect(limitGroups(groups, 0)).toEqual([]);
    expect(limitGroups(groups, 99)).toHaveLength(3);
  });

  it("pluralises counts", () => {
    expect(plural(1, "shift")).toBe("1 shift");
    expect(plural(3, "shift")).toBe("3 shifts");
    expect(plural(0, "registration")).toBe("0 registrations");
  });
});

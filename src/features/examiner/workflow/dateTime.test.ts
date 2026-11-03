import { describe, expect, it } from "vitest";
import { combineLocalDateTime, copyLocalDate, formatDateEntry, formatTimeEntry, localDatePrefix, splitLocalDateTime } from "./dateTime";

describe("exam schedule date and time", () => {
  it("displays Backend-compatible local values as DD/MM/YYYY", () => {
    expect(splitLocalDateTime("2026-11-03T13:30")).toEqual({
      date: "03/11/2026",
      time: "13:30",
    });
  });

  it("formats typed date digits and combines them for the API payload", () => {
    expect(formatDateEntry("03112026")).toBe("03/11/2026");
    expect(formatTimeEntry("1330")).toBe("13:30");
    expect(combineLocalDateTime("03/11/2026", "13:30")).toBe("2026-11-03T13:30");
  });

  it("rejects impossible dates", () => {
    expect(combineLocalDateTime("31/02/2026", "13:30")).toBeNull();
  });

  it("copies the shift date while preserving an existing entry time", () => {
    expect(copyLocalDate("2026-11-03T13:00", "2026-10-20T13:15")).toBe("2026-11-03T13:15");
    expect(copyLocalDate("2026-11-03T13:00", "")).toBe("2026-11-03T13:00");
  });

  it("copies a completed date before a time has been entered", () => {
    expect(localDatePrefix("04/11/2026")).toBe("2026-11-04T");
    expect(copyLocalDate("2026-11-04T", "")).toBe("2026-11-04T");
    expect(splitLocalDateTime("2026-11-04T")).toEqual({ date: "04/11/2026", time: "" });
  });
});

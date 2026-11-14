import { describe, expect, it, vi } from "vitest";
import type { MyExamSchedule } from "@/api/exams";
import { buildAttention, buildOverview, countByStatus, featuredShift, SHORTCUTS, shiftWindow, splitShifts } from "./lecturerDashboard";

const now = new Date("2026-11-09T10:00");
const shift = (id: string, start: string, end: string, status = "Published", invigilatorRole: "Chief" | "Assistant" | null = "Chief") =>
  ({ schedule: { examScheduleId: id, examName: id, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), status }, seatCode: null, invigilatorRole }) as MyExamSchedule;

describe("shiftWindow", () => {
  it("covers today and the next 30 days", () => {
    const { from, to } = shiftWindow(now);
    expect(from.getHours()).toBe(0);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(31);
  });
});

describe("splitShifts and featuredShift", () => {
  const all = [
    shift("later", "2026-11-12T07:10", "2026-11-12T08:40"),
    shift("done", "2026-11-09T07:10", "2026-11-09T08:40", "Closed"),
    shift("live", "2026-11-09T09:30", "2026-11-09T11:00", "Open"),
    shift("cancelled", "2026-11-09T12:00", "2026-11-09T13:30", "Cancelled"),
    shift("yesterday", "2026-11-08T07:10", "2026-11-08T08:40"),
  ];

  it("orders the shifts from today on and drops cancelled and earlier ones", () => {
    const { relevant, groups } = splitShifts(all, now);
    expect(relevant.map((item) => item.schedule.examScheduleId)).toEqual(["done", "live", "later"]);
    expect(groups.map((group) => group.key)).toEqual(["2026-11-09", "2026-11-12"]);
  });

  it("features the shift in progress before later ones", () => {
    expect(featuredShift(splitShifts(all, now).relevant, now)?.schedule.examScheduleId).toBe("live");
  });

  it("features the next shift once today's are over, or nothing", () => {
    expect(featuredShift(splitShifts(all, new Date("2026-11-09T12:00")).relevant, new Date("2026-11-09T12:00"))?.schedule.examScheduleId).toBe("later");
    expect(featuredShift([], now)).toBeUndefined();
  });
});

describe("buildOverview", () => {
  const byKey = (stats: ReturnType<typeof buildOverview>) => Object.fromEntries(stats.map((stat) => [stat.key, stat]));
  const data = {
    questions: { Active: 12, Draft: 3, Archived: 1 },
    materials: { Published: 4, Draft: 2, Archived: 0 },
    shifts: splitShifts([shift("live", "2026-11-09T09:30", "2026-11-09T11:00", "Open"), shift("later", "2026-11-12T07:10", "2026-11-12T08:40")], now).relevant,
  };

  it("gives three headline numbers with what stands behind each", () => {
    const stats = byKey(buildOverview(data, now));
    expect(stats.questions).toMatchObject({ value: "16", detail: "12 active · 3 draft", to: "/lecturer/questions" });
    expect(stats.materials).toMatchObject({ value: "6", detail: "4 published · 2 draft", to: "/lecturer/materials" });
    expect(stats.shifts).toMatchObject({ value: "2", detail: "One in progress now", to: "/lecturer/exams" });
    expect(stats.registration).toBeUndefined();
  });

  it("names the next shift when none is in progress, and says when there are none", () => {
    const later = splitShifts([shift("later", "2026-11-12T07:10", "2026-11-12T08:40")], now).relevant;
    expect(byKey(buildOverview({ ...data, shifts: later }, now)).shifts.detail).toBe("Next: Thu 12 Nov, 07:10");
    expect(byKey(buildOverview({ ...data, shifts: [] }, now)).shifts).toMatchObject({ value: "0", detail: "None scheduled" });
  });

  it("shows a dash for data that did not load without hiding the rest", () => {
    const stats = byKey(buildOverview({ questions: data.questions }, now));
    expect(stats.questions.value).toBe("16");
    expect(stats.materials).toMatchObject({ value: "—", detail: "Not available" });
    expect(stats.shifts).toMatchObject({ value: "—", detail: "Not available" });
  });

  it("is fully populated even when there is nothing yet", () => {
    const stats = byKey(buildOverview({ questions: {}, materials: {}, shifts: [] }, now));
    expect(stats.questions).toMatchObject({ value: "0", detail: "0 active · 0 draft" });
  });
});

describe("SHORTCUTS", () => {
  it("links the jobs a lecturer does most", () => {
    expect(SHORTCUTS.map((item) => item.to)).toEqual([
      "/lecturer/questions/new?purpose=exam",
      "/lecturer/questions/import",
      "/lecturer/materials/new",
      "/lecturer/exam-papers/new/setup",
      "/lecturer/grading",
    ]);
  });
});

describe("countByStatus", () => {
  it("reads each status once and keeps the totals by name", async () => {
    const read = vi.fn(async (status: string) => ({ totalCount: status.length }));
    await expect(countByStatus(["Active", "Draft"], read)).resolves.toEqual({ Active: 6, Draft: 5 });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("fails as a whole when one status cannot be read", async () => {
    await expect(countByStatus(["Active", "Draft"], async (status) => { if (status === "Draft") throw new Error("down"); return { totalCount: 1 }; })).rejects.toThrow("down");
  });
});

describe("buildAttention", () => {
  it("lists only what needs action", () => {
    const items = buildAttention({ draftQuestions: 4, draftMaterials: 0 });
    expect(items.map((item) => [item.key, item.count])).toEqual([["questions", 4]]);
    expect(items[0].to).toBe("/lecturer/questions");
  });

  it("is empty when everything is in order", () => {
    expect(buildAttention({ draftQuestions: 0, draftMaterials: 0 })).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { ExamPaper, ExamRoom, ExamSchedule } from "@/api/exams";
import { buildAttention, buildFlow, buildOverview, countPapers, leadingRooms, nextShift, recentPapers, roomStats, scheduleWindow, splitSchedules, summarizeToday } from "./examinerDashboard";

const now = new Date("2026-11-09T10:00");
const shift = (id: string, start: string, end: string, status: ExamSchedule["status"] = "Published") =>
  ({ examScheduleId: id, examName: id, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), status }) as ExamSchedule;
const paper = (status: string) => ({ status }) as ExamPaper;

describe("scheduleWindow", () => {
  it("runs from the start of today through the lookahead", () => {
    const { from, to } = scheduleWindow(now);
    expect(from.getHours()).toBe(0);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(31);
  });
});

describe("splitSchedules", () => {
  const all = [
    shift("later", "2026-11-12T07:10", "2026-11-12T08:40"),
    shift("afternoon", "2026-11-09T14:00", "2026-11-09T15:30"),
    shift("past-day", "2026-11-08T07:10", "2026-11-08T08:40"),
    shift("cancelled", "2026-11-09T09:00", "2026-11-09T10:30", "Cancelled"),
    shift("morning", "2026-11-09T07:10", "2026-11-09T08:40", "Closed"),
    shift("tomorrow", "2026-11-10T09:00", "2026-11-10T10:30"),
  ];

  it("keeps today's shifts in time order, including ones that already ended", () => {
    expect(splitSchedules(all, now).today.map((item) => item.examScheduleId)).toEqual(["morning", "afternoon"]);
  });

  it("drops cancelled shifts and earlier days, and groups the rest by day", () => {
    const { laterGroups } = splitSchedules(all, now);
    expect(laterGroups.map((group) => [group.key, group.items.map((item) => item.examScheduleId)])).toEqual([
      ["2026-11-10", ["tomorrow"]],
      ["2026-11-12", ["later"]],
    ]);
  });

  it("is empty when nothing is scheduled", () => {
    expect(splitSchedules([], now)).toMatchObject({ today: [], later: [], laterGroups: [] });
  });
});

describe("summarizeToday", () => {
  it("counts shifts, those open now and those still to start", () => {
    const today = [shift("a", "2026-11-09T07:10", "2026-11-09T08:40", "Closed"), shift("b", "2026-11-09T09:30", "2026-11-09T11:00", "Open"), shift("c", "2026-11-09T14:00", "2026-11-09T15:30")];
    expect(summarizeToday(today, now)).toBe("3 exam shifts today · 1 open now · 1 still to start");
  });

  it("uses the singular and omits zero parts", () => {
    expect(summarizeToday([shift("a", "2026-11-09T07:10", "2026-11-09T08:40", "Closed")], now)).toBe("1 exam shift today");
  });

  it("says so when there are none", () => {
    expect(summarizeToday([], now)).toBe("No exam shifts today");
  });
});

describe("nextShift", () => {
  it("prefers a later shift today over a later day", () => {
    const today = [shift("done", "2026-11-09T07:10", "2026-11-09T08:40"), shift("soon", "2026-11-09T14:00", "2026-11-09T15:30")];
    expect(nextShift(today, [shift("tomorrow", "2026-11-10T07:10", "2026-11-10T08:40")], now)?.examScheduleId).toBe("soon");
  });

  it("falls back to the first later shift, or nothing", () => {
    const later = [shift("tomorrow", "2026-11-10T07:10", "2026-11-10T08:40")];
    expect(nextShift([shift("done", "2026-11-09T07:10", "2026-11-09T08:40")], later, now)?.examScheduleId).toBe("tomorrow");
    expect(nextShift([], [], now)).toBeUndefined();
  });
});

describe("buildAttention", () => {
  it("lists only what needs action, with counts and where to act", () => {
    const items = buildAttention({
        papers: [paper("Draft"), paper("Draft"), paper("Published")],
        schedules: [shift("d", "2026-11-12T07:10", "2026-11-12T08:40", "Draft"), shift("p", "2026-11-13T07:10", "2026-11-13T08:40")],
      });
    expect(items.map((item) => [item.key, item.count])).toEqual([["papers", 2], ["schedules", 1]]);
    expect(items.find((item) => item.key === "papers")?.to).toBe("/examiner/exams");
  });

  it("is empty when everything is in order", () => {
    expect(buildAttention({ papers: [paper("Published")], schedules: [] })).toEqual([]);
  });

  it("no longer asks the examiner to manage lecturer registration", () => {
    const keys = buildAttention({ papers: [paper("Draft")], schedules: [shift("d", "2026-11-12T07:10", "2026-11-12T08:40", "Draft")] }).map((item) => item.key);
    expect(keys.some((key) => key.startsWith("periods"))).toBe(false);
  });
});

describe("roomStats", () => {
  it("counts active rooms and their seats", () => {
    const rooms = [{ isActive: true, capacity: 30 }, { isActive: true }, { isActive: false, capacity: 99 }] as ExamRoom[];
    expect(roomStats(rooms)).toEqual({ active: 2, total: 3, seats: 30 });
  });
});

describe("buildOverview", () => {
  const data = {
    papers: [paper("Draft"), paper("Published"), paper("Published")],
    schedules: [shift("a", "2026-11-09T09:30", "2026-11-09T11:00", "Open"), shift("b", "2026-11-10T09:00", "2026-11-10T10:30")],
    rooms: [{ isActive: true, capacity: 30 }, { isActive: false, capacity: 20 }] as ExamRoom[],
  };
  const byKey = (stats: ReturnType<typeof buildOverview>) => Object.fromEntries(stats.map((stat) => [stat.key, stat]));

  it("gives three headline numbers with what stands behind each", () => {
    const stats = byKey(buildOverview(data, now));
    expect(stats.papers).toMatchObject({ value: "3", detail: "2 published · 1 draft", to: "/examiner/exams" });
    expect(stats.shifts).toMatchObject({ value: "2", detail: "1 open now", to: "/examiner/schedule" });
    expect(stats.rooms).toMatchObject({ value: "1", detail: "of 2 · 30 seats" });
    expect(stats.rooms.to).toBeUndefined();
    expect(stats.registration).toBeUndefined();
  });

  it("names the next shift when none is open, and says when nothing is scheduled", () => {
    expect(byKey(buildOverview({ ...data, schedules: [shift("b", "2026-11-10T09:00", "2026-11-10T10:30")] }, now)).shifts.detail).toBe("Next: Tomorrow, 09:00");
    expect(byKey(buildOverview({ ...data, schedules: [] }, now)).shifts).toMatchObject({ value: "0", detail: "None scheduled" });
  });

  it("shows a dash for data that did not load without hiding the rest", () => {
    const stats = byKey(buildOverview({ papers: data.papers }, now));
    expect(stats.papers.value).toBe("3");
    expect(stats.shifts).toMatchObject({ value: "—", detail: "Not available" });
  });

  it("is fully populated even when there is nothing yet", () => {
    const stats = byKey(buildOverview({ papers: [], schedules: [], rooms: [] }, now));
    expect(stats.papers).toMatchObject({ value: "0", detail: "0 published · 0 draft" });
    expect(stats.rooms).toMatchObject({ value: "0", detail: "of 0" });
  });
});

describe("buildFlow", () => {
  const stepOf = (flow: ReturnType<typeof buildFlow>, key: string) => flow.find((step) => step.key === key)!;

  it("starts every stage as not started when there is nothing yet, with the way to begin", () => {
    const flow = buildFlow({ papers: [], schedules: [] }, now);
    expect(flow.map((step) => step.status.label)).toEqual(["Not started", "Not started", "Standby"]);
    expect(stepOf(flow, "papers").summary).toMatch(/No exam papers yet/);
    expect(stepOf(flow, "schedule").summary).toMatch(/No exam shifts planned/);
    expect(flow.some((step) => step.key === "registration")).toBe(false);
  });

  it("shows progress through the stages", () => {
    const flow = buildFlow(
      {
        papers: [paper("Draft"), paper("Published")],
        schedules: [shift("a", "2026-11-09T09:30", "2026-11-09T11:00", "Open"), shift("d", "2026-11-12T07:10", "2026-11-12T08:40", "Draft")],
      },
      now,
    );
    expect(stepOf(flow, "papers")).toMatchObject({ status: { label: "In progress" }, summary: "1 paper in draft · 1 published" });
    expect(stepOf(flow, "schedule")).toMatchObject({ status: { label: "In progress" }, summary: "2 shifts in the next 30 days · 1 not published" });
    expect(stepOf(flow, "operate")).toMatchObject({ status: { label: "Live" } });
  });

  it("marks finished stages ready and scheduled", () => {
    const flow = buildFlow({ papers: [paper("Published")], schedules: [shift("p", "2026-11-12T07:10", "2026-11-12T08:40")] }, now);
    expect(flow.map((step) => step.status.label).slice(0, 2)).toEqual(["Ready", "Scheduled"]);
  });

  it("marks a stage unavailable when its data did not load, and links every step", () => {
    const flow = buildFlow({}, now);
    expect(flow.slice(0, 2).map((step) => step.status.label)).toEqual(["Unavailable", "Unavailable"]);
    expect(flow.every((step) => step.actions.length > 0)).toBe(true);
    expect(stepOf(flow, "operate").actions.map((action) => action.to)).toEqual(["/examiner/monitoring", "/examiner/results"]);
  });
});

describe("recentPapers and leadingRooms", () => {
  it("lists the newest papers first, up to the limit", () => {
    const papers = ["2026-11-01", "2026-11-08", "2026-11-05"].map((createdAt, index) => ({ ...paper("Draft"), examPaperId: String(index), createdAt })) as ExamPaper[];
    expect(recentPapers(papers, 2).map((item) => item.createdAt)).toEqual(["2026-11-08", "2026-11-05"]);
  });

  it("lists active rooms first, then by code", () => {
    const rooms = [{ roomCode: "B", isActive: false }, { roomCode: "C", isActive: true }, { roomCode: "A", isActive: true }] as ExamRoom[];
    expect(leadingRooms(rooms).map((room) => room.roomCode)).toEqual(["A", "C", "B"]);
    expect(leadingRooms(rooms, 1)).toHaveLength(1);
  });
});

describe("countPapers", () => {
  it("counts papers by status", () => {
    expect(countPapers([paper("Draft"), paper("Published"), paper("Draft")], "Draft")).toBe(2);
  });
});

import type { ExamSchedule } from "@/api/exams";
import { getDraftAndHistoricalSchedules, getPublishedAndOperationalSchedules, prioritizePublishedSchedules } from "./ExamScheduleDashboardRoute";

const shift = (examScheduleId: string, status: ExamSchedule["status"]): ExamSchedule => ({
  examScheduleId,
  examSubjectId: "exam-subject-1",
  examShiftId: "shift-1",
  examRoomId: "room-1",
  examName: "CSD201 Final",
  roomName: "Lab 201",
  startsAt: "2026-11-17T08:00:00Z",
  endsAt: "2026-11-17T09:30:00Z",
  entryOpensAt: "2026-11-17T07:45:00Z",
  entryClosesAt: "2026-11-17T08:15:00Z",
  status,
});

describe("prioritizePublishedSchedules", () => {
  it("places published shifts before every other status", () => {
    const result = prioritizePublishedSchedules([
      shift("draft", "Draft"),
      shift("cancelled", "Cancelled"),
      shift("published", "Published"),
      shift("open", "Open"),
    ]);

    expect(result.map((item) => item.examScheduleId)).toEqual(["published", "open", "draft", "cancelled"]);
  });

  it("keeps published and open shifts even after their start time", () => {
    const futurePublished = { ...shift("future-published", "Published"), startsAt: "2026-11-18T08:00:00Z" };
    const pastPublished = { ...shift("past-published", "Published"), startsAt: "2026-11-16T08:00:00Z" };
    const open = { ...shift("open", "Open"), startsAt: "2026-11-17T07:00:00Z" };
    const futureDraft = { ...shift("future-draft", "Draft"), startsAt: "2026-11-18T09:00:00Z" };
    const cancelled = { ...shift("cancelled", "Cancelled"), startsAt: "2026-11-18T10:00:00Z" };

    const result = getPublishedAndOperationalSchedules([pastPublished, futureDraft, open, cancelled, futurePublished]);

    expect(result.map((item) => item.examScheduleId)).toEqual(["past-published", "future-published", "open"]);
  });

  it("keeps draft, closed and cancelled shifts in the secondary list", () => {
    const result = getDraftAndHistoricalSchedules([
      shift("cancelled", "Cancelled"),
      shift("published", "Published"),
      shift("closed", "Closed"),
      shift("draft", "Draft"),
    ]);

    expect(result.map((item) => item.examScheduleId)).toEqual(["draft", "closed", "cancelled"]);
  });
});

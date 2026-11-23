import type { MyExamSchedule } from "@/api/exams";
import { canTakeAttendance, groupLecturerSchedules } from "./ExamScheduleRoute";

const assignment = (id: string, startsAt: string, endsAt: string): MyExamSchedule => ({
  schedule: {
    examScheduleId: id,
    examSubjectId: "subject-1",
    examName: id,
    examShiftId: "shift-1",
    examRoomId: "room-1",
    roomName: "Lab 201",
    startsAt,
    endsAt,
    entryOpensAt: startsAt,
    entryClosesAt: endsAt,
    status: "Published",
  },
  seatCode: null,
  invigilatorRole: "Chief",
});

describe("groupLecturerSchedules", () => {
  it("groups current, upcoming and old assignments with useful ordering", () => {
    const groups = groupLecturerSchedules([
      assignment("oldest", "2026-11-10T08:00:00Z", "2026-11-10T09:00:00Z"),
      assignment("next", "2026-11-18T08:00:00Z", "2026-11-18T09:00:00Z"),
      assignment("today", "2026-11-17T08:00:00Z", "2026-11-17T10:00:00Z"),
      assignment("recent", "2026-11-16T08:00:00Z", "2026-11-16T09:00:00Z"),
    ], new Date("2026-11-17T09:00:00Z"));

    expect(groups.today.map((item) => item.schedule.examScheduleId)).toEqual(["today"]);
    expect(groups.upcoming.map((item) => item.schedule.examScheduleId)).toEqual(["next"]);
    expect(groups.past.map((item) => item.schedule.examScheduleId)).toEqual(["recent", "oldest"]);
  });

  it("allows attendance on a published shift once its entry window opens", () => {
    const item = assignment("today", "2026-11-23T08:45:00Z", "2026-11-23T16:55:00Z");
    item.schedule.entryOpensAt = "2026-11-23T08:30:00Z";

    expect(canTakeAttendance(item, new Date("2026-11-23T08:40:00Z"))).toBe(true);
    expect(canTakeAttendance(item, new Date("2026-11-23T08:20:00Z"))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { ExamSchedule } from "@/api/exams";
import type { ExamGradebook } from "@/api/grading";
import {
  currentSemester,
  isScheduleEligible,
  needsGrading,
} from "./GradingScheduleQueue";

const now = new Date("2026-11-23T10:00:00Z");
const semester = {
  semesterId: "fall-26",
  startDate: "2026-09-07T00:00:00Z",
  endDate: "2026-12-25T23:59:59Z",
  status: "Active",
};
const schedule = (values: Partial<ExamSchedule> = {}) =>
  ({
    startsAt: "2026-11-22T08:00:00Z",
    endsAt: "2026-11-22T09:30:00Z",
    status: "Closed",
    ...values,
  }) as ExamSchedule;
const gradebook = (values: Partial<ExamGradebook> = {}) =>
  ({
    submitted: 2,
    ungraded: 1,
    needsManual: 1,
    unreviewed: 1,
    unconfirmedMarking: 0,
    pendingIntegrityReviews: 0,
    canRelease: false,
    releasedAt: null,
    ...values,
  }) as ExamGradebook;

describe("grading schedule queue", () => {
  it("chooses the active semester", () => {
    expect(
      currentSemester(
        [
          { ...semester, status: "Closed" },
          { ...semester, semesterId: "active", status: "Active" },
        ],
        now,
      )?.semesterId,
    ).toBe("active");
  });

  it("keeps only completed schedules in this semester", () => {
    expect(isScheduleEligible(schedule(), semester, now)).toBe(true);
    expect(
      isScheduleEligible(schedule({ status: "Cancelled" }), semester, now),
    ).toBe(false);
    expect(
      isScheduleEligible(
        schedule({ endsAt: "2026-11-24T09:30:00Z" }),
        semester,
        now,
      ),
    ).toBe(false);
  });

  it("shows unfinished grading and hides released or empty gradebooks", () => {
    expect(needsGrading(gradebook())).toBe(true);
    expect(needsGrading(gradebook({ releasedAt: now.toISOString() }))).toBe(
      false,
    );
    expect(needsGrading(gradebook({ submitted: 0 }))).toBe(false);
  });
});

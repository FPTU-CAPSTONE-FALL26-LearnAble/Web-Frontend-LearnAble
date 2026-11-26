import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

import { assignAttemptGrader, getLecturerGradingAssignments, gradebookSchema, gradeEssayQuestion, updateMarkingCompletion, reviewAttemptResult } from "./grading";

describe("grading API", () => {
  beforeEach(() => { client.request.mockReset(); });

  it.each([null, { success: true, data: null, message: null }, { success: true, data: { attemptId: "attempt-1" } }])("accepts review success without requiring a grading detail (%j)", async (reply) => {
    client.request.mockImplementation(async (_path, schema) => schema.parse(reply));
    await expect(reviewAttemptResult("attempt-1", "revision-1", { reviewed: true, note: null })).resolves.toBeUndefined();
    expect(client.request).toHaveBeenCalledWith("/exam-attempts/attempt-1/grading/review", expect.anything(), {
      method: "PUT", headers: { "If-Match": '"attempt1-revision1"' }, json: { reviewed: true, note: null },
    });
  });

  it("keeps a failed review response as an error", async () => {
    client.request.mockResolvedValue({ success: false, data: null, message: "Review is locked", errors: null });
    await expect(reviewAttemptResult("attempt-1", "revision-1", { reviewed: true })).rejects.toThrow();
  });

  it("accepts the current Backend assignment completion fields", async () => {
    const assignment = {
      attemptId: "11111111-1111-1111-1111-111111111111",
      revision: "22222222-2222-2222-2222-222222222222",
      lecturerId: "33333333-3333-3333-3333-333333333333",
      assignedBy: null,
      assignedAt: "2026-11-07T12:00:00Z",
      assignmentNote: null,
      gradingStatus: "ManualReview",
      markingCompletedAt: "2026-11-07T13:00:00Z",
      markingCompletedBy: "33333333-3333-3333-3333-333333333333",
    };
    client.request.mockResolvedValue({
      success: true,
      message: null,
      errors: null,
      data: { items: [assignment], totalCount: 1, pageNumber: 1, pageSize: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    await expect(getLecturerGradingAssignments()).resolves.toMatchObject({ items: [assignment] });
    expect(client.request).toHaveBeenCalledWith("/lecturer/grading-assignments?Page=1&PageSize=100", expect.anything(), undefined);
  });

  it("accepts the current gradebook participation and integrity fields", () => {
    const currentGradebook = {
      scheduleId: "schedule-1", revision: "revision-1", registered: 1, absent: 0, active: 0,
      submitted: 1, ungraded: 0, needsManual: 0, unreviewed: 0, canRelease: false,
      blockingReasons: null, releasedAt: null, releasedBy: null, unconfirmedMarking: 0,
      pendingIntegrityReviews: 1, invalidated: 0,
      results: {
        items: [{
          enrollmentId: "enrollment-1", studentId: "student-1", userCode: null, fullName: null,
          attemptId: "attempt-1", attemptStatus: "Submitted", autoScore: 8, manualScore: null,
          totalScore: 8, maxScore: 10, gradingStatus: "Graded", lecturerId: null,
          reviewedAt: null, reviewedBy: null, requiresMarkingConfirmation: false,
          markingCompletedAt: null, markingCompletedBy: null, attendanceStatus: "Present",
          participationStatus: "Submitted", participationLabel: "Submitted", integrityStatus: "PendingReview",
        }],
        totalCount: 1, pageNumber: 1, pageSize: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
      },
    };

    expect(gradebookSchema.parse(currentGradebook)).toMatchObject({
      pendingIntegrityReviews: 1,
      blockingReasons: [],
      results: { items: [{ fullName: "Unknown student", participationLabel: "Submitted", integrityStatus: "PendingReview" }] },
    });
  });

  it("accepts the documented empty success responses for grading writes", async () => {
    client.request.mockResolvedValue(null);

    await expect(assignAttemptGrader("attempt-1", "revision-1", { lecturerId: "lecturer-1" })).resolves.toBeUndefined();
    await expect(gradeEssayQuestion("attempt-1", "question-1", "revision-1", { score: 4 })).resolves.toBeUndefined();
    await expect(updateMarkingCompletion("attempt-1", "revision-1", true)).resolves.toBeUndefined();
  });
});

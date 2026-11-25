import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPracticeGrading, gradePracticeQuestion } from "./practiceSessions";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ request, requestBlob: vi.fn(), envelopeFailure: vi.fn() }));

const grading = {
  attemptId: "attempt-1", revision: "revision-1", questions: [{
    attemptQuestionId: "question-1", position: 1, questionType: "Essay", content: "Explain a tree.",
    answerText: "A connected acyclic graph.", referenceAnswer: null, gradingCriteria: null,
    maxScore: 10, score: null, gradingMethod: "Manual", gradedBy: null, gradedAt: null, feedback: null,
    options: [], selectedOptionIds: [], images: [], answerFormat: null,
  }],
};

describe("practice grading API", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ success: true, data: grading });
  });

  it("loads an attempt's answers from the Lecturer endpoint", async () => {
    const result = await getPracticeGrading("session-1", "attempt-1");
    expect(result.questions[0].attemptQuestionId).toBe("question-1");
    expect(request).toHaveBeenCalledWith("/lecturer/practice-sessions/session-1/attempts/attempt-1/grading", expect.anything(), undefined);
  });

  it("sends the score with the revision returned by the server", async () => {
    await gradePracticeQuestion("session-1", "attempt-1", "question-1", { expectedRevision: "revision-1", score: 8, feedback: "Clear answer" });
    expect(request).toHaveBeenCalledWith(
      "/lecturer/practice-sessions/session-1/attempts/attempt-1/grading/question-1",
      expect.anything(),
      { method: "PUT", json: { expectedRevision: "revision-1", score: 8, feedback: "Clear answer" } },
    );
  });
});

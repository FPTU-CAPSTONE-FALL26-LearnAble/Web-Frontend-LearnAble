import type { QuestionGrade } from "@/api/assessmentAttempt";
import type { PracticeResult, PracticeSession } from "@/api/studentPractice";
import { summariseProgress } from "./progressSummary";

const NOW = Date.parse("2026-11-25T12:00:00Z");
const session = (sessionId: string, patch: Partial<PracticeSession> = {}): PracticeSession => ({
  sessionId,
  examSubjectId: "subject",
  examPaperId: "paper",
  name: `Session ${sessionId}`,
  status: "Completed",
  opensAt: "2026-11-20T08:00:00Z",
  closesAt: "2026-11-20T10:00:00Z",
  durationMinutes: 30,
  registered: 10,
  revision: "1",
  releasedAt: "2026-11-21T08:00:00Z",
  ...patch,
});
const grade = (questionType: QuestionGrade["questionType"], score: number | null, maxScore = 1): QuestionGrade => ({
  attemptQuestionId: `${questionType}-${score}-${Math.random()}`,
  position: 1,
  questionType,
  content: null,
  answerText: null,
  referenceAnswer: null,
  maxScore,
  score,
  feedback: null,
  options: [],
  selectedOptionIds: [],
});
const result = (
  totalScore: number | null,
  maxScore: number,
  patch: Partial<PracticeResult["result"]> = {},
  review: QuestionGrade[] = [],
): PracticeResult => ({
  result: {
    attemptId: "attempt",
    participation: "Submitted",
    submittedAt: "2026-11-20T09:00:00Z",
    gradingStatus: "Completed",
    totalScore,
    maxScore,
    scoreOnTen: totalScore == null ? null : (totalScore / maxScore) * 10,
    passed: totalScore == null ? null : totalScore / maxScore >= 0.5,
    ...patch,
  },
  review,
});

describe("summariseProgress", () => {
  it("averages released attempts and lists them newest first", () => {
    const summary = summariseProgress(
      [session("a"), session("b"), session("c")],
      new Map([
        ["a", result(8, 10, { submittedAt: "2026-11-18T09:00:00Z" })],
        ["b", result(3, 10, { submittedAt: "2026-11-22T09:00:00Z" })],
        ["c", result(5, 5, { submittedAt: "2026-11-20T09:00:00Z" })],
      ]),
      NOW,
    );
    expect(summary.attempts).toBe(3);
    expect(summary.averagePercent).toBe(Math.round((80 + 30 + 100) / 3));
    expect(summary.averageOnTen).toBe(7);
    expect(summary.passed).toBe(2);
    expect(summary.history.map((item) => item.sessionId)).toEqual(["b", "c", "a"]);
  });

  it("leaves out sessions the student never sat and results without a score", () => {
    const summary = summariseProgress(
      [session("absent"), session("ungraded"), session("missing")],
      new Map([
        ["absent", result(null, 10, { attemptId: null, submittedAt: null })],
        ["ungraded", result(null, 10)],
      ]),
      NOW,
    );
    expect(summary.attempts).toBe(0);
    expect(summary.averagePercent).toBeNull();
    expect(summary.history).toEqual([]);
  });

  it("groups graded questions by type and skips those still waiting for a lecturer", () => {
    const summary = summariseProgress(
      [session("a")],
      new Map([
        [
          "a",
          result(4, 6, {}, [
            grade("Single", 1),
            grade("Single", 0),
            grade("Essay", 2, 3),
            grade("Essay", null, 3),
            grade("Multiple", 1),
          ]),
        ],
      ]),
      NOW,
    );
    expect(summary.byType).toEqual([
      { questionType: "Single", score: 1, maxScore: 2, questions: 2, percent: 50 },
      { questionType: "Multiple", score: 1, maxScore: 1, questions: 1, percent: 100 },
      { questionType: "Essay", score: 2, maxScore: 3, questions: 1, percent: 67 },
    ]);
  });

  it("counts closed sessions still waiting for results, but not open or upcoming ones", () => {
    const summary = summariseProgress(
      [
        session("closed", { status: "Closed", releasedAt: null }),
        session("past", { status: "Open", closesAt: "2026-11-25T11:00:00Z", releasedAt: null }),
        session("open", { status: "Open", closesAt: "2026-11-25T18:00:00Z", releasedAt: null }),
        session("soon", { status: "Scheduled", releasedAt: null }),
      ],
      new Map(),
      NOW,
    );
    expect(summary.awaitingResults).toBe(2);
  });
});

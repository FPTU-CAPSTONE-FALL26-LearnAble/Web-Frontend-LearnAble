import { describe, expect, it } from "vitest";
import { examPaperPreviewSchema } from "./exams";

// The shape the Backend sends: the question text sits inside "snapshot", the order, score and answers beside it.
const fromBackend = {
  examPaperId: "paper-1",
  version: 1,
  durationMinutes: 90,
  totalScore: 10,
  instructions: null,
  message: null,
  questions: [
    {
      examQuestionId: "exam-question-1",
      displayOrder: 1,
      maxScore: 1,
      snapshot: {
        schemaVersion: 1,
        capturedAt: "2026-11-10T00:00:00Z",
        questionId: "question-1",
        content: "What is the time complexity of binary search?",
        questionType: "Single",
        difficulty: "Easy",
        referenceAnswer: null,
        options: [],
        audio: { hasAudio: true },
      },
      audio: { url: "https://audio.test/q.mp3", expiresAt: "2026-11-10T00:10:00Z" },
      options: [
        { optionId: "o1", label: "A", content: "O(log n)", isCorrect: true, audio: { url: null, expiresAt: "2026-11-10T00:10:00Z" } },
        { optionId: "o2", label: "B", content: "O(n)", isCorrect: false, audio: null },
      ],
    },
  ],
};

describe("exam paper preview schema", () => {
  it("reads the question text from the snapshot and keeps the order, score and answers", () => {
    const preview = examPaperPreviewSchema.parse(fromBackend);
    expect(preview.questions[0]).toEqual({
      questionId: "question-1",
      displayOrder: 1,
      maxScore: 1,
      content: "What is the time complexity of binary search?",
      questionType: "Single",
      difficulty: "Easy",
      referenceAnswer: null,
      gradingCriteria: null,
      audioUrl: "https://audio.test/q.mp3",
      options: [
        { optionId: "o1", label: "A", content: "O(log n)", isCorrect: true, audioUrl: null },
        { optionId: "o2", label: "B", content: "O(n)", isCorrect: false, audioUrl: null },
      ],
    });
  });

  it("accepts a preview with no questions, or with a question that has no snapshot", () => {
    expect(examPaperPreviewSchema.parse({ ...fromBackend, questions: null }).questions).toEqual([]);
    const bare = examPaperPreviewSchema.parse({ ...fromBackend, questions: [{ examQuestionId: "eq-9", displayOrder: 2, maxScore: 2 }] });
    expect(bare.questions[0]).toMatchObject({ questionId: "eq-9", content: null, options: [] });
  });
});

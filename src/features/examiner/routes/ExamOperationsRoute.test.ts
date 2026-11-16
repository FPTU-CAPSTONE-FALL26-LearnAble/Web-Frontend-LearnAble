import { describe, expect, it } from "vitest";
import { examPaperPreviewSchema } from "@/api/exams";
import type { CatalogQuestion } from "@/api/lecturer";
import { enrichPaperPreview } from "./ExamOperationsRoute";

describe("review and publish paper hydration", () => {
  it("recovers question content and answer IDs when a legacy preview has no snapshot", () => {
    const preview = examPaperPreviewSchema.parse({
      examPaperId: "paper-1",
      version: 1,
      durationMinutes: 90,
      totalScore: 1,
      instructions: null,
      message: null,
      questions: [{
        examQuestionId: "exam-question-1",
        displayOrder: 1,
        maxScore: 1,
        snapshot: null,
        options: [
          { optionId: "preview-option-1", label: "A", content: "36", isCorrect: true },
          { optionId: "preview-option-2", label: "B", content: "24", isCorrect: false },
        ],
      }],
    });
    const source: CatalogQuestion = {
      questionId: "question-1",
      examTypeId: "type-1",
      topicId: "topic-1",
      createdBy: "lecturer-1",
      content: "What is 6 × 6?",
      questionType: "Single",
      difficulty: "Easy",
      defaultScore: 1,
      status: "Active",
      createdAt: "2026-11-16T00:00:00Z",
      options: [
        { optionId: "option-1", content: "36", isCorrect: true, displayOrder: 1 },
        { optionId: "option-2", content: "24", isCorrect: false, displayOrder: 2 },
      ],
    };

    const hydrated = enrichPaperPreview(preview, [source]);

    expect(hydrated.questions[0]).toMatchObject({
      questionId: "question-1",
      content: "What is 6 × 6?",
      questionType: "Single",
      options: [{ optionId: "option-1", content: "36" }, { optionId: "option-2", content: "24" }],
    });
  });
});

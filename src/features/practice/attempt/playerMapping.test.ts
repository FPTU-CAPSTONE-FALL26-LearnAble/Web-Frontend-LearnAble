import type { StudentQuestion } from "@/api/assessmentAttempt";
import { toAnswerPayload, toPlayerAnswers, toPlayerQuestions } from "./playerMapping";

const question = (patch: Partial<StudentQuestion>): StudentQuestion => ({
  attemptQuestionId: "q",
  questionType: "Single",
  position: 1,
  content: "Stem",
  maxWords: null,
  audio: null,
  options: [],
  images: [],
  answerFormat: null,
  ...patch,
});

describe("practice ↔ assessment player mapping", () => {
  it("orders questions by position and maps each Backend type to a player kind", () => {
    const mapped = toPlayerQuestions([
      question({ attemptQuestionId: "essay", questionType: "Essay", position: 3 }),
      question({
        attemptQuestionId: "single",
        position: 1,
        options: [
          { optionId: "b", position: 2, label: "B", content: "Second", audio: null },
          { optionId: "a", position: 1, label: "A", content: "First", audio: null },
        ],
      }),
      question({ attemptQuestionId: "multi", questionType: "Multiple", position: 2 }),
      question({ attemptQuestionId: "code", questionType: "Coding", position: 4 }),
    ]);
    expect(mapped.map((q) => [q.id, q.kind, q.title])).toEqual([
      ["single", "single", "Multiple choice"],
      ["multi", "multi", "Multiple response"],
      ["essay", "essay", "Essay"],
      ["code", "textarea", "Coding"],
    ]);
    expect(mapped[0].options).toEqual([
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ]);
  });

  it("reads stored answers back into the player", () => {
    const stored = (attemptQuestionId: string, answer: Record<string, unknown>) => ({
      attemptQuestionId,
      answer: answer as never,
      revision: 1,
      lastOperationId: "op",
      serverSavedAt: "2026-11-25T00:00:00Z",
    });
    expect(
      toPlayerAnswers([
        stored("s", { kind: "Single", selectedOptionIds: ["a"] }),
        stored("m", { kind: "Multiple", selectedOptionIds: ["a", "c"] }),
        stored("e", { kind: "Essay", text: "Because…" }),
        stored("c", { kind: "Coding", sourceCode: "int x;" }),
      ]),
    ).toEqual({ s: "a", m: ["a", "c"], e: "Because…" });
  });

  it("sends player answers as Backend payloads, an empty answer clearing the question", () => {
    expect(toAnswerPayload(question({}), "a")).toEqual({ kind: "Single", selectedOptionIds: ["a"] });
    expect(toAnswerPayload(question({}), undefined)).toEqual({ kind: "Single", selectedOptionIds: [] });
    expect(toAnswerPayload(question({ questionType: "Multiple" }), ["a", "b"])).toEqual({
      kind: "Multiple",
      selectedOptionIds: ["a", "b"],
    });
    expect(toAnswerPayload(question({ questionType: "Essay" }), "Text")).toEqual({ kind: "Essay", text: "Text" });
  });
});

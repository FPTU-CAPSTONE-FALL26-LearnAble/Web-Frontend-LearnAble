import type { CodingQuestion, StudentQuestion } from "@/api/assessmentAttempt";
import {
  isStarterCode,
  isSupportedCoding,
  storedLanguages,
  toAnswerPayload,
  toPlayerAnswers,
  toPlayerQuestions,
} from "./playerMapping";

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

const STARTER = "#include <stdio.h>\n\nint main(void) {\n  return 0;\n}\n";
const coding = (patch: Partial<CodingQuestion> = {}): CodingQuestion => ({
  languageCode: "c-gcc-9.2.0",
  starterCode: STARTER,
  starterCodes: { "c-gcc-9.2.0": STARTER, "c-clang-7.0.1": STARTER },
  inputDescription: "A whole number n, then n integers.",
  outputDescription: "The sum of the even integers.",
  constraints: "1 ≤ n ≤ 1000",
  cpuSeconds: 2,
  wallSeconds: 5,
  memoryKb: 131072,
  examples: [
    { input: "5\n1 2 3 4 5\n", expectedOutput: "6\n" },
    { input: "3\n7 9 11\n", expectedOutput: "0\n" },
  ],
  ...patch,
});
const codingQuestion = (patch: Partial<CodingQuestion> = {}) =>
  question({ attemptQuestionId: "code", questionType: "Coding", content: "Sum the even numbers.", coding: coding(patch) });

const stored = (attemptQuestionId: string, answer: Record<string, unknown>) => ({
  attemptQuestionId,
  answer: answer as never,
  revision: 1,
  lastOperationId: "op",
  serverSavedAt: "2026-11-25T00:00:00Z",
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
      { ...codingQuestion(), position: 4 },
    ]);
    expect(mapped.map((q) => [q.id, q.kind, q.title])).toEqual([
      ["single", "single", "Multiple choice"],
      ["multi", "multi", "Multiple response"],
      ["essay", "essay", "Essay"],
      ["code", "coding", "Coding"],
    ]);
    expect(mapped[0].options).toEqual([
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ]);
  });

  it("reads stored answers back into the player, a cleared program as no answer", () => {
    expect(
      toPlayerAnswers([
        stored("s", { kind: "Single", selectedOptionIds: ["a"] }),
        stored("m", { kind: "Multiple", selectedOptionIds: ["a", "c"] }),
        stored("e", { kind: "Essay", text: "Because…" }),
        stored("c", { kind: "Coding", sourceCode: "int x;", languageCode: "c-gcc-9.2.0" }),
        stored("cleared", { kind: "Coding", sourceCode: "", languageCode: "c-gcc-9.2.0" }),
      ]),
    ).toEqual({ s: "a", m: ["a", "c"], e: "Because…", c: "int x;", cleared: undefined });
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

describe("coding questions in the practice player", () => {
  it("builds the problem as limited Markdown with its sections and limits", () => {
    const [mapped] = toPlayerQuestions([codingQuestion()]);
    expect(mapped.prompt).toBe(
      [
        "Sum the even numbers.",
        "**Input**\n\nA whole number n, then n integers.",
        "**Output**\n\nThe sum of the even integers.",
        "**Constraints**\n\n1 ≤ n ≤ 1000",
        "Limits: 2 seconds of CPU time, 128 MB of memory.",
      ].join("\n\n"),
    );
    expect(mapped.coding).toEqual({
      language: "c",
      samples: [
        { input: "5\n1 2 3 4 5\n", output: "6\n" },
        { input: "3\n7 9 11\n", output: "0\n" },
      ],
      starterCode: STARTER,
    });
  });

  it("leaves out empty sections", () => {
    const [mapped] = toPlayerQuestions([codingQuestion({ constraints: "  ", inputDescription: "" })]);
    expect(mapped.prompt).not.toMatch(/Constraints|Input/);
    expect(mapped.prompt).toMatch(/\*\*Output\*\*/);
  });

  it("shows a question it cannot edit, without making it answerable", () => {
    const python = codingQuestion({ languageCode: "python3" });
    const missing = question({ attemptQuestionId: "bare", questionType: "Coding" });
    expect([isSupportedCoding(python), isSupportedCoding(missing), isSupportedCoding(codingQuestion())]).toEqual([
      false,
      false,
      true,
    ]);
    expect(toPlayerQuestions([python, missing]).map((q) => [q.kind, q.coding])).toEqual([
      ["textarea", undefined],
      ["textarea", undefined],
    ]);
  });

  it("treats starter code alone, whatever the surrounding whitespace, as no program", () => {
    const code = codingQuestion();
    expect(isStarterCode(code, `\n${STARTER.trim()}  \n`)).toBe(true);
    expect(isStarterCode(code, STARTER.replace("return 0;", "return 1;"))).toBe(false);
    expect(isStarterCode(code, undefined)).toBe(false);
  });

  it("sends a program in its saved runtime, else the question's, and starter code as an empty program", () => {
    const code = codingQuestion();
    expect(toAnswerPayload(code, "int main(void) {}")).toEqual({
      kind: "Coding",
      sourceCode: "int main(void) {}",
      languageCode: "c-gcc-9.2.0",
    });
    expect(toAnswerPayload(code, "int main(void) {}", "c-clang-7.0.1")).toMatchObject({ languageCode: "c-clang-7.0.1" });
    expect(toAnswerPayload(code, STARTER)).toMatchObject({ sourceCode: "" });
    expect(toAnswerPayload(code, undefined)).toMatchObject({ sourceCode: "" });
  });

  it("remembers the runtime each program was saved in", () => {
    expect(
      storedLanguages([
        stored("c", { kind: "Coding", sourceCode: "x", languageCode: "c-clang-7.0.1" }),
        stored("e", { kind: "Essay", text: "x" }),
      ]),
    ).toEqual({ c: "c-clang-7.0.1" });
  });
});

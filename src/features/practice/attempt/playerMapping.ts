import type {
  AnswerPayload,
  CodingQuestion,
  StoredAnswer,
  StudentQuestion,
} from "@/api/assessmentAttempt";
import { vi } from "@/shared/strings/vi";
import type {
  Answer,
  Answers,
  PlayerQuestion,
} from "@/shared/ui/patterns/exam/assessment-player-types";

/**
 * Translation between the Backend's attempt contract and the shared
 * `AssessmentPlayer`. Player question ids are attempt question ids, so an
 * answer travels back to the Backend without another lookup.
 */

const t = vi.practice;
const codingText = vi.exam.coding;

const byPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);

/**
 * A Coding question the web player can answer: it carries its coding view and
 * opens in a C runtime, since the editor edits C only. Others stay visible but
 * cannot be answered.
 */
export function isSupportedCoding(
  question: Pick<StudentQuestion, "questionType" | "coding">,
): question is Pick<StudentQuestion, "questionType"> & { coding: CodingQuestion } {
  return question.questionType === "Coding" && Boolean(question.coding?.languageCode.startsWith("c-"));
}

/** The problem, then its Input, Output and Constraints, then the run limits, as limited Markdown. */
function codingStatement(content: string, coding: CodingQuestion) {
  const sections = [
    [codingText.input, coding.inputDescription],
    [codingText.output, coding.outputDescription],
    [codingText.constraints, coding.constraints],
  ].filter(([, text]) => text.trim());
  return [
    content,
    ...sections.map(([label, text]) => `**${label}**\n\n${text.trim()}`),
    codingText.limits(coding.cpuSeconds, coding.memoryKb),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function toPlayerQuestions(questions: StudentQuestion[]): PlayerQuestion[] {
  return byPosition(questions).map((question) => {
    const prompt = question.content?.trim() ?? "";
    const shared = { id: question.attemptQuestionId, title: t.questionTypes[question.questionType], prompt };
    switch (question.questionType) {
      case "Single":
      case "Multiple":
        return {
          ...shared,
          kind: question.questionType === "Single" ? "single" : "multi",
          // The player letters options itself, so only the content is passed.
          options: byPosition(question.options).map((option) => ({
            id: option.optionId,
            text: option.content?.trim() || option.label?.trim() || "",
          })),
        };
      case "Essay":
        return { ...shared, kind: "essay" };
      case "Coding":
        if (!isSupportedCoding(question)) {
          // Not answerable on the web: shown so the student knows it exists.
          return { ...shared, kind: "textarea" };
        }
        return {
          ...shared,
          kind: "coding",
          prompt: codingStatement(prompt, question.coding),
          coding: {
            language: "c",
            samples: question.coding.examples.map((example) => ({
              input: example.input,
              output: example.expectedOutput,
            })),
            starterCode: question.coding.starterCode,
          },
        };
    }
  });
}

/**
 * True when `code` is the question's starter code, give or take surrounding
 * whitespace. Starter code alone is not an answer: it is never saved, and
 * returning to it clears a saved program.
 */
export function isStarterCode(question: Pick<StudentQuestion, "coding">, code: Answer) {
  return typeof code === "string" && code.trim() === (question.coding?.starterCode ?? "").trim();
}

/** The stored answers as player answers. A cleared program reads as no answer. */
export function toPlayerAnswers(stored: StoredAnswer[]): Answers {
  const answers: Answers = {};
  for (const { attemptQuestionId, answer } of stored) {
    if (answer.kind === "Single") answers[attemptQuestionId] = answer.selectedOptionIds?.[0];
    else if (answer.kind === "Multiple") answers[attemptQuestionId] = answer.selectedOptionIds ?? [];
    else if (answer.kind === "Essay") answers[attemptQuestionId] = answer.text ?? undefined;
    else if (answer.kind === "Coding") answers[attemptQuestionId] = answer.sourceCode || undefined;
  }
  return answers;
}

/** The runtime each stored program was saved in, by attempt question id. */
export function storedLanguages(stored: StoredAnswer[]): Record<string, string> {
  return Object.fromEntries(
    stored.flatMap(({ attemptQuestionId, answer }) =>
      answer.kind === "Coding" && answer.languageCode ? [[attemptQuestionId, answer.languageCode]] : [],
    ),
  );
}

/**
 * A player answer as the Backend's answer payload; an empty answer clears it.
 * A program goes in the runtime it was last saved in (`languageCode`), else in
 * the question's own; starter code alone is sent as an empty program.
 */
export function toAnswerPayload(question: StudentQuestion, answer: Answer, languageCode?: string): AnswerPayload {
  const kind = question.questionType;
  if (kind === "Single") return { kind, selectedOptionIds: typeof answer === "string" ? [answer] : [] };
  if (kind === "Multiple") return { kind, selectedOptionIds: Array.isArray(answer) ? answer : [] };
  if (kind === "Coding") {
    const sourceCode = typeof answer === "string" && !isStarterCode(question, answer) ? answer : "";
    return { kind, sourceCode, languageCode: languageCode ?? question.coding?.languageCode ?? "" };
  }
  return { kind, text: typeof answer === "string" ? answer : "" };
}

import type {
  AnswerPayload,
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

const byPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);

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
        // Not answerable on the web yet: shown so the student knows it exists.
        return { ...shared, kind: "textarea" };
    }
  });
}

/** The stored answers as player answers. */
export function toPlayerAnswers(stored: StoredAnswer[]): Answers {
  const answers: Answers = {};
  for (const { attemptQuestionId, answer } of stored) {
    if (answer.kind === "Single") answers[attemptQuestionId] = answer.selectedOptionIds?.[0];
    else if (answer.kind === "Multiple") answers[attemptQuestionId] = answer.selectedOptionIds ?? [];
    else if (answer.kind === "Essay") answers[attemptQuestionId] = answer.text ?? undefined;
  }
  return answers;
}

/** A player answer as the Backend's answer payload; an empty answer clears it. */
export function toAnswerPayload(question: StudentQuestion, answer: Answer): AnswerPayload {
  const kind = question.questionType;
  if (kind === "Single") return { kind, selectedOptionIds: typeof answer === "string" ? [answer] : [] };
  if (kind === "Multiple") return { kind, selectedOptionIds: Array.isArray(answer) ? answer : [] };
  return { kind, text: typeof answer === "string" ? answer : "" };
}

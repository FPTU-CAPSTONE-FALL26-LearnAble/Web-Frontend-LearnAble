export const questionTypes = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  essay: "Essay",
  code: "Write Code",
  math: "MathML / LaTeX",
  diagram: "Diagram",
} as const;
export type QuestionType = keyof typeof questionTypes;
type Common = {
  course: string;
  topic: string;
  bloom: string;
  points: string;
  content: string;
  rationale?: string;
};
export type Option = { text: string; description: string; correct: boolean };
export type QuestionDraft = Common &
  (
    | { type: "single" | "multiple"; options: Option[] }
    | { type: "essay"; instructions: string; rubric: string }
    | {
        type: "code";
        language: string;
        starterCode: string;
        expectedOutput: string;
      }
    | {
        type: "math";
        format: "LaTeX" | "MathML";
        formula: string;
        description: string;
      }
    | { type: "diagram"; alt: string; description: string }
  );
export function createDraft(
  type: QuestionType = "single",
  common?: Common,
): QuestionDraft {
  const base = common ?? {
    course: "",
    topic: "",
    bloom: "Understand",
    points: "1",
    content: "",
  };
  switch (type) {
    case "single":
    case "multiple":
      return {
        ...base,
        type,
        options: Array.from({ length: 4 }, () => ({
          text: "",
          description: "",
          correct: false,
        })),
      };
    case "essay":
      return { ...base, type, instructions: "", rubric: "" };
    case "code":
      return {
        ...base,
        type,
        language: "C#",
        starterCode: "",
        expectedOutput: "",
      };
    case "math":
      return { ...base, type, format: "LaTeX", formula: "", description: "" };
    case "diagram":
      return { ...base, type, alt: "", description: "" };
  }
}
export function validateDraft(
  draft: QuestionDraft,
  hasImage: boolean,
): string[] {
  const errors: string[] = [];
  if (!draft.content.trim()) errors.push("Question content is required.");
  if (!draft.course.trim() || !draft.topic.trim())
    errors.push("Course and topic are required.");
  if (!Number.isFinite(Number(draft.points)) || Number(draft.points) <= 0)
    errors.push("Points must be greater than zero.");
  if (draft.type === "single" || draft.type === "multiple") {
    if (
      draft.options.filter((o) => o.text.trim()).length < 2 ||
      draft.options.some((o) => !o.text.trim())
    )
      errors.push("Enter at least two complete answer options.");
    const correct = draft.options.filter((o) => o.correct).length;
    if (draft.type === "single" ? correct !== 1 : correct < 1)
      errors.push(
        draft.type === "single"
          ? "Select exactly one correct answer."
          : "Select at least one correct answer.",
      );
  }
  if (
    draft.type === "essay" &&
    (!draft.instructions.trim() || !draft.rubric.trim())
  )
    errors.push("Answer instructions and a rubric are required.");
  if (
    draft.type === "code" &&
    (!draft.starterCode.trim() || !draft.expectedOutput.trim())
  )
    errors.push("Starter code and expected output are required.");
  if (
    draft.type === "math" &&
    (!draft.formula.trim() || !draft.description.trim())
  )
    errors.push("A formula and its text description are required.");
  if (
    draft.type === "diagram" &&
    (!hasImage || !draft.alt.trim() || !draft.description.trim())
  )
    errors.push(
      "Upload a diagram and provide alt text and a long description.",
    );
  return errors;
}
export const draftKey = (userId: string, purpose?: "exam" | "practice") =>
  `learnable.question-draft.${userId}${purpose ? `.${purpose}` : ""}`;
export function readDraft(
  userId: string,
  purpose?: "exam" | "practice",
): QuestionDraft | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(draftKey(userId, purpose)) ?? "null",
    );
    if (!value || !(value.type in questionTypes)) return null;
    const template = createDraft(value.type);
    if (
      Object.keys(template).some(
        (key) =>
          typeof value[key] !== typeof template[key as keyof typeof template],
      )
    )
      return null;
    if (
      (value.type === "single" || value.type === "multiple") &&
      (!Array.isArray(value.options) ||
        value.options.length < 2 ||
        value.options.some(
          (o: Option) =>
            !o ||
            typeof o.text !== "string" ||
            typeof o.description !== "string" ||
            typeof o.correct !== "boolean",
        ))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

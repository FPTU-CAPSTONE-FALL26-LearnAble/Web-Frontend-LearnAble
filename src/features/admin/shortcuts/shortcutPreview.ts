/**
 * The sample exam behind "Test shortcuts": what each exam action does to it.
 *
 * The backend catalog names its actions freely, so the effect is read from the
 * action's code and name. An action that is not recognised still fires in the
 * preview; it is announced by name instead of moving the sample exam.
 */

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export type PreviewEffect =
  | { kind: "selectOption"; option: number }
  | { kind: "selectHighlighted" }
  | { kind: "highlightNext" }
  | { kind: "highlightPrevious" }
  | { kind: "nextQuestion" }
  | { kind: "previousQuestion" }
  | { kind: "submitAnswer" }
  | { kind: "submitExam" }
  | { kind: "replay" }
  | { kind: "unknown" };

const words = (value: string) =>
  value
    // `selectOptionA` and `SELECT_OPTION_A` read the same.
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .toLowerCase()
    .trim();

const has = (text: string, ...terms: string[]) =>
  terms.some((term) => new RegExp(`\\b${term}`).test(text));

export function previewEffect(action: { code: string; name: string }): PreviewEffect {
  const code = words(action.code);
  const text = `${code} ${words(action.name)}`;

  // A specific option: `ANSWER_SELECT_A`, `option 2`, "Select option C".
  const option =
    /\b(?:option|answer|choice|select|choose)\s+([a-d]|[1-4])$/.exec(code) ??
    /\b(?:option|answer|choice)\s+([a-d]|[1-4])\b/.exec(words(action.name));
  if (option) {
    const token = option[1];
    return {
      kind: "selectOption",
      option: /[1-4]/.test(token) ? Number(token) - 1 : token.charCodeAt(0) - 97,
    };
  }

  const aboutOptions = has(text, "option", "choice");
  if (has(text, "submit", "finish", "hand in") && has(text, "exam", "test", "paper", "all"))
    return { kind: "submitExam" };
  if (has(text, "submit", "save", "confirm")) return { kind: "submitAnswer" };
  if (has(text, "next", "forward"))
    return { kind: aboutOptions ? "highlightNext" : "nextQuestion" };
  if (has(text, "previous", "prev", "back"))
    return { kind: aboutOptions ? "highlightPrevious" : "previousQuestion" };
  if (has(text, "replay", "repeat", "listen", "read", "play", "audio", "speak"))
    return { kind: "replay" };
  if (has(text, "select", "choose", "pick", "answer")) return { kind: "selectHighlighted" };
  return { kind: "unknown" };
}

export const SAMPLE_QUESTIONS = [
  {
    text: "Which planet is closest to the Sun?",
    options: ["Mercury", "Venus", "Earth", "Mars"],
  },
  {
    text: "How many days are there in a leap year?",
    options: ["364", "365", "366", "367"],
  },
  {
    text: "Which of these is a prime number?",
    options: ["21", "27", "29", "33"],
  },
] as const;

export type PreviewState = {
  /** Current question. */
  index: number;
  /** Option the keyboard is on, per question. */
  highlighted: number[];
  /** Chosen option per question, or `null`. */
  selected: (number | null)[];
  /** Whether the answer to each question was submitted. */
  saved: boolean[];
  /** Momentary states: they last until the next key press. */
  reading: boolean;
  submitOpen: boolean;
};

export const initialPreview = (): PreviewState => ({
  index: 0,
  highlighted: SAMPLE_QUESTIONS.map(() => 0),
  selected: SAMPLE_QUESTIONS.map(() => null),
  saved: SAMPLE_QUESTIONS.map(() => false),
  reading: false,
  submitOpen: false,
});

const set = <T,>(list: T[], index: number, value: T) =>
  list.map((item, position) => (position === index ? value : item));

/** The sample exam after an action fires, and a sentence saying what changed. */
export function applyEffect(
  state: PreviewState,
  effect: PreviewEffect,
): { state: PreviewState; detail: string } {
  const base = { ...state, reading: false, submitOpen: false };
  const { index } = base;
  const last = SAMPLE_QUESTIONS.length - 1;
  const lastOption = OPTION_LETTERS.length - 1;
  const select = (option: number) => ({
    state: {
      ...base,
      highlighted: set(base.highlighted, index, option),
      selected: set(base.selected, index, option),
      saved: set(base.saved, index, false),
    },
    detail: `Option ${OPTION_LETTERS[option]} is now selected.`,
  });

  switch (effect.kind) {
    case "selectOption":
      return select(effect.option);
    case "selectHighlighted":
      return select(base.highlighted[index]);
    case "highlightNext":
    case "highlightPrevious": {
      const step = effect.kind === "highlightNext" ? 1 : -1;
      const option = Math.min(lastOption, Math.max(0, base.highlighted[index] + step));
      return {
        state: { ...base, highlighted: set(base.highlighted, index, option) },
        detail: `The highlight is on option ${OPTION_LETTERS[option]}.`,
      };
    }
    case "nextQuestion":
      return index === last
        ? { state: base, detail: "This is already the last sample question." }
        : {
            state: { ...base, index: index + 1 },
            detail: `Moved to question ${index + 2} of ${last + 1}.`,
          };
    case "previousQuestion":
      return index === 0
        ? { state: base, detail: "This is already the first sample question." }
        : {
            state: { ...base, index: index - 1 },
            detail: `Moved to question ${index} of ${last + 1}.`,
          };
    case "submitAnswer":
      return base.selected[index] === null
        ? { state: base, detail: "No option is selected yet, so there is no answer to submit." }
        : {
            state: { ...base, saved: set(base.saved, index, true) },
            detail: `The answer to question ${index + 1} is submitted.`,
          };
    case "submitExam":
      return {
        state: { ...base, submitOpen: true },
        detail: "The submit confirmation opens.",
      };
    case "replay":
      return {
        state: { ...base, reading: true },
        detail: "The question is read aloud again.",
      };
    case "unknown":
      return {
        state: base,
        detail: "This preview has no picture for this action, but the shortcut is recognised.",
      };
  }
}

import type { GraphicTextEntryField } from "./GraphicTextEntryQuestion";
import type {
  InlineChoiceSegment,
  InlineChoiceSlot,
} from "./InlineChoiceQuestion";
import type { MatchTarget } from "./MatchingQuestion";

export type QuestionKind =
  | "single"
  | "multi"
  | "inline"
  | "boolean"
  | "text"
  | "numeric"
  | "drag"
  | "graphic-gap"
  | "inline-gap"
  | "hotspot"
  | "graphic-text"
  | "composite"
  | "essay"
  | "textarea"
  | "upload"
  | "coding";

/** Two-part questions; each part's answer is stored as `first|second`. */
export type CompositeVariant =
  | "true-false-multiple-response"
  | "numeric-multiple-choice"
  | "inline-choice-text-entry";

export interface CompositeConfig {
  variant: CompositeVariant;
  partOneLabel: string;
  partTwoLabel: string;
  /** The one list of alternatives the variant needs (checkboxes or a select). */
  choices: string[];
}

/** A C coding question: samples shown in the problem and run by the sandbox. */
export interface CodingConfig {
  language: "c";
  /** Problem name shown above the statement, e.g. "Sum of even numbers". */
  title?: string;
  samples: { input: string; output: string }[];
  /** Pre-filled into the editor while there is no saved answer. */
  starterCode?: string;
}

/** One sample test's outcome from the code sandbox. */
export interface CodeTestResult {
  /** 1-based, matches the sample order. */
  index: number;
  outcome: "passed" | "failed" | "timeLimitExceeded" | "runtimeError";
  input: string;
  expectedOutput: string;
  actualOutput: string;
  message?: string;
}

/** What a code run returns; transport failures are thrown instead. */
export type CodeRunResult =
  | { status: "compiled"; tests: CodeTestResult[] }
  | {
      status: "compileError";
      errors: { line: number; column?: number; message: string }[];
    };

export interface PlayerOption {
  id: string;
  text: string;
  disabled?: boolean;
}

export interface PlayerQuestion {
  id: string;
  kind: QuestionKind;
  /** Question type shown in the contents table, e.g. "Multiple choice". */
  title: string;
  prompt: string;
  stemLang?: string;
  /** Strings retain the demo's label-as-ID behavior; live choices use explicit IDs. */
  options?: (string | PlayerOption)[];
  image?: { src: string; alt: string };
  /** Unit shown after a numeric entry field. */
  suffix?: string;
  hotspots?: { id: string; label: string; x: number; y: number }[];
  fields?: GraphicTextEntryField[];
  targets?: MatchTarget[];
  segments?: InlineChoiceSegment[];
  slots?: InlineChoiceSlot[];
  composite?: CompositeConfig;
  /** Kind "coding" only; its `prompt` is limited Markdown. */
  coding?: CodingConfig;
}

export type Answer = string | string[] | undefined;
export type Answers = Record<string, Answer>;

export type PlayerView = "question" | "contents" | "review";
export type PlayerFilter = "all" | "unanswered" | "flagged";

/** Host-controlled position, stable across question ordering and reloads. */
export interface PlayerNavigation {
  questionId: string | null;
  view: PlayerView;
  filter: PlayerFilter;
}

export function answerState(answer: Answer) {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

/** Reads a JSON-encoded `{ [key]: value }` answer; anything else is empty. */
export function decodedAnswer(value: Answer) {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

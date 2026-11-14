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
  | "upload";

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

export interface PlayerQuestion {
  id: string;
  kind: QuestionKind;
  /** Question type shown in the contents table, e.g. "Multiple choice". */
  title: string;
  prompt: string;
  options?: string[];
  image?: { src: string; alt: string };
  /** Unit shown after a numeric entry field. */
  suffix?: string;
  hotspots?: { id: string; label: string; x: number; y: number }[];
  fields?: GraphicTextEntryField[];
  targets?: MatchTarget[];
  segments?: InlineChoiceSegment[];
  slots?: InlineChoiceSlot[];
  composite?: CompositeConfig;
}

export type Answer = string | string[] | undefined;
export type Answers = Record<string, Answer>;

export type PlayerView = "question" | "contents" | "review";
export type PlayerFilter = "all" | "unanswered" | "flagged";

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

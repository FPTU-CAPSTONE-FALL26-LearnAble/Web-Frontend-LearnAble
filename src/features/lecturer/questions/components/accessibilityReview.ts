import type { QuestionDraft } from "@/features/lecturer/questions/model";
import { codingSpokenContent } from "@/features/lecturer/questions/model/codingSpokenContent";

export type PreviewImage = { imageId: string; url: string | null; description: string | null };

export function contentWarnings(content: string): string[] {
  const warnings: string[] = [];
  if (/<img\b(?![^>]*\balt\s*=)/i.test(content) || /<img\b[^>]*\balt\s*=\s*(["'])\s*\1/i.test(content) || /!\[\s*\]\([^)]+\)/.test(content)) {
    warnings.push("An image in the content has no alternative text.");
  }
  const rows = content.split(/\r?\n/).filter((line) => /^\s*\|.+\|\s*$/.test(line));
  if (/<table\b/i.test(content) || rows.length >= 2) {
    warnings.push("Table detected. Check header cells, reading order and a plain-language summary; complex tables need manual review.");
  }
  return warnings;
}

export function questionWarnings(draft: QuestionDraft, images: PreviewImage[] = []): string[] {
  const optionWarnings = draft.type === "single" || draft.type === "multiple"
    ? draft.options.flatMap((option, index) => contentWarnings(option.text).map((warning) => `Option ${String.fromCharCode(65 + index)}: ${warning}`))
    : [];
  return [
    ...(!draft.content.trim() ? ["Question content is empty."] : []),
    ...contentWarnings(draft.content),
    ...optionWarnings,
    ...(draft.type === "diagram" && !draft.alt.trim() ? ["Diagram alternative text is missing."] : []),
    ...images.flatMap((image, index) => !image.description?.trim() ? [`Question image ${index + 1} has no accessible description.`] : []),
    ...(draft.type === "single" || draft.type === "multiple") && draft.options.some((option) => !option.text.trim())
      ? ["One or more answer options are empty."] : [],
  ];
}

export function readingOrder(draft: QuestionDraft, images: PreviewImage[] = []): string[] {
  const spoken = [`Question, ${draft.points || "0"} ${Number(draft.points) === 1 ? "point" : "points"}.`, draft.type === "code" ? codingSpokenContent(draft) : draft.content.trim() || "The question text is empty."];
  images.forEach((image, index) => spoken.push(`Image ${index + 1}. ${image.description?.trim() || "No accessible description."}`));
  if (draft.type === "single" || draft.type === "multiple") {
    spoken.push(`${draft.options.length} answer options. ${draft.type === "single" ? "Select one answer." : "Select all answers that apply."}`);
    draft.options.forEach((option, index) => spoken.push(`Option ${String.fromCharCode(65 + index)}. ${option.text.trim() || "This option is empty."}`));
  } else if (draft.type === "essay") spoken.push("Written answer. Edit text area.");
  else if (draft.type === "code") spoken.push(`Code answer. ${draft.language}. ${draft.starterCode || "No starter code."}`);
  else if (draft.type === "math") spoken.push(`Formula. ${draft.description || "No spoken description."}`);
  else if (draft.type === "diagram") spoken.push(`Diagram. ${draft.alt || "No alternative text."} ${draft.description}`.trim());
  return spoken;
}

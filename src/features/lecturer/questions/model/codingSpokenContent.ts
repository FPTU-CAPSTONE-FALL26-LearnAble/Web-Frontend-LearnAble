import type { QuestionDraft } from "./index";

const publicDetailsHeading = "Programming language and public example:";
const publicDetailsMarker = `\n\n${publicDetailsHeading}\n`;

export function questionPromptWithoutGeneratedDetails(content: string) {
  const markerIndex = content.lastIndexOf(publicDetailsMarker);
  return (markerIndex < 0 ? content : content.slice(0, markerIndex)).trim();
}

export function codingSpokenContent(draft: Extract<QuestionDraft, { type: "code" }>) {
  const prompt = questionPromptWithoutGeneratedDetails(draft.content);
  const language = draft.language === "python3" ? "Python 3" : draft.language;
  return [
    prompt,
    `${publicDetailsHeading}\nLanguage: ${language}.\nInput: Read from standard input.\nOutput: Print to standard output.\nConstraints: ${draft.constraints.trim()}\nSample input:\n${draft.testInput.trim()}\nSample expected output:\n${draft.expectedOutput.trim()}`,
  ].join("\n\n");
}

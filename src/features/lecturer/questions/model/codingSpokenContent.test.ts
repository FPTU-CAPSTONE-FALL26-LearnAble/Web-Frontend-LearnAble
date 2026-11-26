import { describe, expect, it } from "vitest";
import { createDraft } from "./index";
import { codingSpokenContent, questionPromptWithoutGeneratedDetails } from "./codingSpokenContent";

describe("coding question spoken content", () => {
  it("includes only public coding details and replaces them on later edits", () => {
    const base = createDraft("code");
    if (base.type !== "code") throw new Error("Expected a Coding draft");
    const draft = {
      ...base,
      content: "Find the largest value.",
      language: "python3",
      constraints: "At most 100 integers.",
      testInput: "4 9 2",
      expectedOutput: "9",
      hiddenTestInput: "secret input",
      hiddenExpectedOutput: "secret output",
      starterCode: "print('starter')",
    };
    const spoken = codingSpokenContent(draft);
    expect(spoken).toContain("Language: Python 3.");
    expect(spoken).toContain("Sample expected output:\n9");
    expect(spoken).not.toContain("secret input");
    expect(spoken).not.toContain("starter");
    expect(questionPromptWithoutGeneratedDetails(spoken)).toBe(draft.content);
    expect(codingSpokenContent({ ...draft, content: spoken, expectedOutput: "12" })).not.toContain("Sample expected output:\n9");
  });
});

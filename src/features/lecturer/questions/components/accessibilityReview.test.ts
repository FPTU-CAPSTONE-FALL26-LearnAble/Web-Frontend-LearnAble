import { describe, expect, it } from "vitest";
import { createDraft } from "@/features/lecturer/questions/model";
import { contentWarnings, questionWarnings, readingOrder } from "./accessibilityReview";

describe("accessible preview review", () => {
  it("reports missing image descriptions and tables requiring manual inspection", () => {
    const draft = createDraft("single", { examTypeId: "e", course: "c", topic: "t", difficulty: "Medium", points: "1", content: "Compare: <table><tr><td>A</td></tr></table>" });
    expect(questionWarnings(draft, [{ imageId: "i", url: "/image.png", description: null }])).toEqual(expect.arrayContaining([
      expect.stringContaining("Table detected"),
      "Question image 1 has no accessible description.",
    ]));
    expect(contentWarnings("![ ](/image.png)")).toContain("An image in the content has no alternative text.");
    expect(questionWarnings(draft, [
      { imageId: "one", url: null, description: "A chart" },
      { imageId: "two", url: null, description: null },
    ])).toContain("Question image 2 has no accessible description.");
  });

  it("includes image descriptions and coding instructions in reading order", () => {
    const code = createDraft("code", { examTypeId: "e", course: "c", topic: "t", difficulty: "Medium", points: "2", content: "Write a function" });
    expect(readingOrder(code, [{ imageId: "i", url: null, description: "Flow chart" }])).toEqual(expect.arrayContaining([
      "Image 1. Flow chart",
      expect.stringContaining("Code answer"),
    ]));
  });
});

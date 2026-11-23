import { describe, expect, it } from "vitest";
import { sentenceAtTime, splitNarration } from "./narrationTiming";

describe("estimated narration timing", () => {
  it("keeps source positions for selecting the original sentence", () => {
    const text = "  First sentence.\n Second sentence!";
    expect(splitNarration(text).map(({ text: sentence, start, end }) => ({ sentence, start, end }))).toEqual([
      { sentence: "First sentence.", start: 2, end: 17 },
      { sentence: "Second sentence!", start: 19, end: 35 },
    ]);
  });

  it("follows playback by text weight and handles unavailable duration", () => {
    const sentences = splitNarration("Short. A much longer sentence.");
    expect(sentenceAtTime(sentences, 0, 10)).toBe(0);
    expect(sentenceAtTime(sentences, 8, 10)).toBe(1);
    expect(sentenceAtTime(sentences, 10, 10)).toBe(1);
    expect(sentenceAtTime(sentences, 3, 0)).toBe(-1);
  });
});

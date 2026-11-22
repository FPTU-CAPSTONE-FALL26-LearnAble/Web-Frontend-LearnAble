import { describe, expect, it } from "vitest";
import { formatQuestionId } from "./questionId";

describe("formatQuestionId", () => {
  it("shortens a UUID for display", () => {
    expect(formatQuestionId("12121212-0000-0000-0000-000000000010")).toBe(
      "Q-000010",
    );
  });

  it("preserves non-UUID identifiers used by local fixtures", () => {
    expect(formatQuestionId("q-live-1")).toBe("q-live-1");
  });
});

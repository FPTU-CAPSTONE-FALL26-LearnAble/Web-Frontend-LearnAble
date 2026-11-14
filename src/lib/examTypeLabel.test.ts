import { describe, expect, it } from "vitest";
import { buildExamTypeOptions, formatExamTypeName } from "./examTypeLabel";

describe("formatExamTypeName", () => {
  it("shows the plain name, without the code or the development marker", () => {
    expect(formatExamTypeName({ code: "DEV_FINAL", name: "Final (development)" })).toBe("Final");
  });

  it.each([
    ["Final (Development)", "Final"],
    ["Midterm (dev)", "Midterm"],
    ["Practice (test)", "Practice"],
    ["Final", "Final"],
    ["  Progress test  ", "Progress test"],
  ])("cleans %s to %s", (name, expected) => {
    expect(formatExamTypeName({ code: "X", name })).toBe(expected);
  });

  it("keeps a bracket that carries real meaning", () => {
    expect(formatExamTypeName({ name: "Practical (lab)" })).toBe("Practical (lab)");
  });

  it("keeps a name that is only a marker", () => {
    expect(formatExamTypeName({ name: "(development)" })).toBe("(development)");
  });

  it("builds a readable name from the code when there is no name", () => {
    expect(formatExamTypeName({ code: "DEV_FINAL", name: null })).toBe("Final");
    expect(formatExamTypeName({ code: "PRACTICE" })).toBe("Practice");
    expect(formatExamTypeName({ code: "mid-term", name: "" })).toBe("Mid Term");
  });

  it("falls back when there is nothing to show", () => {
    expect(formatExamTypeName({ code: null, name: null })).toBe("Unnamed exam type");
  });
});

describe("buildExamTypeOptions", () => {
  it("maps each type to its id and clean label", () => {
    expect(buildExamTypeOptions([
      { examTypeId: "a", code: "DEV_FINAL", name: "Final (development)" },
      { examTypeId: "b", code: "DEV_PRACTICE", name: "Practice (development)" },
    ])).toEqual([{ value: "a", label: "Final" }, { value: "b", label: "Practice" }]);
  });

  it("keeps full names apart when two types would read the same", () => {
    expect(buildExamTypeOptions([
      { examTypeId: "a", code: "FE", name: "Final" },
      { examTypeId: "b", code: "DEV_FE", name: "Final (development)" },
      { examTypeId: "c", code: "PE", name: "Practical" },
    ])).toEqual([
      { value: "a", label: "Final" },
      { value: "b", label: "Final (development)" },
      { value: "c", label: "Practical" },
    ]);
  });
});

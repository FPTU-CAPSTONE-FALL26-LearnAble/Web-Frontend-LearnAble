import { getStudentPostLoginDestination } from "@/features/auth/routes/StudentLoginRoute";

describe("StudentLoginRoute", () => {
  it("only preserves a requested Student route", () => {
    expect(getStudentPostLoginDestination()).toBe("/practice");
    expect(getStudentPostLoginDestination("/results")).toBe("/results");
    expect(getStudentPostLoginDestination("/practice/set-1")).toBe("/practice/set-1");
    expect(getStudentPostLoginDestination("/examiner/dashboard")).toBe("/practice");
  });
});

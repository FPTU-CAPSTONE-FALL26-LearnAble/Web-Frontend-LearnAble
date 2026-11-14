import { ApiFailure } from "@/api/client";
import { describeImportFailure, describeImportIssue } from "./studentImportMessages";

describe("describeImportIssue", () => {
  it("says which row and student, what is wrong, and what to do", () => {
    expect(describeImportIssue({ rowNumber: 2, code: "STUDENT_NOT_FOUND", message: "Student code was not found in this university." }, "SE1234")).toEqual({
      where: "Row 2 · SE1234",
      text: "SE1234 is not a student of your university.",
      fix: "Check the code for a typo, or remove this row.",
    });
  });

  it("covers every reason a row can be turned down", () => {
    const codes = ["DUPLICATE_STUDENT", "AMBIGUOUS_STUDENT_CODE", "NOT_STUDENT", "STUDENT_INACTIVE", "STUDENT_PROFILE_MISSING", "STUDENT_NOT_STUDYING", "INVALID_STUDENT_CODE", "STUDENT_CODE_MUST_BE_TEXT", "INVALID_EXTRA_TIME", "NOTES_TOO_LONG"];
    for (const code of codes) {
      const issue = describeImportIssue({ rowNumber: 5, code, message: "raw backend message" }, "SE1");
      expect(issue.text).not.toContain("raw backend message");
      expect(issue.fix.length).toBeGreaterThan(10);
    }
  });

  it("describes a problem with the whole file, with no row", () => {
    expect(describeImportIssue({ rowNumber: null, code: "MISSING_SHEET", message: "The Students sheet is required." })).toMatchObject({
      where: "File",
      text: "The file has no sheet named Students.",
    });
  });

  it("keeps the Backend wording for a reason it does not know, and still says what to do", () => {
    expect(describeImportIssue({ rowNumber: 4, code: "SOMETHING_NEW", message: "A new rule was broken." }, "SE9")).toEqual({
      where: "Row 4 · SE9",
      text: "A new rule was broken.",
      fix: "Correct this row in the file, then choose the file again.",
    });
  });
});

describe("describeImportFailure", () => {
  const rejected = (message: string) => new ApiFailure({ kind: "server", status: 400, message });

  it("explains why a file was not accepted", () => {
    expect(describeImportFailure(rejected("Only .xlsx workbooks are supported."))).toContain("Only Excel files (.xlsx)");
    expect(describeImportFailure(rejected("The workbook is empty."))).toContain("The file is empty");
    expect(describeImportFailure(rejected("The workbook is invalid or contains unsupported content. Download a new template."))).toContain("cannot be read");
    expect(describeImportFailure(rejected("The workbook contains more than 10000 non-empty student rows."))).toContain("too many students");
  });

  it("tells a lost connection apart from a bad file", () => {
    expect(describeImportFailure(new ApiFailure({ kind: "network" }))).toContain("could not be reached");
    expect(describeImportFailure(new Error("x"))).toContain("exam student template");
  });
});

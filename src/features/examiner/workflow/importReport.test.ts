import { describe, expect, it } from "vitest";
import { importReportMessages } from "./importReport";
import { assertExcelImportFile } from "@/lib/excelImport";

describe("Excel import feedback", () => {
  it("includes row-only failures and removes duplicate issues", () => {
    const issue = { rowNumber: 3, column: "Student Code", code: "STUDENT_NOT_FOUND", message: "Not found" };
    const row = { rowNumber: 3, studentCode: "SE1234", errors: [issue] };
    expect(importReportMessages({ errors: [], rows: [row] })[0]).toContain("Row 3 · SE1234 · Student Code");
    expect(importReportMessages({ errors: [issue], rows: [row] })).toHaveLength(1);
  });

  it("explains extra columns without row errors", () => {
    expect(importReportMessages({ errors: [{ code: "UNEXPECTED_COLUMNS" }], rows: [] })[0]).toContain("extra columns");
  });

  it("rejects wrong extensions and empty files before uploading", () => {
    expect(() => assertExcelImportFile(new File(["data"], "students.csv"))).toThrow(".xlsx");
    expect(() => assertExcelImportFile(new File([], "students.xlsx"))).toThrow("empty");
    expect(() => assertExcelImportFile(new File(["data"], "students.XLSX"))).not.toThrow();
  });
});

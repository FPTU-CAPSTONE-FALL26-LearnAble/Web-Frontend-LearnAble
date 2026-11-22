import { describe, expect, it } from "vitest";
import type { ManagedQuestion } from "@/features/lecturer/questions/model";
import { buildQuestionWorkbook, EXPORT_COLORS as COLOR, questionExportFileName, toExcelLocalDate } from "./questionExport";

const question = (overrides: Partial<ManagedQuestion> = {}): ManagedQuestion => ({
  id: "08cf096d-8e3b-4c1a-9f2d-0123456789ab",
  purpose: "exam",
  content: "What does a service boundary define?",
  subjectCode: "SWE201",
  subjectName: "Software Architecture",
  topic: "Microservices",
  type: "Single Choice",
  difficulty: "Medium",
  score: 1,
  status: "Draft",
  usageCount: null,
  readiness: "Draft",
  updatedAt: new Date(2026, 10, 9, 19, 1).toISOString(),
  examTypeName: "Final",
  ...overrides,
});
const context = {
  purpose: "exam" as const,
  title: "Exam Questions",
  filters: [["Exam type", "Final"], ["Status", "Draft"]] as Array<[string, string]>,
  exportedAt: new Date(2026, 10, 9, 14, 5),
  page: 1,
  pageCount: 2,
  totalCount: 12,
};
const cell = (row: unknown, index: number) => (row as Array<Record<string, unknown> | null>)[index] as Record<string, unknown>;

describe("buildQuestionWorkbook", () => {
  const { data, sheetOptions, options, fileName } = buildQuestionWorkbook([question(), question({ id: "b", status: "Archived", difficulty: "Hard", score: 2.5 })], context);

  it("opens with a title, the filters and the export details", () => {
    expect(cell(data[0], 0)).toMatchObject({ value: "LearnAble · Exam Questions", columnSpan: 11 });
    expect(cell(data[1], 0).value).toBe("Filters: Exam type Final  ·  Status Draft");
    expect(cell(data[2], 0).value).toBe("Exported 09/11/2026 14:05  ·  Page 1 of 2  ·  2 questions of 12");
  });

  it("keeps every row the same width, so merged banners do not shift the table", () => {
    expect(new Set(data.map((row) => row.length))).toEqual(new Set([11]));
    expect(data[0].slice(1).every((item) => item === null)).toBe(true);
  });

  it("has a styled header row with every column named", () => {
    const header = data[3];
    expect(header.map((item) => (item as { value: string }).value)).toEqual([
      "No.", "Question", "Subject", "Subject name", "Topic", "Type", "Difficulty", "Points", "Status", "Last updated", "Question ID",
    ]);
    expect(cell(header, 0)).toMatchObject({ fontWeight: "bold", backgroundColor: COLOR.navy, textColor: COLOR.white });
    expect(cell(data[0], 0)).toMatchObject({ backgroundColor: COLOR.brand, textColor: COLOR.navy });
  });

  it("writes one row per question, numbered, with the full id kept for traceability", () => {
    expect(data).toHaveLength(6);
    expect(cell(data[4], 0).value).toBe(1);
    expect(cell(data[5], 0).value).toBe(2);
    expect(cell(data[4], 10).value).toBe("08cf096d-8e3b-4c1a-9f2d-0123456789ab");
  });

  it("wraps long text, aligns it to the top and draws light borders", () => {
    expect(cell(data[4], 1)).toMatchObject({ wrap: true, alignVertical: "top", borderColor: COLOR.line, borderStyle: "thin" });
  });

  it("colours the status so it can be scanned, with readable text on every fill", () => {
    expect(cell(data[4], 8)).toMatchObject({ value: "Draft", textColor: COLOR.navy, backgroundColor: COLOR.yellow });
    expect(cell(data[5], 8)).toMatchObject({ value: "Archived", textColor: COLOR.slate, backgroundColor: COLOR.line });
    const active = buildQuestionWorkbook([question({ status: "Active" })], context).data[4];
    expect(cell(active, 8)).toMatchObject({ value: "Active", textColor: COLOR.navy, backgroundColor: COLOR.green });
  });

  it("flags only the hard questions", () => {
    expect(cell(data[5], 6)).toMatchObject({ value: "Hard", textColor: COLOR.red, fontWeight: "bold" });
    expect(cell(data[4], 6)).toMatchObject({ value: "Medium", textColor: COLOR.navy });
    expect(cell(data[4], 6).fontWeight).toBeUndefined();
  });

  it("stores points as numbers and updated times as dates in the local time shown in the app", () => {
    expect(cell(data[4], 7)).toMatchObject({ value: 1, type: Number, format: "0" });
    expect(cell(data[5], 7)).toMatchObject({ value: 2.5, format: "0.00" });
    const updated = cell(data[4], 9);
    expect(updated).toMatchObject({ type: Date, format: "dd/mm/yyyy hh:mm" });
    expect((updated.value as Date).toISOString()).toBe("2026-11-09T19:01:00.000Z");
  });

  it("sizes the columns, freezes the header and prints landscape", () => {
    expect(sheetOptions.columns.map((column) => column.width)).toEqual([6, 62, 12, 28, 32, 16, 12, 9, 12, 18, 40]);
    expect(sheetOptions).toMatchObject({ sheet: "Exam questions", stickyRowsCount: 4, orientation: "landscape", showGridLines: false });
    expect(options.fontFamily).toBe("Calibri");
  });

  it("names the file with the date and time", () => {
    expect(fileName).toBe("exam-questions-20261109-1405.xlsx");
    expect(questionExportFileName("practice", new Date(2027, 0, 5, 8, 3))).toBe("practice-questions-20270105-0803.xlsx");
  });
});

describe("edge cases", () => {
  it("shows a dash instead of an empty cell and keeps unreadable dates readable", () => {
    const { data } = buildQuestionWorkbook([question({ content: "  ", topic: "", updatedAt: "not a date" })], context);
    expect(cell(data[4], 1).value).toBe("—");
    expect(cell(data[4], 4).value).toBe("—");
    expect(cell(data[4], 9).value).toBe("—");
  });

  it("does not say 'of N' when the page holds everything, and uses the singular", () => {
    const { data } = buildQuestionWorkbook([question()], { ...context, totalCount: 1, pageCount: 1 });
    expect(cell(data[2], 0).value).toContain("Page 1 of 1  ·  1 question");
    expect(cell(data[2], 0).value).not.toContain("of 1  ·  1 question of");
  });

  it("still produces the title and header when there are no questions", () => {
    const { data } = buildQuestionWorkbook([], { ...context, totalCount: 0 });
    expect(data).toHaveLength(4);
    expect(cell(data[2], 0).value).toContain("0 questions");
  });

  it("uses its own sheet name for practice questions", () => {
    expect(buildQuestionWorkbook([], { ...context, purpose: "practice" }).sheetOptions.sheet).toBe("Practice questions");
  });

  it("keeps text that looks like a formula as plain text", () => {
    const { data } = buildQuestionWorkbook([question({ content: "=HYPERLINK(\"http://x\")" })], context);
    expect(cell(data[4], 1).type).toBeUndefined();
  });
});

describe("toExcelLocalDate", () => {
  it("keeps the local clock time", () => {
    expect(toExcelLocalDate(new Date(2026, 0, 31, 23, 59).toISOString())?.toISOString()).toBe("2026-01-31T23:59:00.000Z");
  });

  it("returns nothing for an unreadable date", () => {
    expect(toExcelLocalDate("")).toBeNull();
  });
});

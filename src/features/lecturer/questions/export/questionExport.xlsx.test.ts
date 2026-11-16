// @vitest-environment node
import { unzipSync, strFromU8 } from "fflate";
import writeExcelFile from "write-excel-file/node";
import { describe, expect, it } from "vitest";
import type { ManagedQuestion } from "@/features/lecturer/questions/model";
import { buildQuestionWorkbook, EXPORT_COLORS as COLOR } from "./questionExport";

const question = (id: string, overrides: Partial<ManagedQuestion> = {}): ManagedQuestion => ({
  id,
  purpose: "exam",
  content: "What does a service boundary define in a distributed system, and why does it matter for teams?",
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
  ...overrides,
});

async function buildFile() {
  const { data, sheetOptions, options } = buildQuestionWorkbook(
    [question("q1"), question("q2", { status: "Archived", score: 2.5 })],
    { purpose: "exam", title: "Exam Questions", filters: [["Exam type", "Final"]], exportedAt: new Date(2026, 10, 9, 14, 5), page: 1, pageCount: 1, totalCount: 2 },
  );
  const buffer = await writeExcelFile(data, sheetOptions, options).toBuffer();
  const files = unzipSync(new Uint8Array(buffer));
  const read = (path: string) => strFromU8(files[path]);
  return { files, read, sheet: read("xl/worksheets/sheet1.xml") };
}

describe("the generated .xlsx file", () => {
  it("is a real workbook package with a sheet, styles and a workbook part", async () => {
    const { files } = await buildFile();
    for (const part of ["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) {
      expect(Object.keys(files)).toContain(part);
    }
  });

  it("names the sheet and freezes the four top rows", async () => {
    const { read, sheet } = await buildFile();
    expect(read("xl/workbook.xml")).toContain('name="Exam questions"');
    expect(sheet).toMatch(/<pane[^>]*ySplit="4"[^>]*state="frozen"|<pane[^>]*state="frozen"[^>]*ySplit="4"/);
  });

  it("sets a width for every column and hides the grid lines", async () => {
    const { sheet } = await buildFile();
    expect((sheet.match(/<col /g) ?? []).length).toBe(11);
    expect(sheet).toMatch(/showGridLines="(false|0)"/);
  });

  it("merges the three banner rows across all columns", async () => {
    const { sheet } = await buildFile();
    for (const row of [1, 2, 3]) expect(sheet).toContain(`<mergeCell ref="A${row}:K${row}"`);
  });

  it("prints landscape", async () => {
    const { sheet } = await buildFile();
    expect(sheet).toContain('orientation="landscape"');
  });

  it("stores the update time as the local clock time, not shifted by the time zone", async () => {
    const { sheet } = await buildFile();
    const numbers = [...sheet.matchAll(/<v>([0-9]+(?:\.[0-9]+)?)<\/v>/g)].map((match) => Number(match[1]));
    const expected = (Date.UTC(2026, 10, 9) - Date.UTC(1899, 11, 30)) / 86_400_000 + (19 * 60 + 1) / 1440;
    expect(numbers.some((value) => Math.abs(value - expected) < 1e-6)).toBe(true);
  });

  it("carries the text, the numbers and the cell styles", async () => {
    const { read, sheet } = await buildFile();
    const strings = read("xl/sharedStrings.xml");
    expect(strings).toContain("LearnAble · Exam Questions");
    expect(strings).toContain("Question ID");
    expect(sheet).toContain("2.5");
    // Banner, header, and the Draft and Archived status colours.
    const styles = read("xl/styles.xml").toUpperCase();
    for (const color of [COLOR.brand, COLOR.navy, COLOR.yellow, COLOR.line]) expect(styles).toContain(`FF${color.slice(1).toUpperCase()}`);
    expect(styles).toContain("DD/MM/YYYY HH:MM");
  });
});

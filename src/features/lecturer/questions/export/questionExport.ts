import type { CellObject, SheetData } from "write-excel-file/browser";
import { formatLocalDateTime } from "@/features/examiner/workflow/dateTime";
import type { ManagedQuestion, QuestionPurpose } from "@/features/lecturer/questions/model";

export type QuestionExportContext = {
  purpose: QuestionPurpose;
  /** Page heading, for example "Exam Questions". */
  title: string;
  /** Active filters as name and value pairs, shown under the title. */
  filters: Array<[string, string]>;
  exportedAt: Date;
  page: number;
  pageCount: number;
  /** Questions matching the filters across all pages. */
  totalCount: number;
};

/**
 * The app's approved hex palette (see scripts/check-colors.mjs), because a workbook cannot use CSS variables.
 * Text on a coloured fill is chosen for contrast: navy on orange, green and yellow, white on navy and red.
 */
export const EXPORT_COLORS = {
  navy: "#0F172A",
  white: "#FFFFFF",
  brand: "#F26F21",
  slate: "#475569",
  muted: "#64748B",
  line: "#E2E8F0",
  green: "#16A34A",
  yellow: "#EAB308",
  red: "#DC2626",
} as const;
const COLOR = EXPORT_COLORS;

const STATUS_STYLE: Record<string, { textColor: string; backgroundColor: string }> = {
  Active: { textColor: COLOR.navy, backgroundColor: COLOR.green },
  Draft: { textColor: COLOR.navy, backgroundColor: COLOR.yellow },
  Archived: { textColor: COLOR.slate, backgroundColor: COLOR.line },
};

type Column = {
  header: string;
  width: number;
  align: "left" | "center";
  cell: (question: ManagedQuestion, index: number) => CellObject;
};

const orEmpty = (value: string | undefined | null) => (value && value.trim() ? value : "—");

/** A date whose UTC parts equal the local parts, because the writer stores UTC and Excel shows no zone. */
export function toExcelLocalDate(iso: string): Date | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const local = new Date(time);
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()));
}

const columns: Column[] = [
  { header: "No.", width: 6, align: "center", cell: (_, index) => ({ value: index + 1, type: Number, align: "center" }) },
  { header: "Question", width: 62, align: "left", cell: (question) => ({ value: orEmpty(question.content) }) },
  { header: "Subject", width: 12, align: "left", cell: (question) => ({ value: orEmpty(question.subjectCode), fontWeight: "bold" }) },
  { header: "Subject name", width: 28, align: "left", cell: (question) => ({ value: orEmpty(question.subjectName) }) },
  { header: "Topic", width: 32, align: "left", cell: (question) => ({ value: orEmpty(question.topic) }) },
  { header: "Type", width: 16, align: "left", cell: (question) => ({ value: orEmpty(question.type) }) },
  {
    header: "Difficulty",
    width: 12,
    align: "center",
    // Only "Hard" is flagged; colouring every level would turn the column into noise.
    cell: (question) => ({ value: orEmpty(question.difficulty), align: "center", ...(question.difficulty === "Hard" ? { fontWeight: "bold" as const, textColor: COLOR.red } : {}) }),
  },
  {
    header: "Points",
    width: 9,
    align: "center",
    cell: (question) => ({ value: question.score, type: Number, align: "center", format: Number.isInteger(question.score) ? "0" : "0.00" }),
  },
  {
    header: "Status",
    width: 12,
    align: "center",
    cell: (question) => ({ value: orEmpty(question.status), align: "center", fontWeight: "bold", ...(STATUS_STYLE[question.status] ?? {}) }),
  },
  {
    header: "Last updated",
    width: 18,
    align: "center",
    cell: (question) => {
      const date = toExcelLocalDate(question.updatedAt);
      return date ? { value: date, type: Date, format: "dd/mm/yyyy hh:mm", align: "center" } : { value: "—", align: "center" };
    },
  },
  { header: "Question ID", width: 40, align: "left", cell: (question) => ({ value: question.id, fontSize: 9, textColor: COLOR.muted, wrap: false }) },
];

const pad = (value: number) => String(value).padStart(2, "0");

export function questionExportFileName(purpose: QuestionPurpose, at: Date) {
  return `${purpose}-questions-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.xlsx`;
}

/** The workbook for one page of the question bank. Pure data, so it can be checked without a spreadsheet program. */
export function buildQuestionWorkbook(questions: ManagedQuestion[], context: QuestionExportContext) {
  const span = columns.length;
  const bannerRow = (cell: CellObject): SheetData[number] => [{ ...cell, columnSpan: span, alignVertical: "center", indent: 1 }, ...Array<null>(span - 1).fill(null)];

  const count = `${questions.length} question${questions.length === 1 ? "" : "s"}${context.totalCount > questions.length ? ` of ${context.totalCount}` : ""}`;
  const data: SheetData = [
    bannerRow({ value: `LearnAble · ${context.title}`, fontSize: 16, fontWeight: "bold", textColor: COLOR.navy, backgroundColor: COLOR.brand, height: 32 }),
    bannerRow({
      value: `Filters: ${context.filters.map(([name, value]) => `${name} ${value}`).join("  ·  ")}`,
      textColor: COLOR.slate,
      height: 20,
    }),
    bannerRow({
      value: `Exported ${formatLocalDateTime(context.exportedAt.toISOString())}  ·  Page ${context.page} of ${context.pageCount}  ·  ${count}`,
      textColor: COLOR.slate,
      height: 20,
    }),
    columns.map((column): CellObject => ({
      value: column.header,
      fontWeight: "bold",
      textColor: COLOR.white,
      backgroundColor: COLOR.navy,
      align: column.align,
      alignVertical: "center",
      height: 26,
      borderColor: COLOR.line,
      borderStyle: "thin",
    })),
    ...questions.map((question, index) =>
      columns.map((column): CellObject => ({
        wrap: true,
        alignVertical: "top",
        textColor: COLOR.navy,
        borderColor: COLOR.line,
        borderStyle: "thin",
        ...column.cell(question, index),
      })),
    ),
  ];

  return {
    data,
    sheetOptions: {
      sheet: context.purpose === "practice" ? "Practice questions" : "Exam questions",
      columns: columns.map((column) => ({ width: column.width })),
      // Title, both information rows and the header stay in view while scrolling.
      stickyRowsCount: 4,
      orientation: "landscape" as const,
      showGridLines: false,
    },
    options: { fontFamily: "Calibri", fontSize: 11 },
    fileName: questionExportFileName(context.purpose, context.exportedAt),
  };
}

/** Builds the workbook and starts the browser download. The writer is loaded only when someone exports. */
export async function downloadQuestionWorkbook(questions: ManagedQuestion[], context: QuestionExportContext) {
  const { data, sheetOptions, options, fileName } = buildQuestionWorkbook(questions, context);
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(data, sheetOptions, options).toFile(fileName);
}

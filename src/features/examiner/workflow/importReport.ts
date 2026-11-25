import { describeImportIssue } from "./studentImportMessages";

type Issue = { rowNumber?: number | null; column?: string | null; code?: string | null; message?: string | null };
type Report = {
  errors: Issue[];
  rows: { rowNumber: number; studentCode?: string | null; lecturerCode?: string | null; errors: Issue[] }[];
};

/** Preserve file-level and row-level issues, even when the server reports them separately. */
export function importReportMessages(report: Report): string[] {
  return [...new Set([...report.errors, ...report.rows.flatMap((row) => row.errors)].map((issue) => {
    const row = report.rows.find((item) => item.rowNumber === issue.rowNumber);
    const friendly = describeImportIssue({ ...issue, message: issue.message ?? "Check this value against the template." }, row?.studentCode ?? row?.lecturerCode);
    return `${friendly.where}${issue.column ? ` · ${issue.column}` : ""}: ${friendly.text} ${friendly.fix}`;
  }))];
}

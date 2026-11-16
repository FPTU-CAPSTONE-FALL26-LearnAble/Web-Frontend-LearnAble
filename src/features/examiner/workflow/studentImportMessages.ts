import { ApiFailure } from "@/api/client";

export type ImportIssue = { rowNumber?: number | null; code?: string | null; message: string };
export type FriendlyIssue = { where: string; text: string; fix: string };

const REMOVE_OR_FIX = "Correct this row in the file, then choose the file again.";

/** What went wrong with a row, and what to do about it, in words for the person importing the file. */
const known: Record<string, (code: string) => { text: string; fix: string }> = {
  STUDENT_NOT_FOUND: (code) => ({ text: `${code || "This code"} is not a student of your university.`, fix: "Check the code for a typo, or remove this row." }),
  DUPLICATE_STUDENT: (code) => ({ text: `${code || "This student"} appears more than once.`, fix: "Keep one row for each student." }),
  AMBIGUOUS_STUDENT_CODE: (code) => ({ text: `More than one account uses the code ${code || "in this row"}.`, fix: "Ask the staff office to correct the accounts, then choose the file again." }),
  NOT_STUDENT: (code) => ({ text: `${code || "This code"} belongs to an account that is not a student.`, fix: "Use a student's code, or remove this row." }),
  STUDENT_INACTIVE: (code) => ({ text: `The account of ${code || "this student"} is turned off.`, fix: "Ask the staff office to turn it on, or remove this row." }),
  STUDENT_PROFILE_MISSING: (code) => ({ text: `${code || "This student"} has no student record yet.`, fix: "Ask the staff office to set it up, or remove this row." }),
  STUDENT_NOT_STUDYING: (code) => ({ text: `${code || "This student"} is not studying at the moment.`, fix: "Only students who are studying can be added. Remove this row." }),
  INVALID_STUDENT_CODE: () => ({ text: "The student code is empty or longer than 20 characters.", fix: "Type the code, or delete the row." }),
  STUDENT_CODE_MUST_BE_TEXT: () => ({ text: "The student code is stored as a number, which can drop leading zeros.", fix: "Format the Student Code column as Text and enter the codes again." }),
  INVALID_EXTRA_TIME: (code) => ({ text: `The extra time of ${code || "this student"} is not a whole number of minutes.`, fix: "Use a whole number from 0 to 1440, or leave it empty." }),
  NOTES_TOO_LONG: () => ({ text: "The accommodation note is too long.", fix: "Keep it under 2,000 characters." }),
  MISSING_SHEET: () => ({ text: "The file has no sheet named Students.", fix: "Download the template again and put the students on its Students sheet." }),
  UNSUPPORTED_LAYOUT: () => ({ text: "The Students sheet has merged cells, or the file has too many sheets.", fix: "Unmerge the cells and keep at most eight sheets." }),
  UNEXPECTED_COLUMNS: () => ({ text: "The Students sheet has columns that are not in the template.", fix: "Keep only Student Code, Extra Time Minutes and Accommodation Notes." }),
  INVALID_HEADER: () => ({ text: "The column titles in the first row were changed.", fix: "Put the original titles back, in the original order." }),
  NO_STUDENTS: () => ({ text: "The file has no students.", fix: "Add at least one student code under the titles." }),
};

export function describeImportIssue(issue: ImportIssue, studentCode?: string | null): FriendlyIssue {
  const where = issue.rowNumber ? `Row ${issue.rowNumber}${studentCode ? ` · ${studentCode}` : ""}` : "File";
  const make = issue.code ? known[issue.code] : undefined;
  const friendly = make ? make(studentCode ?? "") : { text: issue.message, fix: REMOVE_OR_FIX };
  return { where, ...friendly };
}

/** Why a whole file was turned down, for the message shown when it cannot be checked at all. */
export function describeImportFailure(error: unknown): string {
  if (error instanceof ApiFailure && error.detail.kind === "network") return "The server could not be reached. Check your connection and choose the file again.";
  if (error instanceof ApiFailure && error.detail.kind === "unauthorized") return "Your session has ended. Sign in again, then choose the file again.";
  const detail = error instanceof ApiFailure
    ? `${error.serverMessage ?? ""} ${error.detail.kind === "server" ? error.detail.message ?? "" : ""}`.toLowerCase()
    : "";
  if (detail.includes(".xlsx")) return "Only Excel files (.xlsx) can be used. Save the list as .xlsx and choose it again.";
  if (detail.includes("more than")) return "The file has too many students. Split it into smaller files of up to 10,000 students.";
  if (detail.includes("is empty")) return "The file is empty. Add the students to the template and choose it again.";
  if (detail.includes("unsupported") || detail.includes("invalid")) return "This file cannot be read. Download the template again and copy the students into it.";
  if (detail.includes("archived")) return "This exam is archived, so students cannot be added to it. Choose another exam.";
  return "The file was not accepted. Use the exam student template (.xlsx) and choose it again.";
}

import { z } from "zod";
import { ApiFailure, request, requestBlob } from "@/api/client";

const nullableString = z.string().nullable().optional();
const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({
  success: z.boolean(),
  message: nullableString,
  data: schema.nullable(),
  errors: z.array(z.string()).nullable().optional(),
});

async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) {
    throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
  }
  return response.data;
}

/*
 * Invigilation registration (periods, slots, lecturer availability) was removed: the school sends the
 * lecturer and student lists, which are imported, so lecturers no longer pick shifts themselves.
 * What stays here is the import of the students who sit an exam.
 */
const importIssueSchema = z.object({ rowNumber: z.number().nullable(), column: z.string(), code: z.string(), message: z.string() });
const importRowSchema = z.object({
  rowNumber: z.number(), studentCode: z.string(), studentId: nullableString, fullName: nullableString,
  extraTimeMinutes: z.number(), accommodationNotes: nullableString, isValid: z.boolean(), errors: z.array(importIssueSchema),
});
export const studentImportValidationSchema = z.object({
  examSubjectId: z.string(), fileSha256: z.string(), totalRows: z.number(), validRows: z.number(), invalidRows: z.number(),
  canContinue: z.boolean(), rows: z.array(importRowSchema), errors: z.array(importIssueSchema),
});
export type StudentImportValidation = z.infer<typeof studentImportValidationSchema>;

export const downloadStudentImportTemplate = (examSubjectId: string) =>
  requestBlob(`/examsubjects/${examSubjectId}/student-import/template`);
export const validateStudentImport = (examSubjectId: string, file: File) => {
  const body = new FormData();
  body.append("File", file);
  return unwrap(`/examsubjects/${examSubjectId}/student-import/validate`, studentImportValidationSchema, { method: "POST", body });
};

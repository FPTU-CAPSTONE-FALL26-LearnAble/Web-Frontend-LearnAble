import { z } from "zod";
import { ApiFailure, request, requestBlob } from "@/api/client";
import { pageSchema, queryString } from "@/api/catalog";

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
async function command(path: string, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(z.unknown()), init);
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
}
const tag = (id: string, revision: string) => `"${id.replaceAll("-", "")}-${revision.replaceAll("-", "")}"`;
const ifMatch = (id: string, revision?: string | null) => revision ? { "If-Match": tag(id, revision) } : undefined;

export const invigilationPeriodStatusSchema = z.enum(["Draft", "Open", "Closed", "Cancelled"]);
export const invigilationSlotSchema = z.object({
  slotId: z.string(), periodId: z.string(), name: z.string(), startsAt: z.string(), endsAt: z.string(), revision: z.string(),
});
export const invigilationPeriodSchema = z.object({
  periodId: z.string(), universityId: z.string(), semesterId: z.string(), name: z.string(), description: nullableString,
  examFromDate: z.string(), examToDate: z.string(), registrationOpensAt: z.string(), registrationClosesAt: z.string(),
  status: invigilationPeriodStatusSchema, canRegister: z.boolean(), createdBy: z.string(), createdAt: z.string(),
  updatedAt: z.string(), revision: z.string(), slotCount: z.number(), registrationCount: z.number(),
});
export const invigilationPeriodDetailSchema = z.object({
  period: invigilationPeriodSchema,
  slots: z.array(invigilationSlotSchema).nullable().transform((value) => value ?? []),
  selectedSlotIds: z.array(z.string()).nullable().transform((value) => value ?? []),
});
export const invigilationCandidateSchema = z.object({
  slotId: z.string(), lecturerId: z.string(), userCode: z.string(), name: z.string(), isActive: z.boolean(),
  departmentId: nullableString, registeredAt: z.string(),
});
export const lecturerAvailabilitySchema = z.object({
  periodId: z.string(), lecturerId: z.string(), status: invigilationPeriodStatusSchema, canRegister: z.boolean(),
  slotIds: z.array(z.string()).nullable().transform((value) => value ?? []),
  choices: z.array(z.object({ slotId: z.string(), registeredAt: z.string() })).nullable().transform((value) => value ?? []),
  revision: z.string(),
});

export type InvigilationPeriod = z.infer<typeof invigilationPeriodSchema>;
export type InvigilationPeriodDetail = z.infer<typeof invigilationPeriodDetailSchema>;
export type InvigilationCandidate = z.infer<typeof invigilationCandidateSchema>;

export const getInvigilationPeriods = (filters: Record<string, string | number | boolean | null | undefined> = {}) =>
  unwrap(`/invigilation-periods${queryString({ Page: 1, PageSize: 100, ...filters })}`, pageSchema(invigilationPeriodSchema));
export const getInvigilationPeriod = (periodId: string) =>
  unwrap(`/invigilation-periods/${periodId}`, invigilationPeriodDetailSchema);
export const createInvigilationPeriod = (input: { semesterId: string; name: string; description?: string | null; examFromDate: string; examToDate: string; registrationOpensAt: string; registrationClosesAt: string }) =>
  unwrap("/invigilation-periods", invigilationPeriodSchema, { method: "POST", json: input });
export const updateInvigilationPeriod = (periodId: string, input: { semesterId: string; name: string; description?: string | null; examFromDate: string; examToDate: string; registrationOpensAt: string; registrationClosesAt: string }, revision?: string | null) =>
  unwrap(`/invigilation-periods/${periodId}`, invigilationPeriodSchema, { method: "PUT", headers: ifMatch(periodId, revision), json: input });
export const deleteInvigilationPeriod = (periodId: string, revision?: string | null) =>
  command(`/invigilation-periods/${periodId}`, { method: "DELETE", headers: ifMatch(periodId, revision) });
export const changeInvigilationPeriodStatus = (periodId: string, action: "open" | "close" | "cancel", revision?: string | null) =>
  unwrap(`/invigilation-periods/${periodId}/${action}`, invigilationPeriodSchema, { method: "POST", headers: ifMatch(periodId, revision) });
export const addInvigilationSlots = (periodId: string, slots: Array<{ name: string; startsAt: string; endsAt: string }>, revision?: string | null) =>
  unwrap(`/invigilation-periods/${periodId}/slots`, z.array(invigilationSlotSchema), { method: "POST", headers: ifMatch(periodId, revision), json: { slots } });
export const updateInvigilationSlot = (periodId: string, slotId: string, input: { name: string; startsAt: string; endsAt: string }, revision?: string | null) =>
  unwrap(`/invigilation-periods/${periodId}/slots/${slotId}`, invigilationSlotSchema, { method: "PUT", headers: ifMatch(slotId, revision), json: input });
export const deleteInvigilationSlot = (periodId: string, slotId: string, revision?: string | null) =>
  command(`/invigilation-periods/${periodId}/slots/${slotId}`, { method: "DELETE", headers: ifMatch(slotId, revision) });
export const getInvigilationCandidates = (periodId: string, slotId: string) =>
  unwrap(`/invigilation-periods/${periodId}/slots/${slotId}/candidates${queryString({ Page: 1, PageSize: 200 })}`, pageSchema(invigilationCandidateSchema));
export const getInvigilationRegistrations = (periodId: string) =>
  unwrap(`/invigilation-periods/${periodId}/registrations${queryString({ Page: 1, PageSize: 200 })}`, pageSchema(invigilationCandidateSchema));

export const getLecturerInvigilationPeriods = () =>
  unwrap(`/lecturer/invigilation-periods${queryString({ Page: 1, PageSize: 100 })}`, pageSchema(invigilationPeriodSchema));
export const getLecturerInvigilationPeriod = (periodId: string) =>
  unwrap(`/lecturer/invigilation-periods/${periodId}`, invigilationPeriodDetailSchema);
export const getLecturerAvailability = (periodId: string) =>
  unwrap(`/lecturer/invigilation-periods/${periodId}/availability`, lecturerAvailabilitySchema);
export const updateLecturerAvailability = (periodId: string, slotIds: string[], revision?: string | null) =>
  unwrap(`/lecturer/invigilation-periods/${periodId}/availability`, lecturerAvailabilitySchema, {
    method: "PUT", headers: ifMatch(periodId, revision), json: { slotIds },
  });

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

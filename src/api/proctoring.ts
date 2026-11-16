import { z } from "zod";
import { ApiFailure, request, requestBlob } from "@/api/client";

const nullableString = z.string().nullable().optional();

function envelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ success: z.boolean(), message: nullableString, data: schema.nullable(), errors: z.array(z.string()).nullable().optional() });
}

async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }): Promise<z.output<T>> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw new ApiFailure({ kind: "server", status: 200 }, response.message ?? undefined);
  return response.data;
}

const pageSchema = <T extends z.ZodTypeAny>(item: T) => z.object({
  items: z.array(item).nullable().transform((value) => value ?? []),
  pageNumber: z.number(), pageSize: z.number(), totalCount: z.number(), totalPages: z.number(),
  hasPreviousPage: z.boolean(), hasNextPage: z.boolean(),
});

export const proctoringSegmentSchema = z.object({
  sequenceNumber: z.number(), status: nullableString, contentType: nullableString,
  expectedSizeBytes: z.number(), verifiedSizeBytes: z.number().nullable().optional(),
  startedOffsetMs: z.number(), durationMs: z.number(), verifiedDurationMs: z.number().nullable().optional(),
  verifiedAt: nullableString, failureCode: nullableString, canDeleteLocalFile: z.boolean(),
});

export const proctoringRecordingSchema = z.object({
  recordingId: z.string(), attemptId: z.string(), status: nullableString, revision: z.string(),
  startedAt: z.string(), completedAt: nullableString, expiresAt: z.string(), uploadDeadlineAt: z.string(),
  lastSequenceNumber: z.number().nullable().optional(), segmentDurationSeconds: z.number(),
  uploadJitterMaxSeconds: z.number(), maxSegmentSizeBytes: z.number(), maxSegmentsPerRecording: z.number(),
  policyVersion: nullableString, segments: pageSchema(proctoringSegmentSchema).nullable().optional(),
  missingSequenceNumbers: z.array(z.number()).nullable().transform((value) => value ?? []),
});

export const proctoringPolicySchema = z.object({
  enabled: z.boolean(), recordingRequired: z.boolean(), cameraUnavailablePolicy: nullableString,
  policyVersion: nullableString, retentionDays: z.number(), consentAccepted: z.boolean(),
  uploadGraceSeconds: z.number(), segmentDurationSeconds: z.number(), uploadJitterMaxSeconds: z.number(),
  maxSegmentSizeBytes: z.number(),
});

export type ProctoringRecording = z.infer<typeof proctoringRecordingSchema>;
export type ProctoringPolicy = z.infer<typeof proctoringPolicySchema>;

export const getRecordingPolicy = (scheduleId: string) =>
  unwrap(`/me/exam-schedules/${scheduleId}/recording-policy`, proctoringPolicySchema);
export const submitRecordingConsent = (scheduleId: string, accepted: boolean, policyVersion?: string | null) =>
  unwrap(`/me/exam-schedules/${scheduleId}/recording-consent`, z.object({ scheduleId: z.string(), recordingConsentAt: z.string(), policyVersion: nullableString }), {
    method: "POST", json: { accepted, policyVersion: policyVersion ?? null },
  });
export const createAttemptRecording = (attemptId: string, clientRecordingId: string = crypto.randomUUID()) =>
  unwrap(`/exam-attempts/${attemptId}/recordings`, proctoringRecordingSchema, { method: "POST", json: { clientRecordingId } });
export const getAttemptRecordings = (attemptId: string, page = 1, pageSize = 100) =>
  unwrap(`/exam-attempts/${attemptId}/recordings?Page=${page}&PageSize=${pageSize}`, pageSchema(proctoringRecordingSchema));
export const getProctoringRecording = (recordingId: string, page = 1, pageSize = 100) =>
  unwrap(`/proctoring-recordings/${recordingId}?Page=${page}&PageSize=${pageSize}`, proctoringRecordingSchema);
export const registerProctoringSegment = (recordingId: string, input: {
  sequenceNumber: number; contentType?: string | null; sizeBytes: number; sha256?: string | null;
  startedOffsetMs: number; durationMs: number;
}) => unwrap(`/proctoring-recordings/${recordingId}/segments/upload-url`, z.object({
  recordingId: z.string(), sequenceNumber: z.number(), status: nullableString, uploadUrl: nullableString,
  method: nullableString, requiredHeaders: z.record(z.string(), z.string()).nullable().optional(),
  requiresAuthentication: z.boolean(), expiresAt: nullableString,
}), { method: "POST", json: input });
export const uploadProctoringSegmentContent = (recordingId: string, sequenceNumber: number, content: Blob) =>
  requestBlob(`/proctoring-recordings/${recordingId}/segments/${sequenceNumber}/content`, { method: "PUT", body: content, headers: { "Content-Type": content.type || "application/octet-stream" } });
export const completeProctoringSegment = (recordingId: string, sequenceNumber: number) =>
  unwrap(`/proctoring-recordings/${recordingId}/segments/${sequenceNumber}/complete`, proctoringSegmentSchema, { method: "POST" });
export const completeProctoringRecording = (recordingId: string, lastSequenceNumber?: number | null) =>
  unwrap(`/proctoring-recordings/${recordingId}/complete`, proctoringRecordingSchema, { method: "POST", json: { lastSequenceNumber: lastSequenceNumber ?? null } });
export const getProctoringPlayback = (recordingId: string, sequenceNumber: number) =>
  unwrap(`/proctoring-recordings/${recordingId}/segments/${sequenceNumber}/playback`, z.object({ url: nullableString, expiresAt: z.string(), requiresAuthentication: z.boolean() }));
export const downloadProctoringSegmentContent = (recordingId: string, sequenceNumber: number) =>
  requestBlob(`/proctoring-recordings/${recordingId}/segments/${sequenceNumber}/content`);

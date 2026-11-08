import { z } from "zod";
import { ApiFailure, request } from "@/api/client";

const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({ success: z.boolean(), message: z.string().nullable().optional(), data: schema.nullable(), errors: z.array(z.string()).nullable().optional() });
async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
  return response.data;
}
export const timeExtensionStateSchema = z.object({ attemptId: z.string(), enrollmentId: z.string(), scheduleId: z.string(), studentId: z.string(), status: z.string(), startedAt: z.string(), deadlineAt: z.string(), shiftEndsAt: z.string(), extraTimeMinutes: z.number(), enrollmentExtraTimeMinutes: z.number(), serverNow: z.string(), remainingSeconds: z.number(), canExtend: z.boolean(), maxAdditionalMinutes: z.number(), revision: z.string() });
const operationSchema = z.object({ operationId: z.string(), attemptId: z.string(), additionalMinutes: z.number(), previousDeadlineAt: z.string(), deadlineAt: z.string(), totalExtraTimeMinutes: z.number(), extendedAt: z.string(), extendedBy: z.string(), reason: z.string() });
export const getAttemptTimeExtension = (attemptId: string) => unwrap(`/exam-attempts/${attemptId}/time-extension`, timeExtensionStateSchema);
export const extendAttemptTime = (attemptId: string, revision: string, input: { operationId: string; additionalMinutes: number; reason: string }) => unwrap(`/exam-attempts/${attemptId}/time-extensions`, z.object({ operation: operationSchema, current: timeExtensionStateSchema }), { method: "POST", headers: { "If-Match": revision }, json: input });

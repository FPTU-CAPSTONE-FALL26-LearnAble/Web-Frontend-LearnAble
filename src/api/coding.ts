import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

const nullableString = z.string().nullable().optional();
const jobSchema = z.object({
  jobId: z.string().optional(), id: z.string().optional(), status: nullableString, operationId: z.string().optional(),
  attemptId: z.string().optional(), questionId: z.string().optional(), languageCode: nullableString,
  createdAt: nullableString, completedAt: nullableString, errorCode: nullableString,
}).passthrough();
const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({ success: z.boolean(), message: nullableString, data: schema.nullable(), errors: z.array(z.string()).nullable().optional() });
async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw envelopeFailure(response);
  return response.data;
}
export type CodingOperatorJob = z.infer<typeof jobSchema>;
const codingLanguagesSchema = z.array(z.string()).transform((languages) => [
  ...new Set(languages.map((language) => language.trim()).filter(Boolean)),
]);
const codingLanguagesResponseSchema = z.union([
  codingLanguagesSchema,
  envelope(codingLanguagesSchema),
]);
export const getCodingLanguages = async () => {
  const response = await request("/coding/languages", codingLanguagesResponseSchema);
  if (Array.isArray(response)) return response;
  if (!response.success || response.data == null) throw envelopeFailure(response);
  return response.data;
};
export const getCodingJobs = (attemptId: string, practice: boolean) => unwrap(`/coding-jobs?attemptId=${encodeURIComponent(attemptId)}&practice=${practice}`, z.array(jobSchema));
export const retryCodingJob = (id: string) => unwrap(`/coding-jobs/${id}/retry`, jobSchema, { method: "POST" });
export type CodingConfigurationInput = {
  inputDescription?: string | null; outputDescription?: string | null; constraints?: string | null;
  starterCode?: string | null; cpuSeconds: number; wallSeconds: number; memoryKb: number;
  testCases: Array<{ input?: string | null; expectedOutput: string; weight: number; isPublic: boolean }>;
  starterCodes?: Record<string, string> | null;
};
const codingDefinitionSchema = z.object({
  inputDescription: nullableString, outputDescription: nullableString, constraints: nullableString, starterCode: nullableString,
  cpuSeconds: z.number(), wallSeconds: z.number(), memoryKb: z.number(),
  testCases: z.array(z.object({ input: nullableString, expectedOutput: nullableString, weight: z.number(), isPublic: z.boolean() })).nullable().optional(),
  starterCodes: z.record(z.string(), z.string()).nullable().optional(),
});
export const getCodingQuestion = async (questionId: string) => {
  const result = await request(`/questions/${questionId}/coding`, envelope(codingDefinitionSchema));
  if (!result.success) throw envelopeFailure(result);
  return result.data;
};
export const saveCodingQuestion = (questionId: string, input: CodingConfigurationInput) => unwrap(`/questions/${questionId}/coding`, codingDefinitionSchema, { method: "PUT", json: input });
export const validateCodingQuestion = async (questionId: string) => {
  await request(`/questions/${questionId}/coding/validate`, z.null(), { method: "POST" });
};


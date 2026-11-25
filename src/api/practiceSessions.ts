import { z } from "zod";
import { envelopeFailure, request, requestBlob } from "@/api/client";
import { questionGradeSchema } from "@/api/grading";

const nullableString = z.string().nullable().optional();
const sessionSchema = z.object({
  sessionId: z.string(), examSubjectId: z.string(), examPaperId: z.string(), name: nullableString,
  status: nullableString, opensAt: z.string(), closesAt: z.string(), durationMinutes: z.number(),
  registered: z.number(), revision: z.string(), releasedAt: nullableString,
});
const resultRowSchema = z.object({
  studentId: z.string(), studentCode: nullableString, studentName: nullableString, attemptId: nullableString,
  participation: nullableString, startedAt: nullableString, submittedAt: nullableString, deadlineAt: nullableString,
  submissionReason: nullableString, gradingStatus: nullableString, autoScore: z.number().nullable().optional(),
  manualScore: z.number().nullable().optional(), totalScore: z.number().nullable().optional(), maxScore: z.number(),
  scoreOnTen: z.number().nullable().optional(), passed: z.boolean().nullable().optional(),
});
const resultsSchema = z.object({ session: sessionSchema, students: z.array(resultRowSchema).nullable().transform((v) => v ?? []) });
const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({ success: z.boolean(), message: nullableString, data: schema.nullable(), errors: z.array(z.string()).nullable().optional() });
async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw envelopeFailure(response);
  return response.data;
}

export type PracticeSession = z.infer<typeof sessionSchema>;
export type PracticeResults = z.infer<typeof resultsSchema>;
export const getPracticeSessions = () => unwrap("/lecturer/practice-sessions", z.array(sessionSchema));
export const getPracticeSession = (id: string) => unwrap(`/lecturer/practice-sessions/${id}`, resultsSchema);
export const createPracticeSession = (input: { examPaperId: string; name?: string | null; opensAt: string; closesAt: string; durationMinutes: number }) =>
  unwrap("/lecturer/practice-sessions", sessionSchema, { method: "POST", json: input });
export const setPracticeStudents = (id: string, expectedRevision: string, studentIds: string[]) =>
  unwrap(`/lecturer/practice-sessions/${id}/students`, sessionSchema, { method: "PUT", json: { expectedRevision, students: studentIds.map((studentId) => ({ studentId, extraTimeMinutes: 0, accommodationNotes: null })) } });
export const transitionPracticeSession = (id: string, expectedRevision: string, action: string) =>
  unwrap(`/lecturer/practice-sessions/${id}/transition`, sessionSchema, { method: "POST", json: { expectedRevision, action } });
export const releasePracticeResults = (id: string, expectedRevision: string, showAnswers: boolean) =>
  unwrap(`/lecturer/practice-sessions/${id}/results/release`, sessionSchema, { method: "POST", json: { expectedRevision, showAnswers } });
export const exportPracticeResults = (id: string) => requestBlob(`/lecturer/practice-sessions/${id}/results/export`);

const practiceGradingSchema = z.object({
  attemptId: z.string(),
  revision: z.string(),
  questions: z.array(questionGradeSchema).nullable().transform((value) => value ?? []),
});
export type PracticeGrading = z.infer<typeof practiceGradingSchema>;
export const getPracticeGrading = (sessionId: string, attemptId: string) =>
  unwrap(`/lecturer/practice-sessions/${sessionId}/attempts/${attemptId}/grading`, practiceGradingSchema);
export const gradePracticeQuestion = (
  sessionId: string,
  attemptId: string,
  questionId: string,
  input: { expectedRevision: string; score: number; feedback: string | null },
) => unwrap(`/lecturer/practice-sessions/${sessionId}/attempts/${attemptId}/grading/${questionId}`, practiceGradingSchema, { method: "PUT", json: input });


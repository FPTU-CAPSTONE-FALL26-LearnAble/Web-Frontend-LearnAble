import { z } from "zod";
import {
  newOperationId,
  questionGradeSchema,
  saveAnswerResultSchema,
  storedAnswerSchema,
  studentQuestionSchema,
  unwrapEnvelope,
  type AnswerOperation,
} from "@/api/assessmentAttempt";

/**
 * A student's practice sessions (`StudentPracticeSessions` in the OpenAPI
 * document). A practice session is a lecturer-scheduled run of an exam paper,
 * so its attempt uses the same question, answer and review contract as an
 * exam attempt (`assessmentAttempt.ts`).
 *
 *   GET  /me/practice-sessions                 sessions this student is registered for
 *   POST /me/practice-sessions/{id}/attempt    start the attempt, or return the existing one
 *   GET  /me/practice-sessions/{id}/attempt    the existing attempt
 *   PUT  /me/practice-sessions/{id}/answers    save one answer
 *   POST /me/practice-sessions/{id}/submit     submit, with every final answer
 *   GET  /me/practice-sessions/{id}/result     score and review, once released
 */

const nullableString = z.string().nullable().optional();
const list = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullable().optional().transform((items) => items ?? []);

/** `PracticeSessionResponseModel`. Status: Draft, Scheduled, Open, Closed, Completed. */
export const practiceSessionSchema = z.object({
  sessionId: z.string(),
  examSubjectId: z.string(),
  examPaperId: z.string(),
  name: nullableString,
  status: nullableString,
  opensAt: z.string(),
  closesAt: z.string(),
  durationMinutes: z.number(),
  registered: z.number(),
  revision: z.string(),
  releasedAt: nullableString,
});
export type PracticeSession = z.infer<typeof practiceSessionSchema>;

/** `PracticeAttemptResponseModel`. */
export const practiceAttemptSchema = z.object({
  attemptId: z.string(),
  sessionId: z.string(),
  status: nullableString,
  startedAt: z.string(),
  deadlineAt: z.string(),
  submittedAt: nullableString,
  submissionReason: nullableString,
  serverNow: z.string(),
  questions: list(studentQuestionSchema),
  answers: list(storedAnswerSchema),
});
export type PracticeAttempt = z.infer<typeof practiceAttemptSchema>;

const resultRowSchema = z.object({
  attemptId: nullableString,
  participation: nullableString,
  submittedAt: nullableString,
  gradingStatus: nullableString,
  autoScore: z.number().nullable().optional(),
  manualScore: z.number().nullable().optional(),
  totalScore: z.number().nullable().optional(),
  maxScore: z.number(),
  scoreOnTen: z.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
});

/** `PracticeStudentResultResponseModel`. */
export const practiceResultSchema = z.object({
  result: resultRowSchema,
  review: list(questionGradeSchema),
});
export type PracticeResult = z.infer<typeof practiceResultSchema>;

const base = (sessionId: string) => `/me/practice-sessions/${encodeURIComponent(sessionId)}`;

export const listMyPracticeSessions = () =>
  unwrapEnvelope("/me/practice-sessions", z.array(practiceSessionSchema));

export const startPracticeAttempt = (sessionId: string) =>
  unwrapEnvelope(`${base(sessionId)}/attempt`, practiceAttemptSchema, { method: "POST" });

export const getPracticeAttempt = (sessionId: string) =>
  unwrapEnvelope(`${base(sessionId)}/attempt`, practiceAttemptSchema);

export const savePracticeAnswer = (sessionId: string, operation: AnswerOperation) =>
  unwrapEnvelope(`${base(sessionId)}/answers`, saveAnswerResultSchema, {
    method: "PUT",
    json: operation,
  });

export const submitPracticeAttempt = (sessionId: string, finalAnswers: AnswerOperation[]) =>
  unwrapEnvelope(`${base(sessionId)}/submit`, practiceAttemptSchema, {
    method: "POST",
    json: { operationId: newOperationId(), finalAnswers },
  });

export const getPracticeResult = (sessionId: string) =>
  unwrapEnvelope(`${base(sessionId)}/result`, practiceResultSchema);

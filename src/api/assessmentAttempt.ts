import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

/**
 * The attempt contract the Backend shares between exams (`/exam-attempts/*`)
 * and practice (`/me/practice-sessions/*`): the questions a student sees, the
 * answers stored for them, how an answer is sent, and how a graded question is
 * reviewed. Exam and practice clients build on these schemas so both read and
 * write answers the same way.
 */

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const list = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullable().optional().transform((items) => items ?? []);

export const questionTypeSchema = z.enum(["Single", "Multiple", "Essay", "Coding"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

const playbackSchema = z
  .object({ url: nullableString, expiresAt: z.string() })
  .nullable()
  .optional();

const imageSchema = z.object({
  imageId: z.string(),
  description: nullableString,
  displayOrder: z.number(),
  url: nullableString,
});

/** `StudentQuestionResponseModel`. */
export const studentQuestionSchema = z.object({
  attemptQuestionId: z.string(),
  questionType: questionTypeSchema,
  position: z.number(),
  content: nullableString,
  maxWords: nullableNumber,
  audio: playbackSchema,
  options: list(
    z.object({
      optionId: z.string(),
      position: z.number(),
      label: nullableString,
      content: nullableString,
      audio: playbackSchema,
    }),
  ),
  images: list(imageSchema),
  answerFormat: nullableString,
});
export type StudentQuestion = z.infer<typeof studentQuestionSchema>;

/** `AnswerPayloadResponseModel` / `AnswerPayloadRequestModel`. */
export const answerPayloadSchema = z.object({
  kind: questionTypeSchema,
  selectedOptionIds: z.array(z.string()).nullable().optional(),
  text: nullableString,
  sourceCode: nullableString,
  languageCode: nullableString,
});
export type AnswerPayload = z.infer<typeof answerPayloadSchema>;

/** `StoredAnswerResponseModel`. */
export const storedAnswerSchema = z.object({
  attemptQuestionId: z.string(),
  answer: answerPayloadSchema,
  revision: z.number(),
  lastOperationId: nullableString,
  serverSavedAt: z.string(),
});
export type StoredAnswer = z.infer<typeof storedAnswerSchema>;

/** `SaveAnswerResponseModel`. */
export const saveAnswerResultSchema = z.object({
  attemptId: z.string(),
  attemptQuestionId: z.string(),
  operationId: z.string(),
  acceptedRevision: z.number(),
  serverSavedAt: z.string(),
  serverNow: z.string(),
  deadlineAt: z.string(),
  status: z.string(),
});
export type SaveAnswerResult = z.infer<typeof saveAnswerResultSchema>;

/** `ExamQuestionGradeResponseModel`: one question as reviewed after grading. */
export const questionGradeSchema = z.object({
  attemptQuestionId: z.string(),
  position: z.number(),
  questionType: questionTypeSchema,
  content: nullableString,
  answerText: nullableString,
  referenceAnswer: nullableString,
  maxScore: z.number(),
  score: nullableNumber,
  feedback: nullableString,
  options: list(
    z.object({
      optionId: z.string(),
      position: z.number(),
      content: nullableString,
      isCorrect: z.boolean(),
    }),
  ),
  selectedOptionIds: list(z.string()),
});
export type QuestionGrade = z.infer<typeof questionGradeSchema>;

/** One answer as `FinalAnswerRequestModel` / `SaveAnswerRequestModel` expect it. */
export type AnswerOperation = {
  operationId: string;
  attemptQuestionId: string;
  /** The revision this change was made on; 0 when nothing was stored yet. */
  baseRevision: number;
  revision: number;
  answer: AnswerPayload;
};

/** A fresh operation id, so the Backend can recognise a retried save. */
export const newOperationId = () => crypto.randomUUID();

const envelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    success: z.boolean(),
    message: nullableString,
    data: schema.nullable().optional(),
    errors: z.array(z.string()).nullable().optional(),
  });

/** Calls an endpoint that answers with the `{ success, data }` envelope. */
export async function unwrapEnvelope<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit & { json?: unknown },
): Promise<z.infer<T>> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw envelopeFailure(response);
  return response.data;
}

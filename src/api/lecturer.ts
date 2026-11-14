import { z } from "zod";
import { ApiFailure, request, requestBlob } from "@/api/client";
import {
  materialSchema,
  questionSchema,
  queryString,
  type CatalogQuestion,
  type LearningMaterial,
} from "@/api/catalog";

export * from "@/api/catalog";

function envelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: schema.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function unwrap<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init: RequestInit & { json?: unknown },
): Promise<z.output<T>> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) {
    throw new ApiFailure({ kind: "server", status: 200 });
  }
  return response.data;
}

async function command(path: string, init: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(z.unknown()), init);
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200 });
  return response.data;
}

export type CreateQuestionInput = {
  examTypeId: string;
  topicId: string;
  content: string;
  questionType: "Single" | "Multiple" | "Essay";
  difficulty: "Easy" | "Medium" | "Hard";
  defaultScore: number;
  referenceAnswer?: string | null;
  gradingCriteria?: string | null;
  maxWords?: number | null;
  audioHintText?: string | null;
  sourceType?: "Manual" | "Import";
};

export const createQuestion = (input: CreateQuestionInput): Promise<CatalogQuestion> =>
  unwrap("/Questions", questionSchema, {
    method: "POST",
    json: { sourceType: "Manual", ...input },
  });

export const createQuestionOption = (input: {
  questionId: string;
  content: string;
  isCorrect: boolean;
  displayOrder: number;
}) =>
  unwrap(
    "/QuestionOptions",
    z.object({
      optionId: z.string(),
      questionId: z.string().optional(),
      content: z.string().nullable(),
      isCorrect: z.boolean(),
      displayOrder: z.number(),
    }),
    { method: "POST", json: input },
  );

export const updateQuestion = (questionId: string, input: Omit<CreateQuestionInput, "topicId" | "sourceType">) =>
  command(`/Questions/${questionId}`, { method: "PUT", json: input });

export const updateQuestionOption = (optionId: string, input: {
  content: string;
  isCorrect: boolean;
  displayOrder: number;
}) => command(`/QuestionOptions/${optionId}`, { method: "PUT", json: input });

export const deleteQuestionOption = (optionId: string) =>
  command(`/QuestionOptions/${optionId}`, { method: "DELETE" });

const audioFileSchema = z.object({
  audioId: z.string(),
  originalFileName: z.string().nullable(),
  contentType: z.string().nullable(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
});

const audioPlaybackSchema = z.object({
  audio: audioFileSchema,
  url: z.string().nullable(),
  expiresAt: z.string(),
});

function audioForm(file: File) {
  const form = new FormData();
  form.set("File", file);
  return form;
}

export const uploadQuestionAudio = (questionId: string, file: File) =>
  unwrap(`/Questions/${questionId}/audio`, audioFileSchema, { method: "PUT", body: audioForm(file) });
export const getQuestionAudio = (questionId: string) =>
  unwrap(`/Questions/${questionId}/audio`, audioPlaybackSchema, { method: "GET" });
export const deleteQuestionAudio = (questionId: string) =>
  command(`/Questions/${questionId}/audio`, { method: "DELETE" });
export const uploadQuestionOptionAudio = (optionId: string, file: File) =>
  unwrap(`/QuestionOptions/${optionId}/audio`, audioFileSchema, { method: "PUT", body: audioForm(file) });
export const getQuestionOptionAudio = (optionId: string) =>
  unwrap(`/QuestionOptions/${optionId}/audio`, audioPlaybackSchema, { method: "GET" });
export const deleteQuestionOptionAudio = (optionId: string) =>
  command(`/QuestionOptions/${optionId}/audio`, { method: "DELETE" });

const audioGenerationRetrySchema = z.object({
  requeued: z.number(),
  queued: z.number(),
});

/**
 * Ask the Backend worker to (re)create audio for one question. The worker owns
 * synthesis and retries; the browser never talks to the TTS tunnel directly.
 */
export const queueQuestionAudioGeneration = (questionId: string) =>
  unwrap("/question-audio-generation/retry", audioGenerationRetrySchema, {
    method: "POST",
    json: { questionId, includeMissing: true },
  });

/** Queue audio for every missing question and answer option in a subject. */
export const queueMissingSubjectAudioGeneration = (subjectId: string) =>
  unwrap("/question-audio-generation/retry", audioGenerationRetrySchema, {
    method: "POST",
    json: { subjectId, includeMissing: true },
  });

const audioSegmentSchema = z.object({
  questionId: z.string(),
  optionId: z.string().nullable().optional(),
  displayOrder: z.number().nullable().optional(),
  generationStatus: z.enum(["Pending", "Processing", "Ready", "Failed"]),
  hasAudio: z.boolean(),
  attemptCount: z.number(),
  lastError: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  nextAttemptAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type AudioSegment = z.infer<typeof audioSegmentSchema>;

const audioGenerationSummarySchema = z.object({
  questions: z.number(),
  totalSegments: z.number(),
  ready: z.number(),
  pending: z.number(),
  processing: z.number(),
  failed: z.number(),
  missing: z.number(),
  workerEnabled: z.boolean(),
  failedSegments: z.array(audioSegmentSchema),
});
export type AudioGenerationSummary = z.infer<typeof audioGenerationSummarySchema>;

export const getQuestionAudioGeneration = (questionId: string) =>
  unwrap(
    `/question-audio-generation/questions/${questionId}`,
    z.object({
      questionId: z.string(),
      totalSegments: z.number(),
      ready: z.number(),
      workerEnabled: z.boolean(),
      segments: z.array(audioSegmentSchema),
    }),
    { method: "GET" },
  );

/** Requeue failed audio in a scope and, with includeMissing, create what was never queued. */
export const retryAudioGeneration = (input: {
  subjectId?: string;
  topicId?: string;
  examTypeId?: string;
  includeMissing: boolean;
}) =>
  unwrap("/question-audio-generation/retry", audioGenerationRetrySchema, {
    method: "POST",
    json: input,
  });

export const getQuestionAudioGenerationSummary = (filters: {
  subjectId?: string;
  topicId?: string;
  examTypeId?: string;
}) =>
  unwrap(
    `/question-audio-generation/summary${queryString({
      SubjectId: filters.subjectId,
      TopicId: filters.topicId,
      ExamTypeId: filters.examTypeId,
    })}`,
    audioGenerationSummarySchema,
    { method: "GET" },
  );

export async function setQuestionStatus(questionId: string, status: "Active" | "Archived") {
  const response = await request(
    `/Questions/${questionId}/${status === "Active" ? "activate" : "archive"}`,
    envelope(z.unknown()),
    { method: "PATCH" },
  );
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200 });
}

export async function createQuestionWithOptions(
  input: CreateQuestionInput,
  options: Array<{ content: string; isCorrect: boolean; displayOrder: number }> = [],
) {
  const question = await createQuestion(input);
  const createdOptions = options.length
    ? await Promise.all(
      options.map((option) =>
        createQuestionOption({ ...option, questionId: question.questionId }),
      ),
    )
    : [];
  return { ...question, createdOptions };
}

export async function createLearningMaterial(input: {
  topicId: string;
  title: string;
  description: string;
  file: File;
}): Promise<LearningMaterial> {
  const form = new FormData();
  form.set("TopicId", input.topicId);
  form.set("Title", input.title);
  form.set("Description", input.description);
  form.set("File", input.file);
  return unwrap("/LearningMaterials", materialSchema, {
    method: "POST",
    body: form,
  });
}

export const updateLearningMaterial = (materialId: string, input: { title: string; description?: string | null }) =>
  command(`/LearningMaterials/${materialId}`, { method: "PUT", json: input });

export const replaceLearningMaterialFile = (materialId: string, file: File) => {
  const form = new FormData();
  form.set("File", file);
  return command(`/LearningMaterials/${materialId}/file`, { method: "PUT", body: form });
};

export const publishLearningMaterial = (materialId: string) =>
  command(`/LearningMaterials/${materialId}/publish`, { method: "PATCH" });
export const archiveLearningMaterial = (materialId: string) =>
  command(`/LearningMaterials/${materialId}/archive`, { method: "PATCH" });
export const deleteLearningMaterial = (materialId: string) =>
  command(`/LearningMaterials/${materialId}`, { method: "DELETE" });

const importIssueSchema = z.object({
  rowNumber: z.number().nullable(),
  column: z.string(),
  code: z.string(),
  message: z.string(),
});
const importOptionSchema = z.object({ letter: z.string(), content: z.string(), isCorrect: z.boolean() });
const importRowSchema = z.object({
  rowNumber: z.number(),
  topic: z.string(),
  topicId: z.string().nullable(),
  examType: z.string(),
  examTypeId: z.string().nullable(),
  content: z.string(),
  questionType: z.string().nullable(),
  difficulty: z.string().nullable(),
  defaultScore: z.number().nullable(),
  options: z.array(importOptionSchema),
  referenceAnswer: z.string().nullable(),
  gradingCriteria: z.string().nullable(),
  maxWords: z.number().nullable(),
});
export const questionImportValidationSchema = z.object({
  templateVersion: z.number(),
  fileSha256: z.string(),
  subjectId: z.string(),
  totalRows: z.number(),
  validRows: z.number(),
  invalidRows: z.number(),
  canImport: z.boolean(),
  requiresWarningAcknowledgement: z.boolean(),
  rows: z.array(importRowSchema),
  errors: z.array(importIssueSchema),
  warnings: z.array(importIssueSchema),
  warningFingerprint: z.string(),
});
export type QuestionImportValidation = z.infer<typeof questionImportValidationSchema>;

export const questionImportResultSchema = z.object({
  subjectId: z.string(),
  importedQuestions: z.number(),
  importedOptions: z.number(),
  status: z.string(),
  items: z.array(z.object({ excelRowNumber: z.number(), questionId: z.string(), optionCount: z.number() })),
});

function importForm(file: File, fields: Record<string, string | boolean> = {}) {
  const form = new FormData();
  form.set("File", file);
  Object.entries(fields).forEach(([key, value]) => form.set(key, String(value)));
  return form;
}

export const downloadQuestionImportTemplate = (subjectId: string) =>
  requestBlob(`/subjects/${subjectId}/questions/import/template`);
export const validateQuestionImport = (subjectId: string, file: File) =>
  unwrap(`/subjects/${subjectId}/questions/import/validate`, questionImportValidationSchema, { method: "POST", body: importForm(file) });
export const importQuestions = (subjectId: string, file: File, validation: QuestionImportValidation, acknowledgeWarnings: boolean) =>
  unwrap(`/subjects/${subjectId}/questions/import`, questionImportResultSchema, {
    method: "POST",
    body: importForm(file, {
      ExpectedFileSha256: validation.fileSha256,
      ExpectedWarningFingerprint: validation.warningFingerprint,
      AcknowledgeWarnings: acknowledgeWarnings,
    }),
  });

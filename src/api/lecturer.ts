import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import {
  materialSchema,
  questionSchema,
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

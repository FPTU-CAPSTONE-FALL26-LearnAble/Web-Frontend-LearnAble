import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

const unavailable = "Not available";

const questionOptionSchema = z
  .object({
    optionId: z.string(),
    questionId: z.string().optional(),
    content: z.string().nullable(),
    isCorrect: z.boolean(),
    displayOrder: z.number(),
    createdAt: z.string().optional(),
  })
  .transform((option) => ({
    ...option,
    content: option.content ?? unavailable,
  }));

export const subjectSchema = z
  .object({
    subjectId: z.string(),
    subjectCode: z.string().nullable(),
    subjectNameEn: z.string().nullable(),
    isActive: z.boolean().optional(),
  })
  .transform((subject) => ({
    ...subject,
    subjectCode: subject.subjectCode ?? unavailable,
  }));

export const topicSchema = z
  .object({
    topicId: z.string(),
    subjectId: z.string(),
    topicName: z.string().nullable(),
    topicCode: z.string().nullable().optional(),
  })
  .transform((topic) => ({
    ...topic,
    topicName: topic.topicName ?? unavailable,
  }));

export const questionSchema = z
  .object({
    questionId: z.string(),
    topicId: z.string().nullable(),
    createdBy: z.string().nullable(),
    creatorRole: z.string().nullable().optional(),
    content: z.string().nullable(),
    questionType: z.string().nullable(),
    difficulty: z.string().nullable(),
    audioHintText: z.string().nullable().optional(),
    defaultScore: z.number(),
    sourceType: z.string().nullable().optional(),
    status: z.string().nullable(),
    updatedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    options: z.array(questionOptionSchema).nullable().optional(),
  })
  .transform((question) => ({
    ...question,
    content: question.content ?? unavailable,
    questionType: question.questionType ?? unavailable,
    difficulty: question.difficulty ?? unavailable,
    status: question.status ?? unavailable,
    options: question.options ?? [],
  }));

export const materialSchema = z
  .object({
    materialId: z.string(),
    topicId: z.string().nullable(),
    uploadedBy: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable().optional(),
    materialType: z.string().nullable(),
    fileUrl: z.string().nullable(),
    fileName: z.string().nullable(),
    fileSizeBytes: z.number().nullable(),
    pageCount: z.number().nullable().optional(),
    ocrStatus: z.string().nullable(),
    isTtsReady: z.boolean().optional(),
    isIndexed: z.boolean().optional(),
    status: z.string().nullable(),
    uploadedAt: z.string(),
  })
  .transform((material) => ({
    ...material,
    title: material.title ?? unavailable,
    materialType: material.materialType ?? unavailable,
    ocrStatus: material.ocrStatus ?? unavailable,
    status: material.status ?? unavailable,
  }));

export const semesterSchema = z
  .object({
    semesterId: z.string(),
    semesterCode: z.string().nullable(),
    semesterName: z.string().nullable(),
    academicYear: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.string().nullable(),
  })
  .transform((semester) => ({
    ...semester,
    semesterCode: semester.semesterCode ?? unavailable,
    semesterName: semester.semesterName ?? unavailable,
    academicYear: semester.academicYear ?? unavailable,
    status: semester.status ?? unavailable,
  }));

export type Subject = {
  subjectId: string;
  subjectCode: string;
  subjectNameEn: string | null;
  isActive?: boolean;
};
export type Topic = {
  topicId: string;
  subjectId: string;
  topicName: string;
  topicCode?: string | null;
};
export type CatalogQuestion = {
  questionId: string;
  topicId: string | null;
  createdBy: string | null;
  creatorRole?: string | null;
  content: string;
  questionType: string;
  difficulty: string;
  audioHintText?: string | null;
  defaultScore: number;
  sourceType?: string | null;
  status: string;
  updatedAt?: string | null;
  createdAt: string;
  options: Array<{
    optionId: string;
    questionId?: string;
    content: string;
    isCorrect: boolean;
    displayOrder: number;
    createdAt?: string;
  }>;
};
export type LearningMaterial = {
  materialId: string;
  topicId: string | null;
  uploadedBy: string | null;
  title: string;
  description?: string | null;
  materialType: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  pageCount?: number | null;
  ocrStatus: string;
  isTtsReady?: boolean;
  isIndexed?: boolean;
  status: string;
  uploadedAt: string;
};
export type Semester = {
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: string;
};
export type Page<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
export type ReadFilters = Record<string, string | number | boolean | undefined>;

export function queryString(filters: ReadFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
}

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
    totalPages: z.number().int(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
  });
}

async function readPage<T>(
  resource: string,
  item: z.ZodTypeAny,
  filters: ReadFilters,
): Promise<Page<T>> {
  const envelope = z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: pageSchema(item).nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
  const response = await request(
    `/${resource}${queryString(filters)}`,
    envelope,
  );
  if (!response.success || !response.data) {
    throw envelopeFailure(response);
  }
  return response.data as Page<T>;
}

export const getQuestions = (filters: ReadFilters) =>
  readPage<CatalogQuestion>("Questions", questionSchema, filters);

export async function getQuestion(questionId: string) {
  const envelope = z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: questionSchema.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
  const response = await request(`/Questions/${questionId}`, envelope);
  if (!response.success || !response.data) {
    throw envelopeFailure(response);
  }
  return response.data as CatalogQuestion;
}

export const getMaterials = (filters: ReadFilters) =>
  readPage<LearningMaterial>("LearningMaterials", materialSchema, filters);
export const getSubjects = (filters: ReadFilters = {}) =>
  readPage<Subject>("Subjects", subjectSchema, {
    PageNumber: 1,
    PageSize: 100,
    IsActive: true,
    ...filters,
  });
export const getTopics = (filters: ReadFilters = {}) =>
  readPage<Topic>("Topics", topicSchema, {
    PageNumber: 1,
    PageSize: 100,
    ...filters,
  });
export const getSemesters = (filters: ReadFilters = {}) =>
  readPage<Semester>("Semesters", semesterSchema, {
    PageNumber: 1,
    PageSize: 100,
    SortBy: "-startDate",
    ...filters,
  });

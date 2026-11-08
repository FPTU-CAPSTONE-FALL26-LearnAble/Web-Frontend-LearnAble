import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import { pageSchema } from "@/api/catalog";

const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: schema.nullable(),
  errors: z.array(z.string()).nullable().optional(),
});
async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
  return response.data;
}
const compact = (id: string) => id.replaceAll("-", "");
const resultETag = (resourceId: string, revision: string) => `"${compact(resourceId)}-${compact(revision)}"`;
const revisionHeaders = (resourceId: string, revision: string) => ({ "If-Match": resultETag(resourceId, revision) });

export const gradebookItemSchema = z.object({
  enrollmentId: z.string(), studentId: z.string(), userCode: z.string(), fullName: z.string(),
  attemptId: z.string().nullable(), attemptStatus: z.string().nullable(), autoScore: z.number().nullable(),
  manualScore: z.number().nullable(), totalScore: z.number().nullable(), maxScore: z.number().nullable(),
  gradingStatus: z.string().nullable(), lecturerId: z.string().nullable(), reviewedAt: z.string().nullable(), reviewedBy: z.string().nullable(),
  requiresMarkingConfirmation: z.boolean().default(false), markingCompletedAt: z.string().nullable().optional(), markingCompletedBy: z.string().nullable().optional(),
});
export const gradebookSchema = z.object({
  scheduleId: z.string(), revision: z.string(), registered: z.number(), absent: z.number(), active: z.number(),
  submitted: z.number(), ungraded: z.number(), needsManual: z.number(), results: pageSchema(gradebookItemSchema),
  unreviewed: z.number(), canRelease: z.boolean(), blockingReasons: z.array(z.string()), releasedAt: z.string().nullable(), releasedBy: z.string().nullable(),
  unconfirmedMarking: z.number().default(0),
});
export type ExamGradebook = z.infer<typeof gradebookSchema>;

const gradingOptionSchema = z.object({ optionId: z.string(), position: z.number(), content: z.string(), isCorrect: z.boolean() });
export const questionGradeSchema = z.object({
  attemptQuestionId: z.string(), position: z.number(), questionType: z.string(), content: z.string(), answerText: z.string().nullable(),
  referenceAnswer: z.string().nullable(), gradingCriteria: z.string().nullable(), maxScore: z.number(), score: z.number().nullable(),
  gradingMethod: z.string(), gradedBy: z.string().nullable(), gradedAt: z.string().nullable(), feedback: z.string().nullable(),
  options: z.array(gradingOptionSchema), selectedOptionIds: z.array(z.string()),
});
export const gradingDetailSchema = z.object({
  attemptId: z.string(), scheduleId: z.string(), studentId: z.string(), studentName: z.string(), attemptStatus: z.string(), gradingStatus: z.string(),
  autoScore: z.number().nullable(), manualScore: z.number().nullable(), totalScore: z.number().nullable(), maxScore: z.number(), revision: z.string(),
  questions: z.array(questionGradeSchema), reviewedAt: z.string().nullable(), reviewedBy: z.string().nullable(), reviewNote: z.string().nullable(),
  requiresMarkingConfirmation: z.boolean().default(false), markingCompletedAt: z.string().nullable().optional(), markingCompletedBy: z.string().nullable().optional(),
});
export type ExamGradingDetail = z.infer<typeof gradingDetailSchema>;

export const gradingAssignmentSchema = z.object({
  attemptId: z.string(), revision: z.string(), lecturerId: z.string().nullable(), assignedBy: z.string().nullable(), assignedAt: z.string().nullable(), assignmentNote: z.string().nullable(),
  gradingStatus: z.string().nullable().optional(), markingCompletedAt: z.string().nullable().optional(), markingCompletedBy: z.string().nullable().optional(),
});
export const graderCandidateSchema = z.object({ lecturerId: z.string(), userCode: z.string(), fullName: z.string(), departmentId: z.string().nullable() });

export const getExamGradebook = (scheduleId: string, page = 1, pageSize = 100) =>
  unwrap(`/examschedules/${scheduleId}/results?Page=${page}&PageSize=${pageSize}`, gradebookSchema);
export const autoGradeExamSchedule = (scheduleId: string, revision: string) =>
  unwrap(`/examschedules/${scheduleId}/results/auto-grade`, z.object({ scheduleId: z.string(), revision: z.string(), graded: z.number(), unchanged: z.number(), finalizedExpired: z.number() }), { method: "POST", headers: revisionHeaders(scheduleId, revision) });
export const releaseExamResults = (scheduleId: string, revision: string) =>
  unwrap(`/examschedules/${scheduleId}/results/release`, z.object({ scheduleId: z.string(), revision: z.string(), releasedAt: z.string(), releasedBy: z.string(), submittedResults: z.number() }), { method: "POST", headers: revisionHeaders(scheduleId, revision) });
export const getGraderCandidates = (scheduleId: string, search = "") =>
  unwrap(`/examschedules/${scheduleId}/grading-candidates?Page=1&PageSize=100${search ? `&search=${encodeURIComponent(search)}` : ""}`, pageSchema(graderCandidateSchema));
export const getScheduleGradingAssignments = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/grading-assignments?Page=1&PageSize=100`, pageSchema(gradingAssignmentSchema));
export const assignScheduleGrader = (scheduleId: string, revision: string, input: { lecturerId: string; overwriteExisting: boolean; note?: string | null }) =>
  unwrap(`/examschedules/${scheduleId}/grading-assignments`, z.object({ scheduleId: z.string(), revision: z.string(), lecturerId: z.string(), eligibleAttempts: z.number(), assignedCount: z.number(), reassignedCount: z.number(), unchangedCount: z.number(), reviewResetCount: z.number() }), { method: "PUT", headers: revisionHeaders(scheduleId, revision), json: input });
export const getAttemptGrading = (attemptId: string) => unwrap(`/exam-attempts/${attemptId}/grading`, gradingDetailSchema);
export const reviewAttemptResult = (attemptId: string, revision: string, input: { reviewed?: boolean; note?: string | null }) =>
  unwrap(`/exam-attempts/${attemptId}/grading/review`, gradingDetailSchema, { method: "PUT", headers: revisionHeaders(attemptId, revision), json: input });
export const getLecturerGradingAssignments = () => unwrap("/lecturer/grading-assignments?Page=1&PageSize=100", pageSchema(gradingAssignmentSchema));
export const getLecturerAttemptGrading = (attemptId: string) => unwrap(`/lecturer/exam-attempts/${attemptId}/grading`, gradingDetailSchema);
export const gradeEssayQuestion = (attemptId: string, questionId: string, revision: string, input: { score?: number | null; feedback?: string | null }) =>
  unwrap(`/lecturer/exam-attempts/${attemptId}/grading/questions/${questionId}`, gradingDetailSchema, { method: "PUT", headers: revisionHeaders(attemptId, revision), json: input });
export const updateMarkingCompletion = (attemptId: string, revision: string, completed: boolean, note?: string | null) =>
  unwrap(`/lecturer/exam-attempts/${attemptId}/grading/completion`, gradingDetailSchema, { method: "PUT", headers: revisionHeaders(attemptId, revision), json: { completed, note: note?.trim() || null } });

import { z } from "zod";
import { ApiFailure, envelopeFailure, request } from "@/api/client";

/**
 * The student's own exam result (FR-10), as deployed under the
 * `StudentExamResults` tag of the OpenAPI document:
 *
 *   GET /me/exam-schedules/{scheduleId}/result
 *
 * There is no list endpoint: the results page reads the student's schedules
 * (`GET /me/exam-schedules`) and asks for the result of each finished one.
 *
 * The OpenAPI document declares no response body for this endpoint. The field
 * names below are the ones the Backend uses for the same data in the examiner
 * gradebook (`ExamGradebookItemResponseModel`); every field is optional so a
 * different shape shows "no score" instead of failing the page.
 *
 * Two shapes are read: the fields directly in `data`, or nested in
 * `data.result` as the practice result (`PracticeStudentResultResponseModel`,
 * the same grading model) sends them. Nested fields win.
 */

const resultFieldsSchema = z.object({
  attemptId: z.string().nullish(),
  attemptStatus: z.string().nullish(),
  autoScore: z.number().nullish(),
  manualScore: z.number().nullish(),
  totalScore: z.number().nullish(),
  score: z.number().nullish(),
  maxScore: z.number().nullish(),
  scoreOnTen: z.number().nullish(),
  passed: z.boolean().nullish(),
  gradingStatus: z.string().nullish(),
  submittedAt: z.string().nullish(),
  releasedAt: z.string().nullish(),
});
const resultDataSchema = resultFieldsSchema.extend({ result: resultFieldsSchema.nullish() });

/** Grading states the Backend uses for a finished grade. */
const GRADED = new Set(["complete", "completed", "graded", "released"]);

const envelope = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: resultDataSchema.nullable().optional(),
  errors: z.array(z.string()).nullable().optional(),
});

export type ExamResult = {
  scheduleId: string;
  /** Null while the Backend has not sent a total yet. */
  score: number | null;
  maxScore: number | null;
  scoreOnTen: number | null;
  passed: boolean | null;
  /** "graded" once grading is complete; "pending" while it is still being marked. */
  status: "graded" | "pending";
  submittedAt: string | null;
  releasedAt: string | null;
};

/**
 * Reads one result. Resolves to `null` when there is nothing to show yet: the
 * Backend answers 404 (no result), or 403/409 (not released to the student).
 */
export async function getMyExamResult(scheduleId: string): Promise<ExamResult | null> {
  let response: z.infer<typeof envelope>;
  try {
    response = await request(
      `/me/exam-schedules/${encodeURIComponent(scheduleId)}/result`,
      envelope,
    );
  } catch (error) {
    if (error instanceof ApiFailure) {
      const { detail } = error;
      if (detail.kind === "not_found") return null;
      if (detail.kind === "server" && (detail.status === 403 || detail.status === 409)) return null;
    }
    throw error;
  }
  if (!response.success) throw envelopeFailure(response);
  if (!response.data) return null;
  const { result: nested, ...flat } = response.data;
  const data = nested ? { ...flat, ...stripNullish(nested) } : flat;
  const score = data.totalScore ?? data.score ?? null;
  const grading = data.gradingStatus?.toLowerCase();
  return {
    scheduleId,
    score,
    maxScore: data.maxScore ?? null,
    scoreOnTen: data.scoreOnTen ?? null,
    passed: data.passed ?? null,
    status:
      (grading !== undefined && GRADED.has(grading)) || (grading === undefined && score !== null)
        ? "graded"
        : "pending",
    submittedAt: data.submittedAt ?? null,
    releasedAt: data.releasedAt ?? null,
  };
}

/** Nested values replace flat ones only where the nested value is present. */
function stripNullish<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null)) as Partial<T>;
}

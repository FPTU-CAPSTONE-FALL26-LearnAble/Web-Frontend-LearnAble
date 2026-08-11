import { z } from "zod";
import { request } from "@/api/client";

/** API-12 — GET /students/me/exam-results, GET /students/me/exam-results/:sessionId (FR-10) */

export const examResultSchema = z.object({
  sessionId: z.string(),
  examName: z.string(),
  score: z.number(),
  maxScore: z.number(),
  status: z.enum(["passed", "failed", "pending", "flagged"]),
  submittedAt: z.string(), // ISO
  durationMinutes: z.number(),
});
export type ExamResult = z.infer<typeof examResultSchema>;

const examResultListSchema = z.array(examResultSchema);

export function listExamResults(): Promise<ExamResult[]> {
  return request("/students/me/exam-results", examResultListSchema);
}

export function getExamResult(sessionId: string): Promise<ExamResult> {
  return request(`/students/me/exam-results/${sessionId}`, examResultSchema);
}

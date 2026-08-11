import { z } from "zod";
import { request } from "@/api/client";

/** API-11 — GET /students/me/practice-progress (FR-09) */

export const weakTopicSchema = z.object({
  topic: z.string(),
  accuracyPct: z.number(),
});

export const practiceAttemptSchema = z.object({
  id: z.string(),
  setTitle: z.string(),
  correct: z.number(),
  total: z.number(),
  completedAt: z.string(), // ISO
});

export const practiceProgressSchema = z.object({
  attempts: z.number(),
  avgScorePct: z.number(),
  weakTopics: z.array(weakTopicSchema),
  history: z.array(practiceAttemptSchema),
});
export type PracticeProgress = z.infer<typeof practiceProgressSchema>;

export function getPracticeProgress(): Promise<PracticeProgress> {
  return request("/students/me/practice-progress", practiceProgressSchema);
}

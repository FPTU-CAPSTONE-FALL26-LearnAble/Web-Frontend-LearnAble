import { z } from "zod";
import { request } from "@/api/client";

/**
 * API-09 — GET /practice-sets
 *
 * LƯU Ý (§11 mục 3 — BLOCKING): SRS chưa có endpoint ghi cho luyện tập
 * (bắt đầu lượt / lưu đáp án / chấm điểm). Trong lúc chờ BA quyết,
 * bộ đề trả về KÈM câu hỏi + đáp án đúng để client chấm cục bộ.
 * Đây là hình dạng TẠM cho MSW — không phải đề xuất hợp đồng với backend.
 */

export const answerOptionSchema = z.object({
  id: z.string(),
  letter: z.string(),
  text: z.string(),
});

export const questionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  /** "en" khi câu hỏi thật sự là tiếng Anh — NVDA cần đổi giọng */
  stemLang: z.string().optional(),
  options: z.array(answerOptionSchema),
  correctOptionId: z.string(),
  explanation: z.string(),
  topic: z.string(),
});
export type Question = z.infer<typeof questionSchema>;

export const practiceSetSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  questions: z.array(questionSchema),
});
export type PracticeSet = z.infer<typeof practiceSetSchema>;

const practiceSetListSchema = z.array(
  practiceSetSchema.omit({ questions: true }).extend({ questionCount: z.number() }),
);
export type PracticeSetListItem = z.infer<typeof practiceSetListSchema>[number];

export function listPracticeSets(): Promise<PracticeSetListItem[]> {
  return request("/practice-sets", practiceSetListSchema);
}

export function getPracticeSet(setId: string): Promise<PracticeSet> {
  return request(`/practice-sets/${setId}`, practiceSetSchema);
}

import { z } from "zod";
import { request } from "@/api/client";

/**
 * API-10 — POST /assistant/chat
 * RULE-14: câu trả lời phải hiển thị nguồn trích dẫn; câu trả lời không có
 * nguồn (grounded=false) phải được đánh dấu rõ ràng cho sinh viên.
 */

export const citationSchema = z.object({
  title: z.string(),
  page: z.number().optional(),
});

export const assistantReplySchema = z.object({
  answer: z.string(),
  grounded: z.boolean(),
  citations: z.array(citationSchema),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;

export function askAssistant(body: { question: string }): Promise<AssistantReply> {
  return request("/assistant/chat", assistantReplySchema, { method: "POST", json: body });
}

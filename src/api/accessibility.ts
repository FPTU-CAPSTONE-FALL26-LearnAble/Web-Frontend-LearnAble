import { z } from "zod";
import { request } from "@/api/client";

/**
 * API-02 — GET /students/me/accessibility-profile
 * API-03 — PUT /students/me/accessibility-profile
 * Đây là TINH CHỈNH cá nhân (FR-02): tốc độ/giọng TTS. Chúng điều chỉnh,
 * không bao giờ là điều kiện để truy cập (RULE-17 — hai lớp luôn bật sẵn).
 */

export const accessibilityProfileSchema = z.object({
  ttsVoiceUri: z.string().nullable(),
  ttsRate: z.number().min(0.5).max(2),
});
export type AccessibilityProfile = z.infer<typeof accessibilityProfileSchema>;

export function getAccessibilityProfile(): Promise<AccessibilityProfile> {
  return request("/students/me/accessibility-profile", accessibilityProfileSchema);
}

export function updateAccessibilityProfile(
  body: AccessibilityProfile,
): Promise<AccessibilityProfile> {
  return request("/students/me/accessibility-profile", accessibilityProfileSchema, {
    method: "PUT",
    json: body,
  });
}

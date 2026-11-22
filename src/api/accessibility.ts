import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

/**
 * The student's own accessibility preferences, as deployed under the
 * `StudentProfiles` tag of the OpenAPI document:
 *
 *   GET /StudentProfiles/me/preferences
 *   PUT /StudentProfiles/me/preferences   body: `StudentPreferencesRequestModel`
 *
 * This screen edits only the TTS voice and rate (FR-02). They are personal
 * fine-tuning, never a condition for access (RULE-17). The PUT replaces the
 * whole preference set, so the other fields are read first and sent back
 * unchanged.
 */

export const accessibilityProfileSchema = z.object({
  ttsVoiceUri: z.string().nullable(),
  ttsRate: z.number().min(0.5).max(2),
});
export type AccessibilityProfile = z.infer<typeof accessibilityProfileSchema>;

/** The fields of `StudentPreferencesRequestModel`; the response carries them too. */
const preferencesSchema = z.object({
  voiceCode: z.string().nullable().optional(),
  speechRate: z.number().optional(),
  fontSize: z.number().optional(),
  zoomPercent: z.number().optional(),
  contrastTheme: z.string().optional(),
  preferredInputMethod: z.string().optional(),
  audioFeedbackEnabled: z.boolean().optional(),
});
type Preferences = z.infer<typeof preferencesSchema>;

const envelope = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: preferencesSchema.nullable().optional(),
  errors: z.array(z.string()).nullable().optional(),
});

const PATH = "/StudentProfiles/me/preferences";

async function call(init?: RequestInit & { json?: unknown }): Promise<Preferences> {
  const response = await request(PATH, envelope, init);
  if (!response.success || !response.data) throw envelopeFailure(response);
  return response.data;
}

const toProfile = (preferences: Preferences): AccessibilityProfile => ({
  ttsVoiceUri: preferences.voiceCode?.trim() || null,
  // The screen offers 0.5×–2×; a rate outside it is shown at the nearest end.
  ttsRate: Math.min(2, Math.max(0.5, preferences.speechRate ?? 1)),
});

export async function getAccessibilityProfile(): Promise<AccessibilityProfile> {
  return toProfile(await call());
}

export async function updateAccessibilityProfile(
  body: AccessibilityProfile,
): Promise<AccessibilityProfile> {
  const current = await call();
  return toProfile(
    await call({
      method: "PUT",
      json: { ...current, voiceCode: body.ttsVoiceUri, speechRate: body.ttsRate },
    }),
  );
}

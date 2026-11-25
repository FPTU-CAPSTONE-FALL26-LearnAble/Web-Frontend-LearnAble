import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

/**
 * The student's own accessibility preferences, as deployed under the
 * `StudentProfiles` tag of the OpenAPI document:
 *
 *   GET /StudentProfiles/me/preferences
 *   PUT /StudentProfiles/me/preferences   body: `StudentPreferencesRequestModel`
 *
 * Two parts of the set are edited here: the TTS voice and rate (FR-02) and the
 * colour theme. They are personal fine-tuning, never a condition for access
 * (RULE-17). The PUT replaces the whole preference set, so each save reads the
 * other fields first and sends them back unchanged.
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

/** The Backend's `ContrastTheme` enum, as the OpenAPI document publishes it. */
export const BACKEND_CONTRAST_THEMES = ["Default", "HighContrast", "Light", "Dark"] as const;
export type BackendContrastTheme = (typeof BACKEND_CONTRAST_THEMES)[number];

const isBackendTheme = (value: unknown): value is BackendContrastTheme =>
  BACKEND_CONTRAST_THEMES.includes(value as BackendContrastTheme);

/**
 * How the pages look for this account: the colour theme and the base text
 * size in CSS pixels (`fontSize`; 16 is 100 %). A value the Backend does not
 * send, or sends outside what the screens offer, is null.
 */
export type DisplayPreferences = {
  contrastTheme: BackendContrastTheme | null;
  fontSize: number | null;
};

export async function getDisplayPreferences(): Promise<DisplayPreferences> {
  const { contrastTheme, fontSize } = await call();
  return {
    contrastTheme: isBackendTheme(contrastTheme) ? contrastTheme : null,
    fontSize: typeof fontSize === "number" && fontSize > 0 ? fontSize : null,
  };
}

/** Saves the given display fields and keeps every other preference as it is. */
export async function updateDisplayPreferences(
  changes: Partial<{ contrastTheme: BackendContrastTheme; fontSize: number }>,
): Promise<void> {
  const current = await call();
  await call({ method: "PUT", json: { ...current, ...changes } });
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

import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

/**
 * System administration contract (role Admin, after the 05/11/2026 split that
 * moved academic data to University Staff).
 *
 * These endpoints are NOT in the deployed OpenAPI document yet:
 *   - FR-35 voice settings      → FFCB-203 (backend)
 *   - FR-28 system health       → FFCB-151 (DevOps monitoring)
 * The shapes below are the proposal handed to backend; `src/mocks/adminSystem.ts`
 * serves them when `VITE_USE_MSW=true`. Until the API ships, a real call
 * fails and the page shows its error state instead of invented data.
 *
 * Exam keyboard shortcuts (FR-52) are deployed and live in `src/api/shortcuts.ts`.
 *
 * Every response uses the same `{ success, message, data, errors }` envelope as
 * the rest of the admin API.
 */

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: data.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await request(path, envelope(schema));
  if (!response.success || response.data === null || response.data === undefined) {
    throw envelopeFailure(response);
  }
  return response.data as T;
}

async function write<T>(
  path: string,
  schema: z.ZodType<T>,
  body: unknown,
): Promise<T> {
  const response = await request(path, envelope(schema), {
    method: "PUT",
    json: body,
  });
  if (!response.success || response.data === null || response.data === undefined) {
    throw envelopeFailure(response);
  }
  return response.data as T;
}

/* ------------------------------------------------------- voice settings */

export const voiceGenders = ["Female", "Male", "Neutral"] as const;
export const voiceLanguages = ["vi-VN", "en-US"] as const;

export const voiceOptionSchema = z.object({
  /** Engine identifier the TTS service resolves, e.g. `vi-VN-HoaiMyNeural`. */
  voiceKey: z.string(),
  displayName: z.string(),
  languageCode: z.string(),
  gender: z.enum(voiceGenders),
  isActive: z.boolean(),
});

export const speedOptionSchema = z.object({
  /** Playback multiplier, 0.5–2.0. */
  value: z.number(),
  isActive: z.boolean(),
});

export const voiceSettingsSchema = z.object({
  voices: z.array(voiceOptionSchema),
  speeds: z.array(speedOptionSchema),
  defaultVoiceKey: z.string().nullable(),
  defaultSpeed: z.number().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export type VoiceOption = z.infer<typeof voiceOptionSchema>;
export type SpeedOption = z.infer<typeof speedOptionSchema>;
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;
export type VoiceSettingsBody = Pick<
  VoiceSettings,
  "voices" | "speeds" | "defaultVoiceKey" | "defaultSpeed"
>;

/** GET /admin/voice-settings */
export const getVoiceSettings = () =>
  read("/admin/voice-settings", voiceSettingsSchema);

/** PUT /admin/voice-settings — replaces the whole configuration. */
export const saveVoiceSettings = (body: VoiceSettingsBody) =>
  write("/admin/voice-settings", voiceSettingsSchema, body);

/* -------------------------------------------------------- system health */

export const healthStatuses = ["Healthy", "Degraded", "Down"] as const;
export type HealthStatus = (typeof healthStatuses)[number];

export const serviceHealthSchema = z.object({
  name: z.string(),
  status: z.enum(healthStatuses),
  latencyMs: z.number().nullable(),
  message: z.string().nullable(),
});

export const systemHealthSchema = z.object({
  status: z.enum(healthStatuses),
  checkedAt: z.string(),
  /** Availability over the last 30 days, 0–100. */
  uptimePercent30d: z.number().nullable(),
  services: z.array(serviceHealthSchema),
  performance: z.object({
    averageResponseMs: z.number().nullable(),
    p95ResponseMs: z.number().nullable(),
    errorRatePercent: z.number().nullable(),
    requestsPerMinute: z.number().nullable(),
  }),
  usage: z.object({
    activeUsers: z.number().nullable(),
    activeExamSessions: z.number().nullable(),
    activeUniversities: z.number().nullable(),
    storageUsedGb: z.number().nullable(),
    storageQuotaGb: z.number().nullable(),
  }),
});

export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
export type SystemHealth = z.infer<typeof systemHealthSchema>;

/** GET /admin/system/health */
export const getSystemHealth = () =>
  read("/admin/system/health", systemHealthSchema);

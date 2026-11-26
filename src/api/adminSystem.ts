import { z } from "zod";
import { BACKEND_CONTRAST_THEMES } from "@/api/accessibility";
import { apiOrigin, envelopeFailure, request } from "@/api/client";

/**
 * System administration contract (role Admin, after the 05/11/2026 split that
 * moved academic data to University Staff).
 *
 * These endpoints are NOT in the deployed OpenAPI document yet:
 *   - FR-35 voice and theme settings → FFCB-203 (backend)
 *   - FR-28 system health       → FFCB-151 (DevOps monitoring); until then
 *     `getSystemHealth` reads the public `/health` probes instead
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

/* --------------------------------------------- voice and theme settings */

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

/** One of the colour themes built into the apps, by its Backend `ContrastTheme` value. */
export const themeOptionSchema = z.object({
  theme: z.enum(BACKEND_CONTRAST_THEMES),
  isActive: z.boolean(),
});

export const voiceSettingsSchema = z.object({
  voices: z.array(voiceOptionSchema),
  themes: z.array(themeOptionSchema),
  defaultVoiceKey: z.string().nullable(),
  defaultTheme: z.enum(BACKEND_CONTRAST_THEMES).nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export type VoiceOption = z.infer<typeof voiceOptionSchema>;
export type ThemeOption = z.infer<typeof themeOptionSchema>;
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;
export type VoiceSettingsBody = Pick<
  VoiceSettings,
  "voices" | "themes" | "defaultVoiceKey" | "defaultTheme"
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

/** What the backend's own probes answer: `{ status: "healthy", timestamp }`. */
const probeSchema = z.object({
  status: z.string(),
  timestamp: z.string().nullish(),
});

type Probe = { status: HealthStatus; checkedAt: string | null; latencyMs: number | null; message: string | null };

/**
 * One unauthenticated probe at the backend root. A probe that cannot be
 * reached, answers with an error or says anything but "healthy" counts as
 * Down, with the reason written out; the latency is measured here, not invented.
 */
async function probe(path: string): Promise<Probe> {
  const started = performance.now();
  try {
    const res = await fetch(`${apiOrigin}${path}`, { headers: { Accept: "application/json" } });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { status: "Down", checkedAt: null, latencyMs, message: `Answered HTTP ${res.status}.` };
    }
    const parsed = probeSchema.safeParse(await res.json());
    if (!parsed.success) {
      return { status: "Down", checkedAt: null, latencyMs, message: "Answered in an unexpected format." };
    }
    const healthy = parsed.data.status.toLowerCase() === "healthy";
    return {
      status: healthy ? "Healthy" : "Down",
      checkedAt: parsed.data.timestamp ?? null,
      latencyMs,
      message: healthy ? null : `Reported "${parsed.data.status}".`,
    };
  } catch {
    return { status: "Down", checkedAt: null, latencyMs: null, message: "Could not be reached." };
  }
}

/**
 * FR-28 system health. `GET /admin/system/health` (FFCB-151) is not deployed
 * yet, so for now this reads the backend's public probes — `GET /health`
 * (the API answers) and `GET /health/ready` (it is ready to serve) — and leaves
 * every metric they do not report as null, which the screens show as
 * "Not available". Switch back to `read("/admin/system/health", …)` once the
 * endpoint ships.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [live, ready] = await Promise.all([probe("/health"), probe("/health/ready")]);
  const services: ServiceHealth[] = [
    { name: "API", status: live.status, latencyMs: live.latencyMs, message: live.message },
    { name: "API readiness", status: ready.status, latencyMs: ready.latencyMs, message: ready.message },
  ];
  // The API answering but not ready is a partial outage, not a full one.
  const status: HealthStatus =
    live.status === "Down" ? "Down" : ready.status === "Down" ? "Degraded" : "Healthy";
  return {
    status,
    checkedAt: live.checkedAt ?? ready.checkedAt ?? new Date().toISOString(),
    uptimePercent30d: null,
    services,
    performance: {
      averageResponseMs: null,
      p95ResponseMs: null,
      errorRatePercent: null,
      requestsPerMinute: null,
    },
    usage: {
      activeUsers: null,
      activeExamSessions: null,
      activeUniversities: null,
      storageUsedGb: null,
      storageQuotaGb: null,
    },
  };
}

/** True while health comes from the basic probes only, without FFCB-151's metrics. */
export const isBasicHealth = (health: SystemHealth) =>
  health.uptimePercent30d === null &&
  Object.values(health.performance).every((value) => value === null) &&
  Object.values(health.usage).every((value) => value === null);

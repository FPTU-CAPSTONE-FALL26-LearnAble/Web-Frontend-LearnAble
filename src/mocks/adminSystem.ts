import { HttpResponse, delay, http } from "msw";
import type {
  SystemHealth,
  VoiceSettings,
  VoiceSettingsBody,
} from "@/api/adminSystem";

/**
 * Mock of the proposed system-administration API (see `src/api/adminSystem.ts`).
 * It doubles as the contract handed to backend: FFCB-203 (voice settings)
 * and FFCB-151 (health). `*` matches any API host.
 */

const ok = <T,>(data: T) =>
  HttpResponse.json({ success: true, message: null, data, errors: null });

let voiceSettings: VoiceSettings = {
  voices: [
    { voiceKey: "vi-VN-HoaiMyNeural", displayName: "Hoài My", languageCode: "vi-VN", gender: "Female", isActive: true },
    { voiceKey: "vi-VN-NamMinhNeural", displayName: "Nam Minh", languageCode: "vi-VN", gender: "Male", isActive: true },
    { voiceKey: "en-US-JennyNeural", displayName: "Jenny", languageCode: "en-US", gender: "Female", isActive: true },
    { voiceKey: "en-US-GuyNeural", displayName: "Guy", languageCode: "en-US", gender: "Male", isActive: false },
  ],
  speeds: [
    { value: 0.75, isActive: true },
    { value: 1, isActive: true },
    { value: 1.25, isActive: true },
    { value: 1.5, isActive: true },
    { value: 2, isActive: false },
  ],
  defaultVoiceKey: "vi-VN-HoaiMyNeural",
  defaultSpeed: 1,
  updatedAt: "2026-11-01T09:30:00Z",
  updatedBy: "System Admin",
};

const health = (): SystemHealth => ({
  status: "Degraded",
  checkedAt: new Date().toISOString(),
  uptimePercent30d: 99.62,
  services: [
    { name: "API gateway", status: "Healthy", latencyMs: 42, message: null },
    { name: "Database", status: "Healthy", latencyMs: 8, message: null },
    { name: "Text-to-speech", status: "Degraded", latencyMs: 1350, message: "Responses slower than the 800 ms target." },
    { name: "AI study assistant", status: "Healthy", latencyMs: 610, message: null },
    { name: "Proctoring (camera presence)", status: "Healthy", latencyMs: 95, message: null },
    { name: "Email notifications", status: "Healthy", latencyMs: null, message: null },
  ],
  performance: {
    averageResponseMs: 186,
    p95ResponseMs: 640,
    errorRatePercent: 0.42,
    requestsPerMinute: 1280,
  },
  usage: {
    activeUsers: 214,
    activeExamSessions: 0,
    activeUniversities: 3,
    storageUsedGb: 38.4,
    storageQuotaGb: 100,
  },
});

export const adminSystemHandlers = [
  http.get("*/admin/voice-settings", async () => {
    await delay(250);
    return ok(voiceSettings);
  }),
  http.put("*/admin/voice-settings", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as VoiceSettingsBody;
    voiceSettings = {
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: "System Admin",
    };
    return ok(voiceSettings);
  }),

  http.get("*/admin/system/health", async () => {
    await delay(250);
    return ok(health());
  }),
];

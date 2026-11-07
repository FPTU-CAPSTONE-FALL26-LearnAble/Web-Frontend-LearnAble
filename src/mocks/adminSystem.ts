import { HttpResponse, delay, http } from "msw";
import type {
  ShortcutConfig,
  ShortcutConfigBody,
  SystemHealth,
  VoiceSettings,
  VoiceSettingsBody,
} from "@/api/adminSystem";

/**
 * Mock of the proposed system-administration API (see `src/api/adminSystem.ts`).
 * It doubles as the contract handed to backend: FFCB-203 (voice settings),
 * FFCB-151 (health) and the exam-shortcut endpoint. `*` matches any API host.
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

let shortcutConfig: ShortcutConfig = {
  version: 3,
  updatedAt: "2026-10-28T14:00:00Z",
  updatedBy: "System Admin",
  activeExamSessions: 0,
  bindings: [
    { actionKey: "question.next", actionName: "Next question", description: "Moves to the next question.", keys: "Alt+N" },
    { actionKey: "question.previous", actionName: "Previous question", description: "Moves to the previous question.", keys: "Alt+P" },
    { actionKey: "question.repeat", actionName: "Repeat question", description: "Reads the question aloud again.", keys: "Alt+R" },
    { actionKey: "options.read", actionName: "Read answer options", description: "Reads every answer option in order.", keys: "Alt+O" },
    { actionKey: "question.flag", actionName: "Flag for review", description: "Marks the question to come back to.", keys: "Alt+F" },
    { actionKey: "exam.overview", actionName: "Question list", description: "Opens the list of questions and their status.", keys: "Alt+L" },
    { actionKey: "exam.time", actionName: "Time remaining", description: "Reads the time left in the exam.", keys: "Alt+T" },
    { actionKey: "exam.submit", actionName: "Submit exam", description: "Opens the submit confirmation.", keys: "Ctrl+Shift+Enter" },
  ],
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
    activeExamSessions: shortcutConfig.activeExamSessions,
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

  http.get("*/admin/exam-shortcuts", async () => {
    await delay(250);
    return ok(shortcutConfig);
  }),
  http.put("*/admin/exam-shortcuts", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as ShortcutConfigBody;
    if (shortcutConfig.activeExamSessions > 0) {
      return HttpResponse.json(
        { success: false, message: "Exam sessions are in progress.", data: null, errors: ["EXAM_IN_PROGRESS"] },
        { status: 409 },
      );
    }
    if (body.version !== shortcutConfig.version) {
      return HttpResponse.json(
        { success: false, message: "Shortcuts changed since you opened them.", data: null, errors: ["VERSION_CONFLICT"] },
        { status: 409 },
      );
    }
    const keys = new Map(body.bindings.map((b) => [b.actionKey, b.keys]));
    shortcutConfig = {
      ...shortcutConfig,
      version: shortcutConfig.version + 1,
      updatedAt: new Date().toISOString(),
      bindings: shortcutConfig.bindings.map((b) => ({ ...b, keys: keys.get(b.actionKey) ?? b.keys })),
    };
    return ok(shortcutConfig);
  }),
];

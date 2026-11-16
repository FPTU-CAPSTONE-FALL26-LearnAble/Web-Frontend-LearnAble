import { HttpResponse, delay, http } from "msw";
import { mockPracticeSets, mockProgress, mockUser } from "@/mocks/fixtures";
import { adminSystemHandlers } from "@/mocks/adminSystem";
import { gestureConfigHandlers } from "@/mocks/gestureConfig";
import { shortcutHandlers } from "@/mocks/shortcuts";
import { studentScheduleHandlers } from "@/mocks/studentSchedule";
import { learningAssistantHandlers } from "@/mocks/learningAssistant";

/**
 * Handlers viết bám SRS §9 — file này đồng thời là bản hợp đồng đưa cho
 * team backend (§2). Đường dẫn khớp BASE_URL mặc định /api/v1.
 */

const BASE = "http://18.190.2.18:8080/api";

let mockPreferences = {
  voiceCode: null as string | null,
  speechRate: 1,
  fontSize: 16,
  zoomPercent: 100,
  contrastTheme: "Default",
  preferredInputMethod: "Keyboard",
  audioFeedbackEnabled: true,
};

/**
 * Offline sign-in: any password except "sai-mat-khau" works, and the email's
 * first word picks the role — admin@…, staff@…, lecturer@…, examiner@…;
 * anything else signs in as the student fixture. The role travels in the
 * mock token so /auth/me can answer without server state.
 */
const mockAccounts = {
  admin: { userId: "00000000-0000-0000-0000-0000000000a1", fullName: "Mock Admin", role: "Admin" },
  staff: { userId: "00000000-0000-0000-0000-0000000000b1", fullName: "Mock Staff", role: "Staff" },
  lecturer: { userId: "00000000-0000-0000-0000-0000000000c1", fullName: "Mock Lecturer", role: "Lecturer" },
  examiner: { userId: "00000000-0000-0000-0000-0000000000d1", fullName: "Mock Examiner", role: "Examiner" },
} as const;
type MockRole = keyof typeof mockAccounts | "student";

const roleFromIdentifier = (identifier = ""): MockRole => {
  const first = identifier.toLowerCase().split(/[@._-]/)[0];
  return first in mockAccounts ? (first as MockRole) : "student";
};
const roleFromToken = (header: string | null): MockRole => {
  const role = header?.match(/mock-access-token\.(\w+)/)?.[1];
  return role && role in mockAccounts ? (role as MockRole) : "student";
};
const mockTokens = (role: MockRole) => ({
  accessToken: `mock-access-token.${role}`,
  refreshToken: `mock-refresh-token.${role}`,
  accessTokenExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
});

export const handlers = [
  // API-01 — đăng nhập
  http.post("*/auth/login", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { identifier?: string; password?: string };
    if (body.password === "sai-mat-khau") {
      return HttpResponse.json(
        { success: false, message: "Invalid email or password.", data: null, errors: ["INVALID_CREDENTIALS"] },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: "Signed in",
      data: mockTokens(roleFromIdentifier(body.identifier)),
      errors: null,
    });
  }),

  http.post("*/auth/refresh-token", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    const role = roleFromToken(body.refreshToken?.replace("mock-refresh-token", "mock-access-token") ?? null);
    return HttpResponse.json({ success: true, message: null, data: mockTokens(role), errors: null });
  }),

  http.get("*/auth/me", async ({ request }) => {
    await delay(100);
    const role = roleFromToken(request.headers.get("Authorization"));
    const data =
      role === "student"
        ? { userId: mockUser.id, fullName: mockUser.fullName, email: mockUser.email, role: mockUser.role }
        : { ...mockAccounts[role], email: `${role}@learnable.local` };
    return HttpResponse.json({ success: true, message: null, data, errors: null });
  }),

  // Student accessibility preferences — mirrors /StudentProfiles/me/preferences.
  http.get("*/StudentProfiles/me/preferences", async () => {
    await delay(200);
    return HttpResponse.json({ success: true, message: null, data: mockPreferences, errors: null });
  }),
  http.put("*/StudentProfiles/me/preferences", async ({ request }) => {
    await delay(200);
    mockPreferences = { ...mockPreferences, ...((await request.json()) as typeof mockPreferences) };
    return HttpResponse.json({ success: true, message: null, data: mockPreferences, errors: null });
  }),

  // API-09 — danh sách bộ đề luyện tập
  http.get(`${BASE}/practice-sets`, async () => {
    await delay(300);
    return HttpResponse.json(
      mockPracticeSets.map(({ questions, ...rest }) => ({
        ...rest,
        questionCount: questions.length,
      })),
    );
  }),

  // TẠM (§11 mục 3): chi tiết bộ đề kèm đáp án để client chấm cục bộ
  http.get(`${BASE}/practice-sets/:setId`, async ({ params }) => {
    await delay(300);
    const set = mockPracticeSets.find((s) => s.id === params.setId);
    return set
      ? HttpResponse.json(set)
      : HttpResponse.json({ message: "Not found" }, { status: 404 });
  }),

  // API-11 — tiến độ luyện tập
  http.get(`${BASE}/students/me/practice-progress`, async () => {
    await delay(300);
    return HttpResponse.json(mockProgress);
  }),

  // Admin system configuration — proposed contract, not yet in the backend.
  ...adminSystemHandlers,

  // Exam keyboard shortcuts (FR-52) — mirrors the deployed MyShortcuts API.
  ...shortcutHandlers,
  // Exam hand gestures (FR-47) — mirrors /gesture-configurations.
  ...gestureConfigHandlers,

  // Student exam schedule and inbox (FFCB-106, FFCB-279) — mirrors the deployed API.
  ...studentScheduleHandlers,

  // Learning assistant (FFCB-139) — mirrors the deployed LearningAssistant API.
  ...learningAssistantHandlers,
];

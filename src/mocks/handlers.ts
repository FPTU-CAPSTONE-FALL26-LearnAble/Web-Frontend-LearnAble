import { HttpResponse, delay, http } from "msw";
import { mockPracticeSets, mockProgress, mockUser } from "@/mocks/fixtures";
import { adminSystemHandlers } from "@/mocks/adminSystem";
import { shortcutHandlers } from "@/mocks/shortcuts";
import { studentScheduleHandlers } from "@/mocks/studentSchedule";

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

export const handlers = [
  // API-01 — đăng nhập
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { identifier?: string; password?: string };
    if (body.password === "sai-mat-khau") {
      return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }
    return HttpResponse.json({
      success: true,
      message: "Signed in",
      data: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        accessTokenExpiresAt: "2026-09-14T08:00:00Z",
      },
      errors: null,
    });
  }),

  http.get(`${BASE}/auth/me`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      message: null,
      data: { userId: mockUser.id, fullName: mockUser.fullName, email: mockUser.email, role: mockUser.role },
      errors: null,
    });
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

  // API-10 — trợ lý AI (RULE-14: có/không có nguồn)
  http.post(`${BASE}/assistant/chat`, async ({ request }) => {
    await delay(900);
    const { question } = (await request.json()) as { question: string };
    // Ca khó: câu hỏi ngoài tài liệu → trả lời không có nguồn
    if (question.toLowerCase().includes("outside the materials")) {
      return HttpResponse.json({
        answer:
          "This topic is not present in the uploaded course materials, so the response is only general guidance.",
        grounded: false,
        citations: [],
      });
    }
    return HttpResponse.json({
      answer:
        "Encapsulation hides an object's internal state and provides controlled access through public methods. See chapter 2 of the course book.",
      grounded: true,
      citations: [
        { title: "PRO192 Course Book — Chapter 2: Encapsulation", page: 34 },
        { title: "Week 3 lecture slides", page: 12 },
      ],
    });
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

  // Student exam schedule and inbox (FFCB-106, FFCB-279) — mirrors the deployed API.
  ...studentScheduleHandlers,
];

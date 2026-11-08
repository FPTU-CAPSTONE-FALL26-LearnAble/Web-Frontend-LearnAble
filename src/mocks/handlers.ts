import { HttpResponse, delay, http } from "msw";
import { mockExamResults, mockPracticeSets, mockProgress, mockUser } from "@/mocks/fixtures";
import { adminSystemHandlers } from "@/mocks/adminSystem";

/**
 * Handlers viết bám SRS §9 — file này đồng thời là bản hợp đồng đưa cho
 * team backend (§2). Đường dẫn khớp BASE_URL mặc định /api/v1.
 */

const BASE = "http://18.190.2.18:8080/api";

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

  // API-02 — đọc hồ sơ trợ năng
  http.get(`${BASE}/students/me/accessibility-profile`, async () => {
    await delay(200);
    return HttpResponse.json({ ttsVoiceUri: null, ttsRate: 1 });
  }),

  // API-03 — cập nhật hồ sơ trợ năng
  http.put(`${BASE}/students/me/accessibility-profile`, async ({ request }) => {
    await delay(200);
    return HttpResponse.json(await request.json());
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

  // API-12 — kết quả thi
  http.get(`${BASE}/students/me/exam-results`, async () => {
    await delay(300);
    return HttpResponse.json(mockExamResults);
  }),
  http.get(`${BASE}/students/me/exam-results/:sessionId`, async ({ params }) => {
    await delay(200);
    const found = mockExamResults.find((r) => r.sessionId === params.sessionId);
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json({ message: "Not found" }, { status: 404 });
  }),

  // Admin system configuration — proposed contract, not yet in the backend.
  ...adminSystemHandlers,
];

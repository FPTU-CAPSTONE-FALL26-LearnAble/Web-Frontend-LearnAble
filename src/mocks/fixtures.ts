import type { PracticeSet } from "@/api/practice";
import type { PracticeProgress } from "@/api/progress";
import type { ExamResult } from "@/api/results";
import type { User } from "@/api/auth";

/**
 * Fixtures cố tình chứa các ca khó (§10): bài thi bị gắn cờ, câu trả lời AI
 * không có nguồn, bộ đề 60 câu, tiếng Việt đủ dấu (ế ộ ữ ằ ẳ ỹ).
 */

export const mockUser: User = {
  id: "sv-001",
  fullName: "Nguyễn Hữu Phước",
  email: "phucdhse182107@fpt.edu.vn",
  role: "student",
};

function mkQuestion(setId: string, i: number, topic: string): PracticeSet["questions"][number] {
  const correct = ["a", "b", "c", "d"][i % 4];
  return {
    id: `${setId}-q${i + 1}`,
    stem: `Câu hỏi số ${i + 1}: Trong lập trình hướng đối tượng, đặc điểm nào giữ vững tính đóng gói khi dữ liệu thay đổi liên tục?`,
    options: [
      { id: "a", letter: "A", text: "Che giấu trạng thái bên trong đối tượng" },
      { id: "b", letter: "B", text: "Kế thừa mọi phương thức của lớp cha" },
      { id: "c", letter: "C", text: "Cho phép truy cập thuộc tính trực tiếp" },
      { id: "d", letter: "D", text: "Ép kiểu dữ liệu tự động giữa các lớp" },
    ],
    correctOptionId: correct,
    explanation:
      "Tính đóng gói che giấu trạng thái bên trong và chỉ mở ra giao diện được kiểm soát, nhờ vậy thay đổi dữ liệu không phá vỡ mã bên ngoài.",
    topic,
  };
}

export const mockPracticeSets: PracticeSet[] = [
  {
    id: "bo-de-oop",
    title: "Lập trình hướng đối tượng — Chương 1–3",
    subject: "PRO192",
    questions: [
      mkQuestion("bo-de-oop", 0, "Đóng gói"),
      {
        id: "bo-de-oop-q2",
        // Câu tiếng Anh thật — stemLang đổi giọng NVDA (§9)
        stem: "Which keyword prevents a class from being inherited in Java?",
        stemLang: "en",
        options: [
          { id: "a", letter: "A", text: "static" },
          { id: "b", letter: "B", text: "final" },
          { id: "c", letter: "C", text: "abstract" },
          { id: "d", letter: "D", text: "sealed" },
        ],
        correctOptionId: "b",
        explanation: "Từ khóa final ngăn một lớp bị kế thừa trong Java.",
        topic: "Kế thừa",
      },
      mkQuestion("bo-de-oop", 2, "Đa hình"),
      mkQuestion("bo-de-oop", 3, "Kế thừa"),
      mkQuestion("bo-de-oop", 4, "Đóng gói"),
    ],
  },
  {
    // Ca khó: bộ đề 60 câu — kiểm hiệu năng nav + NVDA đọc danh sách dài
    id: "bo-de-60-cau",
    title: "Đề tổng hợp giữa kỳ — 60 câu, đủ dấu: ế ộ ữ ằ ẳ ỹ",
    subject: "PRO192",
    questions: Array.from({ length: 60 }, (_, i) =>
      mkQuestion("bo-de-60-cau", i, ["Đóng gói", "Kế thừa", "Đa hình", "Trừu tượng hóa"][i % 4]),
    ),
  },
];

export const mockProgress: PracticeProgress = {
  attempts: 7,
  avgScorePct: 62,
  weakTopics: [
    { topic: "Đa hình", accuracyPct: 41 },
    { topic: "Trừu tượng hóa", accuracyPct: 55 },
  ],
  history: [
    {
      id: "att-7",
      setTitle: "Lập trình hướng đối tượng — Chương 1–3",
      correct: 4,
      total: 5,
      completedAt: "2026-08-09T14:30:00+07:00",
    },
    {
      id: "att-6",
      setTitle: "Đề tổng hợp giữa kỳ — 60 câu, đủ dấu: ế ộ ữ ằ ẳ ỹ",
      correct: 31,
      total: 60,
      completedAt: "2026-08-05T09:15:00+07:00",
    },
  ],
};

export const mockExamResults: ExamResult[] = [
  {
    sessionId: "phien-thi-001",
    examName: "Thi cuối kỳ PRO192 — Đợt 1",
    score: 78,
    maxScore: 100,
    status: "passed",
    submittedAt: "2026-07-20T10:45:00+07:00",
    durationMinutes: 58,
  },
  {
    // Ca khó: phiên thi bị gắn cờ giám sát — điểm tạm thời (FR-10)
    sessionId: "phien-thi-002",
    examName: "Thi lại PRO192 — Đợt 2",
    score: 65,
    maxScore: 100,
    status: "flagged",
    submittedAt: "2026-08-01T15:20:00+07:00",
    durationMinutes: 60,
  },
  {
    sessionId: "phien-thi-003",
    examName: "Thi giữa kỳ MAD101",
    score: 0,
    maxScore: 100,
    status: "pending",
    submittedAt: "2026-08-10T11:00:00+07:00",
    durationMinutes: 45,
  },
];

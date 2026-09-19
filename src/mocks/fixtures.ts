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
    stem: `Question ${i + 1}: In object-oriented programming, which feature preserves encapsulation as data changes?`,
    options: [
      { id: "a", letter: "A", text: "Hide an object's internal state" },
      { id: "b", letter: "B", text: "Inherit every method from the parent class" },
      { id: "c", letter: "C", text: "Allow direct access to every property" },
      { id: "d", letter: "D", text: "Automatically cast data between classes" },
    ],
    correctOptionId: correct,
    explanation:
      "Encapsulation hides internal state behind a controlled interface, so data changes do not break outside code.",
    topic,
  };
}

export const mockPracticeSets: PracticeSet[] = [
  {
    id: "bo-de-oop",
    title: "Object-oriented programming — Chapters 1–3",
    subject: "PRO192",
    questions: [
      mkQuestion("bo-de-oop", 0, "Encapsulation"),
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
        explanation: "The final keyword prevents a class from being inherited in Java.",
        topic: "Inheritance",
      },
      mkQuestion("bo-de-oop", 2, "Polymorphism"),
      mkQuestion("bo-de-oop", 3, "Inheritance"),
      mkQuestion("bo-de-oop", 4, "Encapsulation"),
    ],
  },
  {
    // Ca khó: bộ đề 60 câu — kiểm hiệu năng nav + NVDA đọc danh sách dài
    id: "bo-de-60-cau",
    title: "Midterm review — 60 questions",
    subject: "PRO192",
    questions: Array.from({ length: 60 }, (_, i) =>
      mkQuestion("bo-de-60-cau", i, ["Encapsulation", "Inheritance", "Polymorphism", "Abstraction"][i % 4]),
    ),
  },
];

export const mockProgress: PracticeProgress = {
  attempts: 7,
  avgScorePct: 62,
  weakTopics: [
    { topic: "Polymorphism", accuracyPct: 41 },
    { topic: "Abstraction", accuracyPct: 55 },
  ],
  history: [
    {
      id: "att-7",
      setTitle: "Object-oriented programming — Chapters 1–3",
      correct: 4,
      total: 5,
      completedAt: "2026-08-09T14:30:00+07:00",
    },
    {
      id: "att-6",
      setTitle: "Midterm review — 60 questions",
      correct: 31,
      total: 60,
      completedAt: "2026-08-05T09:15:00+07:00",
    },
  ],
};

export const mockExamResults: ExamResult[] = [
  {
    sessionId: "phien-thi-001",
    examName: "PRO192 Final Exam — Session 1",
    score: 78,
    maxScore: 100,
    status: "passed",
    submittedAt: "2026-07-20T10:45:00+07:00",
    durationMinutes: 58,
  },
  {
    // Ca khó: phiên thi bị gắn cờ giám sát — điểm tạm thời (FR-10)
    sessionId: "phien-thi-002",
    examName: "PRO192 Retake — Session 2",
    score: 65,
    maxScore: 100,
    status: "flagged",
    submittedAt: "2026-08-01T15:20:00+07:00",
    durationMinutes: 60,
  },
  {
    sessionId: "phien-thi-003",
    examName: "MAD101 Midterm Exam",
    score: 0,
    maxScore: 100,
    status: "pending",
    submittedAt: "2026-08-10T11:00:00+07:00",
    durationMinutes: 45,
  },
];

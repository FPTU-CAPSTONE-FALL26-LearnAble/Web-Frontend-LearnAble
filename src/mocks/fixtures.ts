import type { PracticeSet } from "@/api/practice";
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


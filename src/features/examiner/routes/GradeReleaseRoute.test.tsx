import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ResultReview, GradeReleaseRoute } from "./GradeReleaseRoute";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@/features/examiner/components/GradingScheduleQueue", () => ({ GradingScheduleQueue: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect("schedule-1")}>Open gradebook</button> }));

vi.mock("@/api/grading", async (original) => ({
  ...await original<typeof import("@/api/grading")>(),
  getExamGradebook: vi.fn(async () => ({ registered: 1, submitted: 1, needsManual: 0, unreviewed: 1, pendingIntegrityReviews: 0, invalidated: 0, blockingReasons: ["REVIEW_INCOMPLETE"], canRelease: false, results: { items: [] } })),
  getGraderCandidates: vi.fn(async () => ({ items: [] })),
  getScheduleGradingAssignments: vi.fn(async () => ({ items: [] })),
  getAttemptGrading: vi.fn(async () => ({
    studentName: "Demo student", totalScore: null, maxScore: 2, autoScore: 1, manualScore: null,
    questions: [
      { attemptQuestionId: "q1", position: 1, content: "Choose a data structure", questionType: "SingleChoice", score: 1, maxScore: 1, options: [{ optionId: "a", content: "Stack", isCorrect: true }], selectedOptionIds: ["a"] },
      { attemptQuestionId: "q2", position: 2, content: "Explain a queue", questionType: "Essay", score: null, maxScore: 1, answerText: "FIFO", options: [], selectedOptionIds: [], referenceAnswer: "First in, first out" },
    ],
  })),
}));

describe("Attempt answer review", () => {
  it("opens a dedicated gradebook page and returns to the queue", async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/examiner/results"]}><Routes><Route path="/examiner/results" element={<GradeReleaseRoute />} /><Route path="/examiner/results/:scheduleId" element={<GradeReleaseRoute />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(screen.queryByText("Student results")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open gradebook" }));
    expect(await screen.findByRole("heading", { name: "Exam gradebook" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Student results" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open gradebook" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Back to grading queue" }));
    expect(await screen.findByRole("button", { name: "Open gradebook" })).toBeInTheDocument();
  });
  it("distinguishes pending essay marks from scored objective answers and reveals reference guidance", async () => {
    render(<QueryClientProvider client={new QueryClient()}><ResultReview attemptId="attempt-1" onClose={() => {}} /></QueryClientProvider>);
    expect(await screen.findByText("Demo student · Answer review")).toBeInTheDocument();
    expect(screen.getByText("2 questions · 1 scored · 1 awaiting a score")).toBeInTheDocument();
    expect(screen.getByText("Awaiting score")).toBeInTheDocument();
    expect(screen.getByText("Student selected · Correct answer")).toBeInTheDocument();
    expect(screen.getByText("FIFO")).toBeInTheDocument();
    const reference = screen.getByText("Reference answer & marking guidance");
    fireEvent.click(reference);
    expect(reference.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("First in, first out")).toBeInTheDocument();
  });
});

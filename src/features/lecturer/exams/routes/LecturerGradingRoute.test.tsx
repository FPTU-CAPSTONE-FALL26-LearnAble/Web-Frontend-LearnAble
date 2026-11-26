import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { LecturerGradingRoute } from "./LecturerGradingRoute";
import { gradeEssayQuestion, type ExamGradingDetail } from "@/api/grading";
const api = vi.hoisted(() => ({ getLecturerAttemptGrading: vi.fn(async () => ({ studentName: "Demo student", attemptId: "pending", maxScore: 10, autoScore: 3, manualScore: null, totalScore: null, revision: "r1", questions: [] })), getLecturerGradingAssignments: vi.fn(async () => ({ items: [{ attemptId: "done", markingCompletedAt: "2026-11-20" }, { attemptId: "pending", markingCompletedAt: null }] })) }));
vi.mock("@/api/grading", async (original) => ({ ...await original<typeof import("@/api/grading")>(), ...api, gradeEssayQuestion: vi.fn() }));

describe("Lecturer marking workspace", () => {
  it("saves all edited essays sequentially using the latest revision for each question", async () => {
    const current = { studentName: "Demo student", attemptId: "pending", maxScore: 2, autoScore: 0, manualScore: null, totalScore: null, revision: "r1", questions: [
      { attemptQuestionId: "q1", position: 1, questionType: "Essay", content: "Explain a stack", maxScore: 1, score: null, feedback: null },
      { attemptQuestionId: "q2", position: 2, questionType: "Essay", content: "Explain a queue", maxScore: 1, score: null, feedback: null },
    ] } as unknown as ExamGradingDetail;
    api.getLecturerAttemptGrading.mockImplementation(async () => structuredClone(current) as never);
    const writes = vi.mocked(gradeEssayQuestion).mockImplementation(async (_attempt, questionId, revision, input) => {
      expect(revision).toBe(current.revision);
      const question = current.questions.find((item) => item.attemptQuestionId === questionId)!;
      question.score = input.score ?? null;
      question.feedback = input.feedback ?? null;
      current.revision = "r2";
    });
    render(<QueryClientProvider client={new QueryClient()}><LecturerGradingRoute /></QueryClientProvider>);
    await screen.findByText("Explain a stack");
    const scores = screen.getAllByLabelText("Score");
    fireEvent.change(scores[0], { target: { value: "0" } });
    fireEvent.change(scores[1], { target: { value: "2" } });
    expect(screen.getByRole("button", { name: "Save all scores" })).toBeDisabled();
    fireEvent.change(scores[1], { target: { value: "1" } });
    fireEvent.change(screen.getAllByLabelText("Feedback")[1], { target: { value: "Correct" } });
    fireEvent.click(screen.getByRole("button", { name: "Save all scores" }));
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(2));
    expect(writes).toHaveBeenNthCalledWith(1, "pending", "q1", "r1", { score: 0, feedback: null });
    expect(writes).toHaveBeenNthCalledWith(2, "pending", "q2", "r2", { score: 1, feedback: "Correct" });
    await screen.findByText("All changes saved");
  });
  it("shows pending assignments immediately and opens the first pending attempt automatically", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LecturerGradingRoute /></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "Demo student" })).toBeInTheDocument();
    expect(screen.getByText("1 pending · 1 completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Assignment 2/ })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(api.getLecturerAttemptGrading).toHaveBeenCalledWith("pending"));
  });
});

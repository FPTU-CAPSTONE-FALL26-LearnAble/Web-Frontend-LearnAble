import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PracticeGradingDialog } from "./PracticeGradingDialog";

const api = vi.hoisted(() => ({ getPracticeGrading: vi.fn(), gradePracticeQuestion: vi.fn() }));
vi.mock("@/api/practiceSessions", () => api);

beforeEach(() => vi.clearAllMocks());

it("grades a practice essay with the current revision", async () => {
  api.getPracticeGrading.mockResolvedValue({
    attemptId: "attempt-1", revision: "revision-1", questions: [{
      attemptQuestionId: "question-1", position: 1, questionType: "Essay", content: "Define a binary tree.",
      answerText: "Each node has at most two children.", referenceAnswer: null, gradingCriteria: null,
      maxScore: 10, score: null, feedback: null,
    }],
  });
  api.gradePracticeQuestion.mockResolvedValue({ attemptId: "attempt-1", revision: "revision-2", questions: [] });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PracticeGradingDialog sessionId="session-1" attemptId="attempt-1" studentName="An" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  expect(await screen.findByText("Define a binary tree.")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Score (0–10)"), "8");
  await user.type(screen.getByLabelText("Feedback (optional)"), "Correct");
  await user.click(screen.getByRole("button", { name: "Save grade" }));
  await waitFor(() => expect(api.gradePracticeQuestion).toHaveBeenCalledWith("session-1", "attempt-1", "question-1", {
    expectedRevision: "revision-1", score: 8, feedback: "Correct",
  }));
});

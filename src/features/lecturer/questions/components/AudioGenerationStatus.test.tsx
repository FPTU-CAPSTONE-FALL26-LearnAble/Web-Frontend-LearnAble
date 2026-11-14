import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AudioGenerationPanel, QuestionAudioStatus } from "./AudioGenerationStatus";

const api = vi.hoisted(() => ({
  getQuestionAudioGeneration: vi.fn(),
  getQuestionAudioGenerationSummary: vi.fn(),
  queueQuestionAudioGeneration: vi.fn(async () => ({ queued: 1, requeued: 0 })),
  retryAudioGeneration: vi.fn(async () => ({ queued: 1, requeued: 1 })),
}));
vi.mock("@/api/lecturer", () => api);

const baseSummary = { questions: 2, totalSegments: 8, ready: 5, pending: 0, processing: 0, failed: 1, missing: 2, workerEnabled: true, failedSegments: [] };
const failedSegment = { questionId: "question-1", optionId: "option-1", displayOrder: 2, generationStatus: "Failed", hasAudio: false, attemptCount: 3, lastError: "TTS timed out" };

function show(element: ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{element}</QueryClientProvider>);
}

describe("AudioGenerationPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries failed and missing audio in the filtered scope", async () => {
    api.getQuestionAudioGenerationSummary.mockResolvedValue({ ...baseSummary, failedSegments: [failedSegment] });
    show(<AudioGenerationPanel filters={{ examTypeId: "exam-type", subjectId: "subject" }} />);
    expect(await screen.findByText(/TTS timed out/)).toBeInTheDocument();
    expect(screen.getByText(/Answer 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry failed and create missing (3)" }));
    await waitFor(() => expect(api.retryAudioGeneration).toHaveBeenCalledWith({ examTypeId: "exam-type", subjectId: "subject", includeMissing: true }));
  });

  it("adds up every subject when none is chosen and shows overall progress", async () => {
    api.getQuestionAudioGenerationSummary.mockImplementation(async (scope: { subjectId?: string }) => scope.subjectId === "a"
      ? { ...baseSummary, questions: 10, totalSegments: 50, ready: 40, pending: 10, failed: 0, missing: 0 }
      : { ...baseSummary, questions: 30, totalSegments: 150, ready: 0, pending: 148, processing: 1, failed: 1, missing: 0 });
    show(<AudioGenerationPanel filters={{ examTypeId: "exam-type" }} subjectIds={["a", "b"]} />);
    expect(await screen.findByText("40 of 200 audio segments ready across 40 questions. Updating automatically.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Audio segments ready" })).toHaveAttribute("aria-valuenow", "20");
    await userEvent.click(screen.getByRole("button", { name: "Retry failed and create missing (1)" }));
    await waitFor(() => expect(api.retryAudioGeneration).toHaveBeenCalledTimes(2));
    expect(api.retryAudioGeneration).toHaveBeenCalledWith({ examTypeId: "exam-type", subjectId: "a", includeMissing: true });
    expect(api.retryAudioGeneration).toHaveBeenCalledWith({ examTypeId: "exam-type", subjectId: "b", includeMissing: true });
  });

  it("counts questions, not audio segments, when it is given question progress", async () => {
    api.getQuestionAudioGenerationSummary.mockResolvedValue({ ...baseSummary, questions: 40, totalSegments: 194, ready: 40, pending: 153, processing: 1, failed: 0, missing: 0 });
    show(<AudioGenerationPanel filters={{ subjectId: "subject" }} questionProgress={{ loading: false, total: 40, ready: 8, waiting: 30, failed: 1, none: 1, checking: 0 }} />);
    expect(await screen.findByText("8 of 40 questions have all their audio ready. Updating automatically.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Audio segments ready" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByText("No audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry failed and create missing (2)" })).toBeEnabled();
  });

  it("explains a disabled worker and blocks the retry", async () => {
    api.getQuestionAudioGenerationSummary.mockResolvedValue({ ...baseSummary, workerEnabled: false });
    show(<AudioGenerationPanel filters={{ subjectId: "subject" }} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("audio worker is turned off");
    expect(screen.getByRole("button", { name: /Retry failed/ })).toBeDisabled();
  });

  it("has nothing to retry when all audio is finished", async () => {
    api.getQuestionAudioGenerationSummary.mockResolvedValue({ ...baseSummary, ready: 8, failed: 0, missing: 0 });
    show(<AudioGenerationPanel filters={{ subjectId: "subject" }} />);
    expect(await screen.findByRole("button", { name: "Retry failed and create missing (0)" })).toBeDisabled();
  });
});

describe("QuestionAudioStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists each segment with its status and retries this question", async () => {
    api.getQuestionAudioGeneration.mockResolvedValue({
      questionId: "question-1", totalSegments: 2, ready: 1, workerEnabled: true,
      segments: [{ ...failedSegment, optionId: null, displayOrder: null, generationStatus: "Ready", lastError: null }, failedSegment],
    });
    show(<QuestionAudioStatus questionId="question-1" />);
    expect(await screen.findByText("1 of 2 audio segments ready")).toBeInTheDocument();
    expect(screen.getByText("Question text")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry audio" }));
    await waitFor(() => expect(api.queueQuestionAudioGeneration).toHaveBeenCalledWith("question-1"));
  });
});

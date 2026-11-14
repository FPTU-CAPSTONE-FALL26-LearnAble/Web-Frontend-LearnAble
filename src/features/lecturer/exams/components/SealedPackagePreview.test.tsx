import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SealedPaper } from "@/api/exams";
import { SealedPackagePreview } from "./SealedPackagePreview";

const exams = vi.hoisted(() => ({ getSealedPaperPreview: vi.fn(), getSealedPaperAudio: vi.fn() }));
vi.mock("@/api/exams", () => exams);

const paper = { versionId: "v1", paperId: "p1", name: "CSD201 FE", versionNumber: 2 } as SealedPaper;
const preview = {
  versionId: "v1", paperId: "p1", durationMinutes: 90, passScore: 5,
  questions: [{
    examQuestionId: "eq1", questionId: "q1", displayOrder: 1, maxScore: 2,
    snapshot: { content: "Which sort is stable?", questionType: "Single", options: [
      { optionId: "o2", content: "Quick Sort", isCorrect: false, originalDisplayOrder: 2 },
      { optionId: "o1", content: "Merge Sort", isCorrect: true, originalDisplayOrder: 1 },
    ] },
  }],
};

function show(value: SealedPaper | null = paper) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SealedPackagePreview paper={value} onClose={() => undefined} /></QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe("SealedPackagePreview", () => {
  it("lists the locked questions with the answers in their original order", async () => {
    exams.getSealedPaperPreview.mockResolvedValue(preview);
    show();
    const list = await screen.findByRole("list", { name: "Questions" });
    expect(within(list).getByText("Which sort is stable?")).toBeInTheDocument();
    expect(within(list).getByText("2 points")).toBeInTheDocument();
    const text = list.textContent ?? "";
    expect(text.indexOf("Merge Sort")).toBeGreaterThan(-1);
    expect(text.indexOf("Merge Sort")).toBeLessThan(text.indexOf("Quick Sort"));
    expect(within(list).getByText("Correct answer")).toBeInTheDocument();
    expect(exams.getSealedPaperPreview).toHaveBeenCalledWith("p1", "v1");
  });

  it("fetches an audio link only when asked and plays it", async () => {
    const user = userEvent.setup();
    exams.getSealedPaperPreview.mockResolvedValue(preview);
    exams.getSealedPaperAudio.mockResolvedValue({ url: "https://audio.test/q1.mp3", expiresAt: "2026-11-14T10:00:00Z" });
    show();
    await screen.findByRole("list", { name: "Questions" });
    expect(exams.getSealedPaperAudio).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: /Listen/ })[0]);
    await waitFor(() => expect(exams.getSealedPaperAudio).toHaveBeenCalledWith("p1", "v1", "eq1", undefined));
    expect(await screen.findByLabelText("question 1")).toHaveAttribute("src", "https://audio.test/q1.mp3");
  });

  it("asks for an answer's audio with its option id", async () => {
    const user = userEvent.setup();
    exams.getSealedPaperPreview.mockResolvedValue(preview);
    exams.getSealedPaperAudio.mockResolvedValue({ url: "https://audio.test/o1.mp3", expiresAt: "2026-11-14T10:00:00Z" });
    show();
    await screen.findByRole("list", { name: "Questions" });
    await user.click(screen.getByRole("button", { name: "Listen to answer A of question 1" }));
    await waitFor(() => expect(exams.getSealedPaperAudio).toHaveBeenCalledWith("p1", "v1", "eq1", "o1"));
  });

  it("does nothing while no package is chosen", () => {
    show(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(exams.getSealedPaperPreview).not.toHaveBeenCalled();
  });
});

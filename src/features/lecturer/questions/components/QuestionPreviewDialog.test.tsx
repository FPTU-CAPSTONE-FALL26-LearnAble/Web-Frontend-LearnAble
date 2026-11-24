import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { QuestionPreviewDialog } from "./QuestionPreviewDialog";

const api = vi.hoisted(() => ({ getQuestion: vi.fn(), getQuestionImages: vi.fn() }));
vi.mock("@/api/lecturer", () => ({ ...api }));
vi.mock("@/api/coding", () => ({ getCodingQuestion: async () => ({ starterCodes: { python3: "print(1)" }, testCases: [{ expectedOutput: "1" }] }) }));
vi.mock("./QuestionSequenceAudio", () => ({ QuestionSequenceAudio: () => <span>Audio preview</span> }));
vi.mock("./AudioGenerationStatus", () => ({ QuestionAudioStatus: () => null }));

beforeEach(() => {
  api.getQuestionImages.mockResolvedValue({ questionId: "q1", revision: "r1", images: [{ imageId: "image-1", url: "/figure.png", description: null }] });
  api.getQuestion.mockResolvedValue({ questionId: "q1", examTypeId: "exam", questionType: "Coding", content: "Write code", defaultScore: 2, options: [] });
});

it("reviews saved images and preserves a coding question in the accessible preview", async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <QuestionPreviewDialog questionId="q1" course="Programming" topic="Functions" onClose={() => undefined} />
  </QueryClientProvider>);

  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("Question image 1 has no accessible description.")).toBeInTheDocument();
  expect(within(dialog).getByText("Image 1. No accessible description.")).toBeInTheDocument();
  expect(within(dialog).getByText(/Code answer\. python3\. print\(1\)/)).toBeInTheDocument();
  expect(dialog.querySelector("img")).toHaveAttribute("src", "/figure.png");
  expect(api.getQuestionImages).toHaveBeenCalledWith("q1");
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ReactNode } from "react";
import { ShiftPackagePanel } from "@/features/examiner/components/ShiftPackagePanel";
import { SealPaperRoute } from "./SealPaperRoute";
import { SealedPapersRoute } from "./SealedPapersRoute";

const exams = vi.hoisted(() => ({
  getExamPaper: vi.fn(),
  sealExamPaper: vi.fn(async () => ({})),
  getMySealedPapers: vi.fn(),
  getSealedExamPapers: vi.fn(),
  handoverSealedPaper: vi.fn(async () => ({})),
  withdrawSealedPaper: vi.fn(async () => ({})),
  getSharedExamShift: vi.fn(),
  getShiftPaperSelection: vi.fn(),
  selectShiftPaper: vi.fn(async () => ({})),
  releaseShiftPaper: vi.fn(async () => ({})),
  publishSharedExamShift: vi.fn(async () => ({})),
  openSharedExamShift: vi.fn(async () => ({})),
}));
const lecturer = vi.hoisted(() => ({ getQuestionAudioGeneration: vi.fn() }));
vi.mock("@/api/exams", () => exams);
vi.mock("@/api/lecturer", () => lecturer);

const sealed = (overrides: Record<string, unknown> = {}) => ({
  versionId: "v1", paperId: "p1", examSubjectId: "e", subjectId: "s", examTypeId: "t", name: "CSD201 FE", versionNumber: 2, questionCount: 20,
  totalScore: 10, status: "Sealed", sealedAt: "2026-11-13T01:00:00Z", publishedToPoolAt: null, eTag: '"v-1"', semesterId: "m",
  durationMinutes: 90, passScore: 5, cameraRequired: true, scoringPolicy: "Highest", ...overrides,
});
const audio = (total: number, ready: number) => ({ questionId: "q", totalSegments: total, ready, workerEnabled: true, segments: [] });

function show(element: ReactNode, path: string, route = "*") {
  const router = createMemoryRouter([{ path: route, element }], { initialEntries: [path] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>);
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = () => {};
});
beforeEach(() => vi.clearAllMocks());

describe("SealPaperRoute", () => {
  const paper = { examPaperId: "p1", status: "Draft", name: "CSD201 FE", paperCode: "FE-1", totalScore: 10, eTag: '"p-1"', questions: [
    { questionId: "q1", content: "First question" }, { questionId: "q2", content: "Second question" },
  ] };

  it("blocks sealing while a question has no audio", async () => {
    exams.getExamPaper.mockResolvedValue(paper);
    lecturer.getQuestionAudioGeneration.mockImplementation(async (id: string) => id === "q1" ? audio(5, 5) : audio(0, 0));
    show(<SealPaperRoute />, "/lecturer/exam-papers/p1/seal", "/lecturer/exam-papers/:paperId/seal");
    expect(await screen.findByText("1 of 2 questions still need audio.")).toBeInTheDocument();
    expect(screen.getByText("No audio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fix" })).toHaveAttribute("href", "/lecturer/questions/new?purpose=exam&edit=q2");
    expect(screen.getByRole("button", { name: "Seal the paper" })).toBeDisabled();
  });

  it("explains that a paper which is not a draft cannot be sealed", async () => {
    exams.getExamPaper.mockResolvedValue({ ...paper, status: "Published" });
    lecturer.getQuestionAudioGeneration.mockResolvedValue(audio(5, 5));
    show(<SealPaperRoute />, "/lecturer/exam-papers/p1/seal", "/lecturer/exam-papers/:paperId/seal");
    expect(await screen.findByText(/already published. Only a draft paper can be sealed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seal the paper" })).toBeDisabled();
  });

  it("seals the paper with its ETag after the lecturer confirms", async () => {
    const user = userEvent.setup();
    exams.getExamPaper.mockResolvedValue(paper);
    lecturer.getQuestionAudioGeneration.mockResolvedValue(audio(5, 5));
    show(<SealPaperRoute />, "/lecturer/exam-papers/p1/seal", "/lecturer/exam-papers/:paperId/seal");
    expect(await screen.findByText("Every question has audio.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seal the paper" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(exams.sealExamPaper).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Seal the paper" }));
    await waitFor(() => expect(exams.sealExamPaper).toHaveBeenCalledWith("p1", '"p-1"'));
  });
});

describe("SealedPapersRoute", () => {
  it("lets a lecturer hand a package over", async () => {
    const user = userEvent.setup();
    exams.getMySealedPapers.mockResolvedValue([sealed()]);
    show(<SealedPapersRoute />, "/lecturer/sealed-papers");
    expect(await screen.findByText("Not handed over")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hand over to examiners" }));
    await waitFor(() => expect(exams.handoverSealedPaper).toHaveBeenCalledWith("p1", "v1", '"v-1"'));
  });

  it("lets a lecturer withdraw a handed-over package after confirming", async () => {
    const user = userEvent.setup();
    exams.getMySealedPapers.mockResolvedValue([sealed({ publishedToPoolAt: "2026-11-13T02:00:00Z" })]);
    show(<SealedPapersRoute />, "/lecturer/sealed-papers");
    await user.click(await screen.findByRole("button", { name: "Withdraw" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Withdraw" }));
    await waitFor(() => expect(exams.withdrawSealedPaper).toHaveBeenCalledWith("p1", "v1", '"v-1"'));
  });

  it("only lists handed-over packages for an examiner, with no way to change them", async () => {
    exams.getSealedExamPapers.mockResolvedValue([sealed({ publishedToPoolAt: "2026-11-13T02:00:00Z" })]);
    show(<SealedPapersRoute />, "/examiner/sealed-papers");
    expect(await screen.findByText("Handed over")).toBeInTheDocument();
    expect(exams.getMySealedPapers).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hand over to examiners" })).not.toBeInTheDocument();
  });
});

describe("ShiftPackagePanel", () => {
  it("attaches a package using the shift ETag and an idempotency key", async () => {
    const user = userEvent.setup();
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", eTag: '"s-1"' });
    exams.getShiftPaperSelection.mockResolvedValue(null);
    exams.getSealedExamPapers.mockResolvedValue([]);
    show(<ShiftPackagePanel shiftId="sh" scheduleStatus="Draft" />, "/examiner/schedule/x");
    await user.click(await screen.findByRole("button", { name: "Attach a package" }));
    await waitFor(() => expect(exams.selectShiftPaper).toHaveBeenCalledWith("sh", '"s-1"', expect.stringMatching(/^[0-9a-f-]{36}$/)));
  });

  it("shows the attached package and releases it", async () => {
    const user = userEvent.setup();
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", eTag: '"s-1"' });
    exams.getShiftPaperSelection.mockResolvedValue({ selectionId: "a", shiftId: "sh", versionId: "v1", operationId: "o", selectedAt: "2026-11-13T02:00:00Z", releasedAt: null, consumedAt: null });
    exams.getSealedExamPapers.mockResolvedValue([sealed()]);
    show(<ShiftPackagePanel shiftId="sh" scheduleStatus="Published" />, "/examiner/schedule/x");
    expect(await screen.findByText(/CSD201 FE · version 2/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Release package" }));
    await waitFor(() => expect(exams.releaseShiftPaper).toHaveBeenCalledWith("sh", '"s-1"'));
  });

  it("publishes the shift once a package is attached, then opens it for every room", async () => {
    const user = userEvent.setup();
    const attached = { selectionId: "a", shiftId: "sh", versionId: "v1", operationId: "o", selectedAt: "2026-11-13T02:00:00Z", releasedAt: null, consumedAt: null };
    exams.getShiftPaperSelection.mockResolvedValue(attached);
    exams.getSealedExamPapers.mockResolvedValue([sealed()]);
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", eTag: '"s-1"', status: "Draft" });
    show(<ShiftPackagePanel shiftId="sh" scheduleStatus="Draft" />, "/examiner/schedule/x");
    await user.click(await screen.findByRole("button", { name: "Publish shift" }));
    await waitFor(() => expect(exams.publishSharedExamShift).toHaveBeenCalledWith("sh", '"s-1"'));
  });

  it("opens a published shift for every room, which a lecturer cannot do", async () => {
    const user = userEvent.setup();
    exams.getShiftPaperSelection.mockResolvedValue({ selectionId: "a", shiftId: "sh", versionId: "v1", operationId: "o", selectedAt: "2026-11-13T02:00:00Z", releasedAt: null, consumedAt: null });
    exams.getSealedExamPapers.mockResolvedValue([sealed()]);
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", eTag: '"s-2"', status: "Published" });
    show(<ShiftPackagePanel shiftId="sh" scheduleStatus="Published" />, "/examiner/schedule/x");
    await user.click(await screen.findByRole("button", { name: "Open exam for every room" }));
    await waitFor(() => expect(exams.openSharedExamShift).toHaveBeenCalledWith("sh", '"s-2"'));
    expect(screen.queryByRole("button", { name: "Release package" })).not.toBeInTheDocument();
  });

  it("cannot change the package once the exam has started", async () => {
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", eTag: '"s-1"' });
    exams.getShiftPaperSelection.mockResolvedValue(null);
    exams.getSealedExamPapers.mockResolvedValue([]);
    show(<ShiftPackagePanel shiftId="sh" scheduleStatus="Open" />, "/examiner/schedule/x");
    expect(await screen.findByText(/can no longer change/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Attach a package" })).not.toBeInTheDocument();
  });
});

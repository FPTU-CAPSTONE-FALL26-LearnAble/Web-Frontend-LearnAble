import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QuestionBankRoute } from "./QuestionBankRoute";
import { CreateQuestionRoute } from "./CreateQuestionRoute";
import {
  createDraft,
  draftKey,
  readDraft,
  validateDraft,
  questionTypes,
} from "@/features/lecturer/questions/model";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { Toaster } from "@/shared/ui/primitives/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { bankQuestions, courses } from "@/features/lecturer/questions/data/fixtures";
// Every row asks for its own audio state, so under a busy full run the page needs longer than one second.
configure({ asyncUtilTimeout: 4000 });
const lecturerApi = vi.hoisted(() => ({
  createQuestionWithOptions: vi.fn(async () => ({ questionId: "created-question", createdOptions: [] })),
  getQuestion: vi.fn(),
  updateQuestion: vi.fn(async () => undefined),
  updateQuestionOption: vi.fn(async () => undefined),
  deleteQuestionOption: vi.fn(async () => undefined),
  createQuestionOption: vi.fn(async () => ({ optionId: "new-option" })),
  uploadQuestionAudio: vi.fn(async () => undefined),
  uploadQuestionOptionAudio: vi.fn(async () => undefined),
  getQuestionAudio: vi.fn(),
  getQuestionOptionAudio: vi.fn(),
  queueQuestionAudioGeneration: vi.fn(async () => ({ queued: 1, requeued: 0 })),
  getQuestionAudioGeneration: vi.fn<(id: string) => Promise<unknown>>(async () => ({ questionId: "q", totalSegments: 0, ready: 0, workerEnabled: true, segments: [] })),
  getQuestionAudioGenerationSummary: vi.fn(async () => ({ questions: 0, totalSegments: 0, ready: 0, pending: 0, processing: 0, failed: 0, missing: 0, workerEnabled: true, failedSegments: [] })),
  retryAudioGeneration: vi.fn(async () => ({ queued: 0, requeued: 0 })),
  setQuestionStatus: vi.fn(async () => undefined),
}));
vi.mock("@/api/lecturer", () => ({
  ...lecturerApi,
  getSubjects: async () => ({
    items: courses.map((course) => ({
      subjectId: course,
      subjectCode: course,
      subjectNameEn: course,
    })),
  }),
  getTopics: async () => ({
    items: bankQuestions
      .map((q) => ({
        topicId: q.topic,
        subjectId: q.course,
        topicName: q.topic,
      }))
      .filter(
        (value, index, array) =>
          array.findIndex((t) => t.topicId === value.topicId) === index,
      ),
  }),
  getQuestions: async (filters: Record<string, string | number>) => {
    const practice = filters.ExamTypeId === "exam-type-practice";
    const source = practice ? bankQuestions.slice(0, 4) : bankQuestions;
    const normalizedQuestions = source.map((question, index) => ({
      ...question,
      id: `${practice ? "PRQ" : "EXQ"}-${String(index + 1).padStart(4, "0")}`,
    }));
    const rows = normalizedQuestions.filter(
      (q) =>
        (!filters.SearchTerm ||
          `${q.id} ${q.content}`
            .toLowerCase()
            .includes(String(filters.SearchTerm).toLowerCase())) &&
        (!filters.Status || q.status === filters.Status),
    );
    const page = Number(filters.PageNumber);
    const size = Number(filters.PageSize);
    return {
      items: rows.slice((page - 1) * size, page * size).map((q) => ({
        examTypeId: practice ? "exam-type-practice" : "exam-type-final",
        examTypeCode: practice ? "PRACTICE" : "FE",
        examTypeName: practice ? "Practice" : "Final Exam",
        questionId: q.id,
        content: q.content,
        questionType: "Single",
        defaultScore: q.points,
        status: q.status,
        topicId: q.topic,
        difficulty: "Easy",
        createdAt: "2026-09-15",
      })),
      totalCount: rows.length,
      totalPages: Math.ceil(rows.length / size),
    };
  },
}));
const excel = vi.hoisted(() => ({ downloadQuestionWorkbook: vi.fn(async () => undefined) }));
vi.mock("@/features/lecturer/questions/export/questionExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/lecturer/questions/export/questionExport")>()),
  downloadQuestionWorkbook: excel.downloadQuestionWorkbook,
}));
vi.mock("@/api/exams", () => ({
  getExamTypes: async () => [
    {
      examTypeId: "exam-type-final",
      code: "FE",
      name: "Final Exam",
      description: null,
      isActive: true,
    },
    {
      examTypeId: "exam-type-practice",
      code: "PRACTICE",
      name: "Practice",
      description: null,
      isActive: true,
    },
  ],
}));
function view(element: React.ReactNode, entry = "/") {
  useAuthStore.setState({
    user: {
      id: "question-test",
      fullName: "Lecturer",
      email: "lecturer@fpt.edu.vn",
      role: "Lecturer",
    },
  });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider
        router={createMemoryRouter([{ path: "/", element }], {
          initialEntries: [entry],
        })}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  lecturerApi.getQuestion.mockResolvedValue({
    questionId: "edit-1",
    examTypeId: "exam-type-final",
    topicId: bankQuestions[0].topic,
    content: "Original editable question",
    questionType: "Single",
    difficulty: "Medium",
    defaultScore: 1,
    status: "Draft",
    createdAt: "2026-09-15",
    options: [
      { optionId: "option-1", content: "First answer", isCorrect: true, displayOrder: 1 },
      { optionId: "option-2", content: "Second answer", isCorrect: false, displayOrder: 2 },
    ],
  });
  lecturerApi.updateQuestion.mockClear();
  lecturerApi.updateQuestionOption.mockClear();
});
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});
describe("Lecturer questions", { timeout: 20000 }, () => {
  it("searches and paginates questions through the server query", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = view(<QuestionBankRoute purpose="exam" />);
    expect(await screen.findByText("Showing 10 of 12 questions from the server")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search exam questions"), "EXQ-0012");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByText("Showing 1 of 1 questions from the server"),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText("Select EXQ-0012"));
    expect(screen.getByText("1 questions selected")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    await expectNoAxeViolations(result.container);
  });
  it("switches Backend-supported types, disables unsupported types, validates and saves a draft", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = view(<CreateQuestionRoute />, "/?purpose=exam");
    for (const label of [questionTypes.single, questionTypes.multiple, questionTypes.essay]) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    for (const label of [questionTypes.code, questionTypes.math, questionTypes.diagram]) {
      expect(screen.getByRole("button", { name: `${label} · unavailable` })).toBeDisabled();
    }
    await user.click(
      screen.getByRole("button", { name: "Save to Question Bank" }),
    );
    expect(screen.getAllByText("Question content is required.")).toHaveLength(
      2,
    );
    await user.type(
      screen.getByLabelText("Question content (required)"),
      "Describe this architecture.",
    );
    expect(screen.getAllByText("Describe this architecture.")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(readDraft("question-test", "exam")?.content).toBe(
      "Describe this architecture.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    await expectNoAxeViolations(result.container);
  });
  it("loads and updates an existing Backend question and its options", async () => {
    const user = userEvent.setup();
    view(<CreateQuestionRoute />, "/?purpose=exam&edit=edit-1");
    const content = await screen.findByDisplayValue("Original editable question");
    await user.clear(content);
    await user.type(content, "Updated editable question");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(lecturerApi.updateQuestion).toHaveBeenCalledWith("edit-1", expect.objectContaining({ content: "Updated editable question" })));
    expect(lecturerApi.updateQuestionOption).toHaveBeenCalledTimes(2);
  });
  it("restores a user-scoped draft", () => {
    const draft = createDraft("essay");
    draft.content = "Restored question";
    localStorage.setItem(
      draftKey("question-test", "practice"),
      JSON.stringify(draft),
    );
    view(<CreateQuestionRoute />, "/?purpose=practice");
    expect(screen.getByLabelText("Question content (required)")).toHaveValue(
      "Restored question",
    );
    expect(readDraft("other-user", "practice")).toBeNull();
  });
  it("validates correct answers, points and malformed storage", () => {
    const draft = createDraft();
    expect(validateDraft(draft, false)).toContain(
      "Select exactly one correct answer.",
    );
    draft.points = "-1";
    expect(validateDraft(draft, false)).toContain(
      "Points must be greater than zero.",
    );
    localStorage.setItem(draftKey("bad"), '{"type":"single"}');
    expect(readDraft("bad")).toBeNull();
  });
  it("shows which questions have audio and filters the page by it", async () => {
    const user = userEvent.setup();
    lecturerApi.getQuestionAudioGeneration.mockImplementation(async (id: string) => id === "EXQ-0001"
      ? { questionId: id, totalSegments: 3, ready: 3, workerEnabled: true, segments: [] }
      : { questionId: id, totalSegments: 0, ready: 0, workerEnabled: true, segments: [] });
    view(<QuestionBankRoute purpose="exam" />);
    expect(await screen.findByText("3/3 segments")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Audio"));
    await user.click(screen.getByRole("option", { name: "All audio ready" }));
    expect(await screen.findByText("Showing 1 of 1 questions from the server")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("No audio")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(await screen.findByText("Showing 10 of 12 questions from the server")).toBeInTheDocument();
  });
  it("finds questions whose own audio is ready while answers are still in progress", async () => {
    const user = userEvent.setup();
    lecturerApi.getQuestionAudioGeneration.mockImplementation(async (id: string) => id === "EXQ-0002"
      ? { questionId: id, totalSegments: 5, ready: 1, workerEnabled: true, segments: [
        { questionId: id, optionId: null, generationStatus: "Ready", hasAudio: true, attemptCount: 1 },
        { questionId: id, optionId: "o1", displayOrder: 1, generationStatus: "Pending", hasAudio: false, attemptCount: 0 },
      ] }
      : { questionId: id, totalSegments: 0, ready: 0, workerEnabled: true, segments: [] });
    view(<QuestionBankRoute purpose="exam" />);
    expect(await screen.findByText("Question audio ready")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Audio"));
    await user.click(screen.getByRole("option", { name: "Has question audio" }));
    expect(await screen.findByText("Showing 1 of 1 questions from the server")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Audio"));
    await user.click(screen.getByRole("option", { name: "All audio ready" }));
    expect(await screen.findByText("Showing 0 of 0 questions from the server")).toBeInTheDocument();
  });
  it("finds a question with audio even when it is not on the first page", async () => {
    const user = userEvent.setup();
    lecturerApi.getQuestionAudioGeneration.mockImplementation(async (id: string) => id === "EXQ-0012"
      ? { questionId: id, totalSegments: 2, ready: 1, workerEnabled: true, segments: [
        { questionId: id, optionId: null, generationStatus: "Ready", hasAudio: true, attemptCount: 1 },
      ] }
      : { questionId: id, totalSegments: 0, ready: 0, workerEnabled: true, segments: [] });
    view(<QuestionBankRoute purpose="exam" />);
    await screen.findByText("Showing 10 of 12 questions from the server");
    expect(screen.queryByText("Question audio ready")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Audio"));
    await user.click(screen.getByRole("option", { name: "Has question audio" }));
    expect(await screen.findByText("Showing 1 of 1 questions from the server")).toBeInTheDocument();
    expect(screen.getByText("Question audio ready")).toBeInTheDocument();
  });
  it("shows a loading state, not an empty message, while questions are loading", async () => {
    view(<QuestionBankRoute purpose="exam" />);
    expect(screen.getByRole("status", { name: "Loading questions" })).toBeInTheDocument();
    expect(screen.queryByText("No exam questions match your filters.")).not.toBeInTheDocument();
    expect(await screen.findByText("Showing 10 of 12 questions from the server")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading questions" })).not.toBeInTheDocument();
  });
  it("selects every matching question and activates the drafts among them in one go", async () => {
    const user = userEvent.setup();
    lecturerApi.setQuestionStatus.mockClear();
    view(<QuestionBankRoute purpose="exam" />);
    await screen.findByText("Showing 10 of 12 questions from the server");
    expect(screen.getByRole("button", { name: "Activate 0 selected" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Select all 12 matching" }));
    expect(await screen.findByText("12 questions selected · 2 Draft")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Activate 2 selected" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Activate 2 questions?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Activate" }));
    await waitFor(() => expect(lecturerApi.setQuestionStatus).toHaveBeenCalledTimes(2));
    expect(lecturerApi.setQuestionStatus).toHaveBeenCalledWith(expect.any(String), "Active");
    expect(await screen.findByText("No questions selected")).toBeInTheDocument();
    // The dialog closes at once; a floating tracker reports the result and can be folded or closed.
    const tracker = await screen.findByRole("region", { name: "Bulk activation progress" });
    expect(await within(tracker).findByText("Questions activated")).toBeInTheDocument();
    expect(within(tracker).getByText("Activated")).toBeInTheDocument();
    await user.click(within(tracker).getByRole("button", { name: "Hide activation progress" }));
    expect(within(tracker).queryByText("Activated")).not.toBeInTheDocument();
    await user.click(within(tracker).getByRole("button", { name: "Close activation progress" }));
    expect(screen.queryByRole("region", { name: "Bulk activation progress" })).not.toBeInTheDocument();
  });
  it("previews a question with its answers and audio player", async () => {
    const user = userEvent.setup();
    lecturerApi.getQuestionAudio.mockResolvedValue({ audio: {}, url: "https://audio.test/question.mp3", expiresAt: "2026-11-10T00:10:00Z" });
    lecturerApi.getQuestionOptionAudio.mockRejectedValue(new Error("no audio"));
    view(<QuestionBankRoute purpose="exam" />);
    await screen.findByText("Showing 10 of 12 questions from the server");
    await user.click(screen.getAllByRole("button", { name: "Preview" })[0]);
    const dialog = await screen.findByRole("dialog");
    expect((await within(dialog).findAllByText("Original editable question")).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("First answer").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Live review")).toBeInTheDocument();
    expect(within(dialog).queryByText("Student experience")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Preview mode")).not.toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText("Question audio")).toHaveAttribute("src", "https://audio.test/question.mp3"));
    expect((await within(dialog).findAllByText("No audio file yet.")).length).toBe(2);
    const order = within(dialog).getByRole("region", { name: "Screen reader reading order" });
    expect(within(order).getByText("Original editable question")).toBeInTheDocument();
    expect(within(order).getByText("2 answer options. Select one answer.")).toBeInTheDocument();
    expect(within(order).getByText("Option A. First answer")).toBeInTheDocument();
  });
  it("filters by status and resets filters", async () => {
    const user = userEvent.setup();
    view(<QuestionBankRoute purpose="exam" />);
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Draft" }));
    expect(await screen.findByText("Showing 2 of 2 questions from the server")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(await screen.findByText("Showing 10 of 12 questions from the server")).toBeInTheDocument();
  });
  it("exports the questions on the page to a formatted Excel file", async () => {
    const user = userEvent.setup();
    excel.downloadQuestionWorkbook.mockClear();
    view(<QuestionBankRoute purpose="exam" />);
    await screen.findByText("Showing 10 of 12 questions from the server");
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Draft" }));
    await screen.findByText("Showing 2 of 2 questions from the server");
    await user.click(screen.getByRole("button", { name: "Export current page (.xlsx)" }));
    await waitFor(() => expect(excel.downloadQuestionWorkbook).toHaveBeenCalledTimes(1));
    const [questions, context] = excel.downloadQuestionWorkbook.mock.calls[0] as unknown as [unknown[], Record<string, unknown>];
    expect(questions).toHaveLength(2);
    expect(context).toMatchObject({ purpose: "exam", title: "Exam Questions", page: 1, pageCount: 1, totalCount: 2 });
    expect(context.filters).toEqual([["Exam type", "Final Exam"], ["Status", "Draft"]]);
  });

  it("tells the lecturer when the Excel file cannot be created", async () => {
    const user = userEvent.setup();
    excel.downloadQuestionWorkbook.mockRejectedValueOnce(new Error("blocked"));
    view(<><QuestionBankRoute purpose="exam" /><Toaster /></>);
    await screen.findByText("Showing 10 of 12 questions from the server");
    await user.click(screen.getByRole("button", { name: "Export current page (.xlsx)" }));
    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export current page (.xlsx)" })).toBeEnabled();
  });

  it("has nothing to export while no question matches", async () => {
    const user = userEvent.setup();
    view(<QuestionBankRoute purpose="exam" />);
    await screen.findByText("Showing 10 of 12 questions from the server");
    await user.type(screen.getByLabelText("Search exam questions"), "zzzz-no-match{Enter}");
    await screen.findByText("Showing 0 of 0 questions from the server");
    expect(screen.getByRole("button", { name: "Export current page (.xlsx)" })).toBeDisabled();
  });

  it("folds the filters away to make room for questions, keeping a summary", async () => {
    const user = userEvent.setup();
    view(<QuestionBankRoute purpose="exam" />);
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Draft" }));
    expect(screen.getByRole("button", { name: /Hide filters/ })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: /Hide filters/ }));
    expect(screen.getByRole("button", { name: /Show filters/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Status")).not.toBeVisible();
    expect(screen.queryByRole("list", { name: "Subjects" })).not.toBeInTheDocument();
    const summary = screen.getByRole("list", { name: "Active filters" });
    expect(summary).toHaveTextContent("Exam type Final Exam");
    expect(summary).toHaveTextContent("Status Draft");
    // Filters left at their default are listed too.
    expect(summary).toHaveTextContent("Question type All types");
    expect(summary).toHaveTextContent("Difficulty All difficulties");
    expect(summary).toHaveTextContent("Subject All subjects");
    expect(summary).toHaveTextContent("Topic All topics");
    expect(summary).toHaveTextContent("Audio All audio");
    expect(within(summary).getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /Show filters/ })).toHaveTextContent("1");
    expect(screen.getByLabelText("Search exam questions")).toBeInTheDocument();
    expect(await screen.findByText("Showing 2 of 2 questions from the server")).toBeInTheDocument();
  });

  it("opens the filters again with their choices intact, and remembers the fold", async () => {
    const user = userEvent.setup();
    const first = view(<QuestionBankRoute purpose="exam" />);
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Draft" }));
    await user.click(screen.getByRole("button", { name: /Hide filters/ }));
    expect(localStorage.getItem("learnable.lecturer.question-filters-hidden")).toBe("1");
    await user.click(screen.getByRole("button", { name: /Show filters/ }));
    expect(screen.getByLabelText("Status")).toHaveTextContent("Draft");
    expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Hide filters/ }));
    first.unmount();
    view(<QuestionBankRoute purpose="exam" />);
    expect(screen.getByRole("button", { name: /Show filters/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).not.toBeVisible();
  });

  it("publishes a supported valid question through the backend API", async () => {
    lecturerApi.queueQuestionAudioGeneration.mockClear();
    const draft = createDraft("essay");
    if (draft.type === "essay") {
      draft.examTypeId = "exam-type-final";
      draft.course = "SWE201";
      draft.topic = "Microservices Architecture";
      draft.content = "Explain service boundaries.";
      draft.instructions = "Write a concise response.";
    }
    localStorage.setItem(
      draftKey("question-test", "exam"),
      JSON.stringify(draft),
    );
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    view(<CreateQuestionRoute />, "/?purpose=exam");
    await user.click(
      screen.getByRole("button", { name: "Save to Question Bank" }),
    );
    await waitFor(() => expect(lecturerApi.createQuestionWithOptions).toHaveBeenCalled());
    await waitFor(() => expect(lecturerApi.queueQuestionAudioGeneration).toHaveBeenCalledWith("created-question"));
    expect(
      screen.queryByRole("button", { name: "Listen to AI reading" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Validate accessibility" }),
    ).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("loads only the backend Practice exam type in the practice bank", async () => {
    view(<QuestionBankRoute purpose="practice" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Practice Questions" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("PRQ-0001")).toBeInTheDocument();
    expect(screen.queryByText("EXQ-0001")).not.toBeInTheDocument();
    expect(screen.getByText("Exam type")).toBeInTheDocument();
    expect(screen.getByLabelText("Exam type")).toHaveTextContent("Practice");
    expect(screen.getByLabelText("Exam type")).not.toHaveTextContent("PRACTICE ·");
    expect(
      screen.getByRole("link", { name: "Create practice question" }),
    ).toHaveAttribute("href", "/lecturer/questions/new?purpose=practice");
  });
  it("keeps local drafts separate by question purpose", () => {
    const exam = createDraft("essay");
    const practice = createDraft("essay");
    exam.content = "Exam-only draft";
    practice.content = "Practice-only draft";
    localStorage.setItem(
      draftKey("question-test", "exam"),
      JSON.stringify(exam),
    );
    localStorage.setItem(
      draftKey("question-test", "practice"),
      JSON.stringify(practice),
    );
    expect(readDraft("question-test", "exam")?.content).toBe("Exam-only draft");
    expect(readDraft("question-test", "practice")?.content).toBe(
      "Practice-only draft",
    );
  });
  it("asks before discarding unsaved navigation", async () => {
    const user = userEvent.setup();
    view(<CreateQuestionRoute />);
    await user.type(
      screen.getByLabelText("Question content (required)"),
      "Unsaved question",
    );
    await user.click(screen.getAllByRole("link", { name: "Cancel" })[0]);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QuestionBankRoute } from "../routes/QuestionBankRoute";
import { CreateQuestionRoute } from "../routes/CreateQuestionRoute";
import {
  createDraft,
  draftKey,
  readDraft,
  validateDraft,
  questionTypes,
} from "./model";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { bankQuestions, courses } from "./fixtures";
vi.mock("@/api/lecturer", () => ({
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
    const rows = bankQuestions.filter(
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
beforeEach(() => localStorage.clear());
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});
describe("Lecturer questions", { timeout: 20000 }, () => {
  it("searches, paginates and selects questions locally", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = view(<QuestionBankRoute purpose="exam" />);
    expect(screen.getByText("Showing 10 of 12 questions")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search exam questions"), "EXQ-0012");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByText("Showing 1 of 1 questions"),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText("Select EXQ-0012"));
    expect(screen.getByText("1 questions selected")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    await expectNoAxeViolations(result.container);
  });
  it("switches six types, validates and saves a draft without network calls", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = view(<CreateQuestionRoute />, "/?purpose=exam");
    for (const label of Object.values(questionTypes)) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Save & Add to Exam Questions" }),
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
  it("filters by status and resets filters", async () => {
    const user = userEvent.setup();
    view(<QuestionBankRoute purpose="exam" />);
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Draft" }));
    expect(screen.getByText("Showing 3 of 3 questions")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText("Showing 10 of 12 questions")).toBeInTheDocument();
  });
  it("does not publish a valid question or send unavailable requests", async () => {
    const draft = createDraft("essay");
    if (draft.type === "essay") {
      draft.course = "SWE201";
      draft.topic = "Microservices Architecture";
      draft.content = "Explain service boundaries.";
      draft.instructions = "Write a concise response.";
      draft.rubric = "Award points for clear boundaries.";
    }
    localStorage.setItem(
      draftKey("question-test", "exam"),
      JSON.stringify(draft),
    );
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    view(<CreateQuestionRoute />, "/?purpose=exam");
    await user.click(
      screen.getByRole("button", { name: "Save & Add to Exam Questions" }),
    );
    expect(screen.getByText(/No question has been added/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Listen to AI reading" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Validate accessibility" }),
    ).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("keeps exam and practice questions in separate workspaces", () => {
    view(<QuestionBankRoute purpose="practice" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Practice Questions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("PRQ-0001")).toBeInTheDocument();
    expect(screen.queryByText("EXQ-0001")).not.toBeInTheDocument();
    expect(screen.getByText("Used in practice sets")).toBeInTheDocument();
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

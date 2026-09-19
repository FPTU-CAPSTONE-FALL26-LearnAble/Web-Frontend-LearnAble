import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  ExaminerDashboardRoute,
  ExamBankRoute,
  ExamSetupRoute,
  QuestionSelectionRoute,
  RoomMonitoringRoute,
  ScheduleDetailsRoute,
} from "./ExaminerRoutes";

const api = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  getQuestion: vi.fn(),
  getSubjects: vi.fn(),
  getTopics: vi.fn(),
  getSemesters: vi.fn(),
}));

vi.mock("@/api/catalog", () => api);

vi.mock("@/shared/a11y/useRouteAnnouncer", () => ({
  useRouteAnnouncer: vi.fn(),
}));

describe("Examiner routes", () => {
  const page = <T,>(items: T[]) => ({
    items,
    pageNumber: 1,
    pageSize: 10,
    totalCount: items.length,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const question = {
    questionId: "q-live-1",
    topicId: "topic-1",
    createdBy: "lecturer-1",
    content: "Which process is iterative?",
    questionType: "Single",
    difficulty: "Medium",
    defaultScore: 0.25,
    status: "Active",
    createdAt: "2026-09-18T00:00:00Z",
    options: [
      { optionId: "o1", content: "Agile", isCorrect: true, displayOrder: 1 },
    ],
  };

  beforeEach(() => {
    sessionStorage.clear();
    api.getQuestions.mockResolvedValue(page([question]));
    api.getQuestion.mockResolvedValue(question);
    api.getSubjects.mockResolvedValue(
      page([
        {
          subjectId: "subject-1",
          subjectCode: "SWE201",
          subjectNameEn: "Software Engineering",
        },
      ]),
    );
    api.getTopics.mockResolvedValue(
      page([
        {
          topicId: "topic-1",
          subjectId: "subject-1",
          topicName: "Process models",
        },
      ]),
    );
    api.getSemesters.mockResolvedValue(
      page([
        {
          semesterId: "semester-1",
          semesterCode: "FA26",
          semesterName: "Fall 2026",
          academicYear: "2026",
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          status: "Ongoing",
        },
      ]),
    );
  });

  function renderRoute(node: React.ReactNode, entries = ["/"]) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={entries}>{node}</MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("renders the dashboard with the signed-in examiner", () => {
    useAuthStore.setState({
      user: {
        id: "e1",
        fullName: "Mai Chi",
        email: "mai@fpt.edu.vn",
        role: "Examiner",
      },
    });
    renderRoute(<ExaminerDashboardRoute />);
    expect(
      screen.getByRole("heading", { name: /Good morning, Mai Chi/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Critical incidents requiring action"),
    ).toBeInTheDocument();
  });

  it("searches and filters the exam bank locally", () => {
    renderRoute(<ExamBankRoute />);
    fireEvent.change(
      screen.getByPlaceholderText("Search by code, subject, or title"),
      { target: { value: "PRF192" } },
    );
    expect(
      screen.getByText("C Programming Practical Test"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Software Engineering Foundations"),
    ).not.toBeInTheDocument();
  });

  it("loads, filters, selects and previews live questions without a write", async () => {
    const request = vi.spyOn(globalThis, "fetch");
    renderRoute(<QuestionSelectionRoute />);
    expect(
      await screen.findByText("Which process is iterative?", { exact: false }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search question bank"), {
      target: { value: "iterative" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(api.getQuestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ SearchTerm: "iterative", Status: "Active" }),
      ),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByText("/ 40", { exact: false }).parentElement,
    ).toHaveTextContent("1 / 40");
    expect(
      JSON.parse(
        sessionStorage.getItem("learnable:examiner:exam-draft-v1") ?? "{}",
      ),
    ).toEqual(expect.objectContaining({ selectedQuestionIds: ["q-live-1"] }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Agile")).toBeInTheDocument();
    expect(api.getQuestion).toHaveBeenCalledWith("q-live-1");
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });

  it("loads live subjects and semesters in exam and schedule setup", async () => {
    renderRoute(
      <>
        <ExamSetupRoute />
        <ScheduleDetailsRoute />
      </>,
    );
    await waitFor(() => {
      expect(api.getSubjects).toHaveBeenCalled();
      expect(api.getSemesters).toHaveBeenCalled();
    });
    expect(screen.getAllByText("Simulation data.").length).toBeGreaterThan(0);
  });

  it("filters the room kiosk matrix", () => {
    renderRoute(<RoomMonitoringRoute />, ["/examiner/monitoring/alpha-302"]);
    fireEvent.click(screen.getByRole("button", { name: "Disconnected" }));
    expect(screen.getByText("HE171004")).toBeInTheDocument();
  });
});

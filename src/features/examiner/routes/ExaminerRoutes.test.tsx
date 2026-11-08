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
const examApi = vi.hoisted(() => ({
  getExamPaperBank: vi.fn(),
  getExamRooms: vi.fn(),
  getExamSchedules: vi.fn(),
  publishExamPaper: vi.fn(),
  getExamTypes: vi.fn(),
  getExamSubjects: vi.fn(),
  getAvailableExamQuestions: vi.fn(),
  setExamPaperQuestions: vi.fn(),
  createExamShift: vi.fn(),
  createExamSchedule: vi.fn(),
  cancelExamShift: vi.fn(),
  cancelExamSchedule: vi.fn(),
}));
const invigilationApi = vi.hoisted(() => ({
  getInvigilationPeriods: vi.fn(),
  getInvigilationPeriod: vi.fn(),
}));

vi.mock("@/api/catalog", () => api);
vi.mock("@/api/exams", () => examApi);
vi.mock("@/api/invigilation", () => invigilationApi);

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
    examTypeId: "type-1",
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
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    invigilationApi.getInvigilationPeriods.mockResolvedValue(page([{ periodId: "period-1", name: "Fall invigilation", status: "Open" }]));
    invigilationApi.getInvigilationPeriod.mockResolvedValue({ period: { periodId: "period-1", name: "Fall invigilation", status: "Open" }, slots: [{ slotId: "slot-1", periodId: "period-1", name: "Morning", startsAt: "2026-11-08T09:00", endsAt: "2026-11-08T11:00", revision: "revision-1" }], selectedSlotIds: [] });
    api.getQuestions.mockResolvedValue(page([question]));
    api.getQuestion.mockResolvedValue(question);
    api.getSubjects.mockResolvedValue(
      page([
        {
          subjectId: "subject-1",
          universityId: "university-1",
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
          universityId: "university-1",
          semesterCode: "FA26",
          semesterName: "Fall 2026",
          academicYear: "2026",
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          status: "Ongoing",
        },
      ]),
    );
    examApi.getExamPaperBank.mockResolvedValue([
      {
        examPaperId: "paper-1",
        examSubjectId: "exam-subject-1",
        paperCode: "PRF192-FE-01",
        name: "C Programming Practical Test",
        version: 1,
        status: "Draft",
        createdAt: "2026-10-26T00:00:00Z",
        totalScore: 10,
        questions: [],
        eTag: "etag-1",
        examSubject: { name: "PRF192", status: "Ready", durationMinutes: 90 },
      },
      {
        examPaperId: "paper-2",
        examSubjectId: "exam-subject-2",
        paperCode: "SWE201-FE-01",
        name: "Software Engineering Foundations",
        version: 1,
        status: "Published",
        createdAt: "2026-10-26T00:00:00Z",
        totalScore: 10,
        questions: [],
        examSubject: { name: "SWE201", status: "Ready", durationMinutes: 90 },
      },
    ]);
    examApi.getExamRooms.mockResolvedValue(page([
      { examRoomId: "room-1", universityId: "university-1", roomCode: "A302", name: "Lab Alpha 302", building: "Alpha", floor: 3, capacity: 35, isActive: true },
      { examRoomId: "room-2", universityId: "university-1", roomCode: "B204", name: "Lab Beta 204", building: "Beta", floor: 2, capacity: 30, isActive: true },
    ]));
    examApi.getExamSchedules.mockResolvedValue(page([{ examScheduleId: "schedule-1", examSubjectId: "exam-subject-1", examName: "SWE201 Final", examShiftId: "shift-1", examRoomId: "room-1", roomName: "Lab Alpha 302", startsAt: "2026-10-26T13:30:00Z", endsAt: "2026-10-26T15:30:00Z", entryOpensAt: "2026-10-26T13:00:00Z", entryClosesAt: "2026-10-26T14:00:00Z", status: "Open" }]));
    examApi.getExamTypes.mockResolvedValue([{ examTypeId: "type-1", code: "FINAL", name: "Final Exam", isActive: true }]);
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90 }]));
    examApi.getAvailableExamQuestions.mockResolvedValue(page([{ ...question, eligible: true, reasons: [], examTypeId: "type-1" }]));
    examApi.setExamPaperQuestions.mockResolvedValue({ questions: [{ questionId: question.questionId }], totalScore: 0.25, eTag: "etag-2" });
    examApi.createExamShift.mockImplementation(async ({ examRoomId }: { examRoomId: string }) => ({ examShiftId: `shift-${examRoomId}` }));
    examApi.createExamSchedule.mockImplementation(async ({ examShiftId }: { examShiftId: string }) => ({ examScheduleId: `schedule-${examShiftId}` }));
    examApi.cancelExamShift.mockResolvedValue(undefined);
    examApi.cancelExamSchedule.mockResolvedValue(undefined);
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

  it("renders the dashboard with the signed-in examiner", async () => {
    useAuthStore.setState({
      user: {
        id: "e1",
        universityId: "university-1",
        isSuperAdmin: false,
        fullName: "Mai Chi",
        email: "mai@fpt.edu.vn",
        role: "Examiner",
      },
    });
    renderRoute(<ExaminerDashboardRoute />);
    expect(await screen.findByRole("heading", { name: /Good day, Mai Chi/i })).toBeInTheDocument();
    expect(await screen.findByText("SWE201 Final")).toBeInTheDocument();
  });

  it("keeps paper and room data visible when schedules are unavailable", async () => {
    examApi.getExamSchedules.mockRejectedValue(new Error("Schedule service unavailable"));
    useAuthStore.setState({
      user: { id: "e1", universityId: "university-1", isSuperAdmin: false, fullName: "Mai Chi", email: "mai@fpt.edu.vn", role: "Examiner" },
    });
    renderRoute(<ExaminerDashboardRoute />);
    expect((await screen.findAllByText("Exam schedules are temporarily unavailable.")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 published")).toBeInTheDocument();
    expect(screen.getByText("2 rooms returned")).toBeInTheDocument();
  });

  it("loads and filters the exam bank from the backend", async () => {
    renderRoute(<ExamBankRoute />);
    expect(await screen.findByText("C Programming Practical Test")).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText("Search by code, subject, or title"),
      { target: { value: "PRF192" } },
    );
    expect(screen.getByText("C Programming Practical Test")).toBeInTheDocument();
    expect(
      screen.queryByText("Software Engineering Foundations"),
    ).not.toBeInTheDocument();
  });

  it("loads eligible questions and stores a scored selection", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", selectedQuestions: [] }));
    renderRoute(<QuestionSelectionRoute />);
    expect(
      await screen.findByText("Which process is iterative?", { exact: false }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search by content or question ID"), {
      target: { value: "iterative" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      JSON.parse(
        sessionStorage.getItem("learnable:examiner:exam-preparation-v2") ?? "{}",
      ),
    ).toEqual(expect.objectContaining({ selectedQuestions: [{ questionId: "q-live-1", maxScore: 0.25 }] }));
    expect(examApi.getAvailableExamQuestions).toHaveBeenCalledWith("paper-1", {
      EligibleOnly: false,
    });
  });

  it("shows why a question cannot be selected for the paper", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({
      examPaperId: "paper-1",
      paperETag: "etag-1",
      examTypeId: "type-1",
      selectedQuestions: [],
    }));
    examApi.getAvailableExamQuestions.mockResolvedValue(page([
      {
        ...question,
        eligible: false,
        reasons: ["Question needs audio.", "Every option needs audio."],
        examTypeId: "type-2",
      },
    ]));

    renderRoute(<QuestionSelectionRoute />);

    expect(await screen.findByText("Question needs audio")).toBeInTheDocument();
    expect(screen.getByText("Every option needs audio")).toBeInTheDocument();
    expect(screen.getByText("Question does not match the exam type")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("loads live catalogs for exam and schedule setup", async () => {
    renderRoute(
      <>
        <ExamSetupRoute />
        <ScheduleDetailsRoute />
      </>,
    );
    await waitFor(() => {
      expect(api.getSubjects).toHaveBeenCalled();
      expect(api.getSemesters).toHaveBeenCalled();
      expect(examApi.getExamTypes).toHaveBeenCalled();
      expect(examApi.getExamSubjects).toHaveBeenCalled();
    });
    expect(screen.queryByText("Simulation data.")).not.toBeInTheDocument();
  });

  it("keeps the selected room pool for the Backend bulk schedule preview", async () => {
    sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
      examSubjectId: "exam-subject-1",
      invigilationPeriodId: "period-1",
      invigilationSlotId: "slot-1",
      examRoomIds: ["room-1", "room-2"],
      shiftName: "Morning shift",
      startsAt: "2026-11-08T09:00",
      endsAt: "2026-11-08T11:00",
      entryOpensAt: "2026-11-08T09:00",
      entryClosesAt: "2026-11-08T09:30",
    }));
    renderRoute(<ScheduleDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Continue with 2 rooms" }));

    const stored = JSON.parse(sessionStorage.getItem("learnable:examiner:schedule-preparation-v3") ?? "{}");
    expect(stored.examRoomIds).toEqual(["room-1", "room-2"]);
    expect(stored.bulkRequestId).toEqual(expect.any(String));
    expect(examApi.createExamShift).not.toHaveBeenCalled();
    expect(examApi.createExamSchedule).not.toHaveBeenCalled();
  });

  it("suggests draft paper details from the exam configuration", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({
      subjectId: "subject-1",
      semesterId: "semester-1",
      examTypeId: "type-1",
      paperCode: "",
      paperName: "",
    }));
    renderRoute(<ExamSetupRoute />);
    await waitFor(() => expect(screen.getByLabelText("Paper code")).toHaveValue("SWE201-FINAL-FA26-01"));
    expect(screen.getByLabelText("Paper name")).toHaveValue("SWE201 Final Exam FA26 Paper 1");
  });

  it("does not render fixture candidates when no routed room id is available", async () => {
    renderRoute(<RoomMonitoringRoute />, ["/examiner/monitoring/room-1"]);
    expect(await screen.findByRole("heading", { name: "Room not found" })).toBeInTheDocument();
    expect(screen.queryByText("HE171004")).not.toBeInTheDocument();
  });
});

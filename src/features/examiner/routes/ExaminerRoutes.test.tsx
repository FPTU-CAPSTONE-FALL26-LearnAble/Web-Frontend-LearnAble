import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApiFailure } from "@/api/client";
import { useOperationProgress } from "@/features/examiner/workflow/operationProgress";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
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
  updateExamSubject: vi.fn(),
  updateExamPaper: vi.fn(),
  createExamShift: vi.fn(),
  createSharedExamShift: vi.fn(),
  previewSharedExamShift: vi.fn(),
  updateSharedExamShift: vi.fn(),
  getSharedExamShift: vi.fn(),
  getExamSchedule: vi.fn(),
  createExamSchedule: vi.fn(),
  cancelExamShift: vi.fn(),
  cancelExamSchedule: vi.fn(),
}));
const adminApi = vi.hoisted(() => ({ getRoomSeats: vi.fn<(roomId: string) => Promise<Array<{ seatId: string; isAvailable: boolean }>>>(async () => []) }));
const invigilationApi = vi.hoisted(() => ({
  getInvigilationPeriods: vi.fn(),
  getInvigilationPeriod: vi.fn(),
}));

vi.mock("@/api/catalog", () => api);
vi.mock("@/api/exams", () => examApi);
vi.mock("@/api/invigilation", () => invigilationApi);
vi.mock("@/api/admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/admin")>()),
  getRoomSeats: adminApi.getRoomSeats,
}));

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

  it("shows how balanced the selected questions are by difficulty and type", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", selectedQuestions: [] }));
    renderRoute(<QuestionSelectionRoute />);
    await screen.findByText("Which process is iterative?", { exact: false });
    const balance = screen.getByRole("region", { name: "Paper balance" });
    expect(within(balance).queryByText("The mix is close to your targets.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Select question/ }));
    // One Medium, single-choice question is 100% of the paper against a 50% Medium target.
    expect(await within(balance).findByText("Medium is 50 points above its 50% target.")).toBeInTheDocument();
    expect(within(balance).getByText("No Hard questions yet and none are eligible.")).toBeInTheDocument();
    fireEvent.change(within(balance).getByLabelText("Target percent for Medium"), { target: { value: "100" } });
    expect(within(balance).queryByText("Medium is 50 points above its 50% target.")).not.toBeInTheDocument();
  });

  it("scores selected questions with the planned points", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", selectedQuestions: [], plannedQuestionCount: 4, pointsPerQuestion: 2.5 }));
    renderRoute(<QuestionSelectionRoute />);
    await screen.findByText("Which process is iterative?", { exact: false });
    fireEvent.click(screen.getByRole("checkbox", { name: /Select question/ }));
    expect(JSON.parse(sessionStorage.getItem("learnable:examiner:exam-preparation-v2") ?? "{}").selectedQuestions).toEqual([{ questionId: "q-live-1", maxScore: 2.5 }]);
    expect(screen.queryByText("Plan")).not.toBeInTheDocument();
  });

  it("works out the exam total from the number of questions and the points each", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ subjectId: "subject-1", semesterId: "semester-1", examTypeId: "type-1", passScore: 5 }));
    renderRoute(<ExamSetupRoute />);
    const count = await screen.findByLabelText("Number of questions");
    fireEvent.change(count, { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Points per question"), { target: { value: "0.25" } });
    expect(await screen.findByText(/10 points in total/)).toBeInTheDocument();
    expect(screen.getByText(/A pass score of 5 is 50% of the total/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Points per question"), { target: { value: "0.1" } });
    expect(await screen.findByText(/pass score \(5\) is higher than the planned total \(4\)/)).toBeInTheDocument();
  });

  it("accepts points that are not multiples of a quarter", async () => {
    renderRoute(<ExamSetupRoute />);
    const points = await screen.findByLabelText("Points per question");
    fireEvent.change(points, { target: { value: "0.2" } });
    expect(points).toHaveValue(0.2);
    expect((points as HTMLInputElement).validity.stepMismatch).toBe(false);
    expect((screen.getByLabelText("Pass score") as HTMLInputElement).step).toBe("any");
  });

  it("offers Edit only on Draft papers and opens the draft with everything filled in", async () => {
    examApi.getExamPaperBank.mockResolvedValue([
      {
        examPaperId: "paper-1", examSubjectId: "exam-subject-1", paperCode: "CSD201-FINAL-FA26-01", name: "CSD201 Final FA26 Paper 1",
        version: 1, status: "Draft", createdAt: "2026-10-26T00:00:00Z", totalScore: 1, eTag: "paper-etag",
        questions: [{ questionId: "q-1", maxScore: 0.5 }, { questionId: "q-2", maxScore: 0.5 }],
        examSubject: { examSubjectId: "exam-subject-1", subjectId: "subject-1", semesterId: "semester-1", examTypeId: "type-1", name: "CSD201 FINAL EXAM", instructions: "Read carefully", status: "Ready", durationMinutes: 90, passScore: 5, shuffleQuestions: true, shuffleOptions: false, cameraRequired: true, cameraUnavailablePolicy: "Block", eTag: "subject-etag" },
      },
      {
        examPaperId: "paper-2", examSubjectId: "exam-subject-2", paperCode: "SWE201-FE-01", name: "Published paper",
        version: 1, status: "Published", createdAt: "2026-10-26T00:00:00Z", totalScore: 10, questions: [],
        examSubject: { name: "SWE201", status: "Ready", durationMinutes: 90 },
      },
    ]);
    renderRoute(<ExamBankRoute />);
    await screen.findByText("CSD201 Final FA26 Paper 1");
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(JSON.parse(sessionStorage.getItem("learnable:examiner:exam-preparation-v2") ?? "{}")).toEqual(expect.objectContaining({
      editingPaper: true,
      examPaperId: "paper-1",
      paperETag: "paper-etag",
      examSubjectETag: "subject-etag",
      subjectId: "subject-1",
      durationMinutes: 90,
      cameraUnavailablePolicy: "Block",
      plannedQuestionCount: 2,
      pointsPerQuestion: 0.5,
      selectedQuestions: [{ questionId: "q-1", maxScore: 0.5 }, { questionId: "q-2", maxScore: 0.5 }],
    }));
  });

  it("opens a new exam, not an edit, when a draft left from an earlier edit is still stored", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({
      editingPaper: true, examSubjectId: "exam-subject-1", examPaperId: "paper-1", subjectId: "subject-1", semesterId: "semester-1", examTypeId: "type-1",
      name: "CSD201 FINAL EXAM", paperCode: "OLD-CODE", paperName: "Old paper",
    }));
    // The address has no ?edit=1, as when "Create exam paper" is pressed.
    renderRoute(<ExamSetupRoute />);
    expect(await screen.findByRole("heading", { name: "Create exam and paper" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Edit draft exam and paper" })).not.toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: /Subject/ })).toBeEnabled();
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem("learnable:examiner:exam-preparation-v2") ?? "{}").editingPaper).not.toBe(true));
    expect(screen.queryByDisplayValue("OLD-CODE")).not.toBeInTheDocument();
  });

  it("saves changes to an existing Draft with the stored versions instead of creating a new one", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({
      editingPaper: true, examSubjectId: "exam-subject-1", examSubjectETag: "subject-etag", examPaperId: "paper-1", paperETag: "paper-etag",
      subjectId: "subject-1", semesterId: "semester-1", examTypeId: "type-1", name: "CSD201 FINAL EXAM", durationMinutes: 90, passScore: 5,
      paperCode: "CSD201-FINAL-FA26-01", paperName: "CSD201 Final FA26 Paper 1",
    }));
    examApi.updateExamSubject.mockResolvedValue({ examSubjectId: "exam-subject-1", eTag: "subject-etag-2" });
    examApi.updateExamPaper.mockResolvedValue({ examPaperId: "paper-1", eTag: "paper-etag-2" });
    renderRoute(<ExamSetupRoute />, ["/?edit=1"]);
    expect(await screen.findByRole("heading", { name: "Edit draft exam and paper" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Duration (minutes)"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes and review questions" }));
    await waitFor(() => expect(examApi.updateExamSubject).toHaveBeenCalledWith("exam-subject-1", expect.objectContaining({ durationMinutes: 120, subjectId: "subject-1" }), "subject-etag"));
    await waitFor(() => expect(examApi.updateExamPaper).toHaveBeenCalledWith("paper-1", { paperCode: "CSD201-FINAL-FA26-01", name: "CSD201 Final FA26 Paper 1" }, "paper-etag"));
    expect(examApi.updateExamSubject).toHaveBeenCalledTimes(1);
    // The save is reported in the progress tracker too.
    await waitFor(() => expect(useOperationProgress.getState()).toMatchObject({ phase: "done", title: "Saving the draft exam" }));
    expect(useOperationProgress.getState().steps.map((step) => step.status)).toEqual(["done", "done"]);
  });

  it("auto-picks questions to match the difficulty targets, and can undo it", async () => {
    const pool = (level: string, count: number) => Array.from({ length: count }, (_, index) => ({ ...question, questionId: `${level}-${index}`, difficulty: level, eligible: true, reasons: [], examTypeId: "type-1" }));
    examApi.getAvailableExamQuestions.mockResolvedValue(page([...pool("Easy", 8), ...pool("Medium", 8), ...pool("Hard", 8)]));
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", selectedQuestions: [] }));
    renderRoute(<QuestionSelectionRoute />);
    const balance = await screen.findByRole("region", { name: "Paper balance" });
    const fill = within(balance).getByRole("button", { name: "Fill the rest" });
    expect(fill).toBeDisabled();
    fireEvent.change(within(balance).getByLabelText("Questions in this paper"), { target: { value: "10" } });
    expect(fill).toBeEnabled();
    fireEvent.click(fill);
    // 10 questions at the default 30/50/20 targets is 3 Easy, 5 Medium and 2 Hard.
    expect(await within(balance).findByText("Added 10 questions: 3 Easy, 5 Medium, 2 Hard.")).toBeInTheDocument();
    const stored = () => JSON.parse(sessionStorage.getItem("learnable:examiner:exam-preparation-v2") ?? "{}").selectedQuestions;
    expect(stored()).toHaveLength(10);
    fireEvent.click(within(balance).getByRole("button", { name: "Fill the rest" }));
    expect(await within(balance).findByText("The paper already has 10 questions. Use Pick again to choose new ones.")).toBeInTheDocument();
    fireEvent.click(within(balance).getByRole("button", { name: "Undo auto-pick" }));
    expect(await within(balance).findByText("The auto-pick was undone.")).toBeInTheDocument();
    expect(stored()).toHaveLength(0);
  });

  it("labels each question with its subject code and topic, and tints the chosen ones", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", subjectId: "subject-1", selectedQuestions: [] }));
    renderRoute(<QuestionSelectionRoute />);
    const title = await screen.findByText("Which process is iterative?", { exact: false });
    const row = title.closest("article") as HTMLElement;
    expect(await within(row).findByText("SWE201")).toBeInTheDocument();
    expect(await within(row).findByText("Process models")).toBeInTheDocument();
    expect(row).not.toHaveAttribute("data-selected");
    fireEvent.click(within(row).getByRole("checkbox"));
    await waitFor(() => expect(row).toHaveAttribute("data-selected", "true"));
    expect(row.className).toContain("bg-success");
  });

  it("opens a question in the live review from the selection list", async () => {
    api.getQuestion.mockResolvedValue({ ...question, options: [
      { optionId: "o1", content: "Agile", isCorrect: true, displayOrder: 1 },
      { optionId: "o2", content: "Waterfall", isCorrect: false, displayOrder: 2 },
    ] });
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ examPaperId: "paper-1", paperETag: "etag-1", examTypeId: "type-1", selectedQuestions: [] }));
    renderRoute(<QuestionSelectionRoute />);
    await screen.findByText("Which process is iterative?", { exact: false });
    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Live review")).toBeInTheDocument();
    expect(await within(dialog).findByText("Agile")).toBeInTheDocument();
    expect(within(dialog).getByText("Waterfall")).toBeInTheDocument();
    expect(api.getQuestion).toHaveBeenCalledWith("q-live-1");
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

  it("shows the real number of seats of each room, taken from its seat list", async () => {
    adminApi.getRoomSeats.mockImplementation(async (roomId: string) => roomId === "room-1"
      ? [{ seatId: "s1", isAvailable: true }, { seatId: "s2", isAvailable: true }, { seatId: "s3", isAvailable: false }]
      : []);
    renderRoute(<ScheduleDetailsRoute />);
    const first = (await screen.findByText(/A302 · Lab Alpha 302/)).closest("label") as HTMLElement;
    expect(await within(first).findByText("2 of 3 seats usable")).toBeInTheDocument();
    const second = screen.getByText(/B204 · Lab Beta 204/).closest("label") as HTMLElement;
    expect(await within(second).findByText("No seats set up")).toBeInTheDocument();
    expect(screen.queryByText(/Capacity not provided|Capacity not/)).not.toBeInTheDocument();
  });

  it("offers only sealed exams that are Ready when scheduling", async () => {
    examApi.getExamSubjects.mockResolvedValue(page([
      { examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90, requiresSealing: true },
      { examSubjectId: "exam-subject-2", name: "Unfinished exam", status: "Draft", durationMinutes: 90, requiresSealing: true },
      { examSubjectId: "exam-subject-3", name: "Old unsealed exam", status: "Ready", durationMinutes: 90, requiresSealing: false },
    ]));
    renderRoute(<ScheduleDetailsRoute />);
    fireEvent.click(await screen.findByRole("combobox", { name: /Exam configuration/ }));
    expect(await screen.findByRole("option", { name: "SWE201 Final" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Unfinished exam/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Old unsealed exam/ })).not.toBeInTheDocument();
  });

  it("says so when no sealed exam is ready to schedule", async () => {
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-3", name: "Old unsealed exam", status: "Ready", durationMinutes: 90, requiresSealing: false }]));
    renderRoute(<ScheduleDetailsRoute />);
    expect(await screen.findByText(/No sealed exam is ready to schedule/)).toBeInTheDocument();
  });

  it("creates one shared shift for the chosen rooms and moves on to the shift page", async () => {
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90, requiresSealing: true }]));
    examApi.createSharedExamShift.mockResolvedValue({ shiftId: "shift-1" });
    sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
      examSubjectId: "exam-subject-1",
      examRoomIds: ["room-1", "room-2"],
      shiftName: "Morning shift",
      startsAt: "2026-11-20T09:00",
      endsAt: "2026-11-20T11:00",
      entryOpensAt: "2026-11-20T09:00",
      entryClosesAt: "2026-11-20T09:30",
    }));
    renderRoute(<ScheduleDetailsRoute />);
    fireEvent.click(await screen.findByRole("button", { name: "Create the shift" }));
    await waitFor(() => expect(examApi.createSharedExamShift).toHaveBeenCalledWith(expect.objectContaining({ examSubjectId: "exam-subject-1", name: "Morning shift", roomIds: ["room-1", "room-2"] })));
    expect(examApi.createExamShift).not.toHaveBeenCalled();
    expect(examApi.createExamSchedule).not.toHaveBeenCalled();
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem("learnable:examiner:schedule-preparation-v3") ?? "{}").sharedShiftId).toBe("shift-1"));
  });

  it("checks the chosen rooms with the Backend before the shift is created", async () => {
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90, requiresSealing: true }]));
    examApi.previewSharedExamShift.mockResolvedValue([{ roomId: "room-1", name: "Lab 1", availableComputerSeats: 30, availableCameraSeats: 28 }]);
    sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
      examSubjectId: "exam-subject-1", examRoomIds: ["room-1"], shiftName: "Morning shift",
      startsAt: "2026-11-20T09:00", endsAt: "2026-11-20T11:00", entryOpensAt: "2026-11-20T09:00", entryClosesAt: "2026-11-20T09:30",
    }));
    renderRoute(<ScheduleDetailsRoute />);
    expect(await screen.findByText("30 computer seats · 28 with camera")).toBeInTheDocument();
    expect(examApi.previewSharedExamShift).toHaveBeenCalledWith(expect.objectContaining({ examSubjectId: "exam-subject-1", roomIds: ["room-1"] }));
  });

  it("shows the Backend reason when the rooms cannot be used", async () => {
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90, requiresSealing: true }]));
    examApi.previewSharedExamShift.mockRejectedValue(new ApiFailure({ kind: "server", status: 409 }, "Room has an overlapping schedule."));
    sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
      examSubjectId: "exam-subject-1", examRoomIds: ["room-1"], shiftName: "Morning shift",
      startsAt: "2026-11-20T09:00", endsAt: "2026-11-20T11:00", entryOpensAt: "2026-11-20T09:00", entryClosesAt: "2026-11-20T09:30",
    }));
    renderRoute(<ScheduleDetailsRoute />);
    expect(await screen.findByText(/Room has an overlapping schedule/)).toBeInTheDocument();
  });

  it("edits an existing shift instead of creating another one", async () => {
    examApi.previewSharedExamShift.mockClear();
    examApi.createSharedExamShift.mockClear();
    examApi.getExamSubjects.mockResolvedValue(page([{ examSubjectId: "exam-subject-1", name: "SWE201 Final", status: "Ready", durationMinutes: 90, requiresSealing: true }]));
    examApi.getSharedExamShift.mockResolvedValue({ shiftId: "shift-9", name: "Old name", startsAt: "2026-11-20T09:00:00", endsAt: "2026-11-20T11:00:00", status: "Draft", eTag: '"s-9"', scheduleIds: ["sch-1"], examSubjectId: "exam-subject-1" });
    examApi.getExamSchedule.mockResolvedValue({ examScheduleId: "sch-1", examRoomId: "room-1", entryOpensAt: "2026-11-20T09:00:00", entryClosesAt: "2026-11-20T09:30:00" });
    examApi.updateSharedExamShift.mockResolvedValue({ shiftId: "shift-9" });
    renderRoute(<ScheduleDetailsRoute />, ["/?edit=shift-9"]);
    expect(await screen.findByRole("heading", { name: "Edit the exam shift" })).toBeInTheDocument();
    const save = await screen.findByRole("button", { name: "Save the shift" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(examApi.updateSharedExamShift).toHaveBeenCalledWith("shift-9", expect.objectContaining({ examSubjectId: "exam-subject-1", name: "Old name", roomIds: ["room-1"] }), '"s-9"'));
    expect(examApi.createSharedExamShift).not.toHaveBeenCalled();
    expect(examApi.previewSharedExamShift).not.toHaveBeenCalled();
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

  it("keeps development markers out of the suggested paper code and name", async () => {
    examApi.getExamTypes.mockResolvedValue([{ examTypeId: "type-1", code: "DEV_FINAL", name: "Final (development)", isActive: true }]);
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({
      subjectId: "subject-1",
      semesterId: "semester-1",
      examTypeId: "type-1",
      // A draft saved before the fix holds the raw wording and must be cleaned too.
      paperCode: "SWE201-DEV_FINAL-FA26-01",
      paperName: "SWE201 Final (development) FA26 Paper 1",
    }));
    renderRoute(<ExamSetupRoute />);
    await waitFor(() => expect(screen.getByLabelText("Paper code")).toHaveValue("SWE201-FINAL-FA26-01"));
    expect(screen.getByLabelText("Paper name")).toHaveValue("SWE201 Final FA26 Paper 1");
  });

  it("shows the camera fallback only when a camera is required", async () => {
    sessionStorage.setItem("learnable:examiner:exam-preparation-v2", JSON.stringify({ subjectId: "subject-1", semesterId: "semester-1", examTypeId: "type-1", cameraRequired: false }));
    renderRoute(<ExamSetupRoute />);
    expect(await screen.findByText("No camera rule applies to this exam.")).toBeInTheDocument();
    expect(screen.queryByText("If a camera is unavailable")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Require a camera for this exam/ }));
    expect(await screen.findByText("If a camera is unavailable")).toBeInTheDocument();
  });

  it("does not render fixture candidates when no routed room id is available", async () => {
    renderRoute(<RoomMonitoringRoute />, ["/examiner/monitoring/room-1"]);
    expect(await screen.findByRole("heading", { name: "Room not found" })).toBeInTheDocument();
    expect(screen.queryByText("HE171004")).not.toBeInTheDocument();
  });
});

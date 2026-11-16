import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamScheduleDetailRoute } from "./ExamScheduleDetailRoute";

const exams = vi.hoisted(() => ({
  getExamSchedule: vi.fn(), getExamEnrollments: vi.fn(), getExamInvigilators: vi.fn(), getExamSeating: vi.fn(),
  getScheduleValidation: vi.fn(), getExamShifts: vi.fn(), publishExamSchedule: vi.fn(), cancelExamSchedule: vi.fn(),
  getSharedExamShift: vi.fn(async () => ({ shiftId: "shift-1", eTag: null })), getShiftPaperSelection: vi.fn(async () => null),
  getSealedExamPapers: vi.fn(async () => []), selectShiftPaper: vi.fn(), releaseShiftPaper: vi.fn(),
  deleteExamSchedule: vi.fn(), updateExamSchedule: vi.fn(),
}));
const admin = vi.hoisted(() => ({ getRoomSeats: vi.fn() }));
vi.mock("@/api/exams", () => exams);
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...admin }));

const iso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
const schedule = (status: string) => ({
  examScheduleId: "sch-1", examSubjectId: "es-1", examName: "CSD_FE", examShiftId: "shift-1", examRoomId: "room-1", roomName: "Lab Beta 204",
  startsAt: iso("2099-11-14", "07:10"), endsAt: iso("2099-11-14", "08:40"), entryOpensAt: iso("2099-11-14", "07:10"), entryClosesAt: iso("2099-11-14", "07:40"),
  status, examPaperId: null, invigilationSlotId: null, openedAt: null, openedBy: null, closedAt: null,
});

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/examiner/schedule/sch-1"]}>
        <Routes><Route path="/examiner/schedule/:scheduleId" element={<ExamScheduleDetailRoute />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  exams.getExamEnrollments.mockResolvedValue([
    { enrollmentId: "e1", examScheduleId: "sch-1", studentId: "s1", studentName: "Tran Quoc Toan", extraTimeMinutes: 15, accommodationNotes: null, registeredAt: "2026-11-01", status: "Registered" },
    { enrollmentId: "e2", examScheduleId: "sch-1", studentId: "s2", studentName: "Ronal Do", extraTimeMinutes: 0, accommodationNotes: null, registeredAt: "2026-11-01", status: "Registered" },
  ]);
  exams.getExamInvigilators.mockResolvedValue([
    { assignmentId: "a1", examScheduleId: "sch-1", lecturerId: "l1", lecturerName: "Lecturer One", assignmentRole: "Chief", assignedAt: "2026-11-01", status: "Active" },
  ]);
  exams.getExamSeating.mockResolvedValue([
    { studentExamSheetId: "x1", enrollmentId: "e1", studentId: "s1", seatId: "seat-1", seatCode: "A1", rowNumber: 1, columnNumber: 1, attendanceStatus: "NotCheckedIn" },
    { studentExamSheetId: "x2", enrollmentId: "e2", studentId: "s2", seatId: "seat-2", seatCode: "A2", rowNumber: 1, columnNumber: 2, attendanceStatus: "NotCheckedIn" },
  ]);
  exams.getExamShifts.mockResolvedValue({ items: [] });
  admin.getRoomSeats.mockResolvedValue([
    { seatId: "seat-1", seatCode: "A1", rowNumber: 1, columnNumber: 1, isAvailable: true, hasComputer: true, hasCamera: true },
    { seatId: "seat-2", seatCode: "A2", rowNumber: 1, columnNumber: 2, isAvailable: true, hasComputer: true, hasCamera: true },
    { seatId: "seat-3", seatCode: "A3", rowNumber: 1, columnNumber: 3, isAvailable: true, hasComputer: true, hasCamera: true },
  ]);
});

describe("exam schedule page", () => {
  it("shows a published schedule as ready, not as an error", async () => {
    exams.getExamSchedule.mockResolvedValue(schedule("Published"));
    exams.getScheduleValidation.mockResolvedValue({ isValid: false, errors: ["Schedule is not Draft."] });
    show();
    expect(await screen.findByRole("heading", { name: "CSD_FE" })).toBeInTheDocument();
    expect(screen.getByText("Published", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("07:10 – 08:40")).toBeInTheDocument();
    expect(screen.getByText("90 minutes in the room")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Students may enter from 07:10 to 07:40, leaving 60 minutes/ })).toBeInTheDocument();
    // The only "problem" the Backend names is that the schedule is no longer a draft, which is no problem.
    expect(screen.queryByText("Schedule is not Draft.")).not.toBeInTheDocument();
    expect(screen.queryByText("Action required")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish schedule" })).not.toBeInTheDocument();
  });

  it("lists the students with their seats and extra time, and the invigilators with their roles", async () => {
    exams.getExamSchedule.mockResolvedValue(schedule("Published"));
    exams.getScheduleValidation.mockResolvedValue({ isValid: true, errors: [] });
    show();
    const table = await screen.findByRole("table", { name: /Students of this schedule/ });
    expect(within(table).getByText("Tran Quoc Toan")).toBeInTheDocument();
    expect(within(table).getByText("+15 min")).toBeInTheDocument();
    expect(within(table).getAllByRole("row").map((row) => row.textContent)).toEqual(["StudentSeatStatus", "Tran Quoc Toan+15 minA1Registered", "Ronal DoA2Registered"]);
    // The chief is named in the summary tile and again in the list, where the role is shown.
    const invigilators = screen.getByRole("heading", { name: "Invigilators" }).closest("div") as HTMLElement;
    expect(within(invigilators).getByText("Lecturer One")).toBeInTheDocument();
    expect(within(invigilators).getByText("Chief")).toBeInTheDocument();
    expect(screen.getByText("1 with extra time")).toBeInTheDocument();
  });

  it("draws the seating plan of the room with the free seats", async () => {
    exams.getExamSchedule.mockResolvedValue(schedule("Published"));
    exams.getScheduleValidation.mockResolvedValue({ isValid: true, errors: [] });
    show();
    const plan = await screen.findByRole("region", { name: "Seating plan" });
    expect(await within(plan).findByLabelText("Seat A3, free")).toBeInTheDocument();
    expect(within(plan).getByLabelText("Seat A1, Tran Quoc Toan")).toBeInTheDocument();
    expect(screen.getByText("of 3 in the room")).toBeInTheDocument();
  });

  it("says what to fix on a draft, and keeps Publish switched off until it is ready", async () => {
    exams.getExamSchedule.mockResolvedValue(schedule("Draft"));
    exams.getScheduleValidation.mockResolvedValue({ isValid: false, errors: ["Selected rooms do not have enough suitable seats."] });
    show();
    expect(await screen.findByText("A few things to fix before publishing")).toBeInTheDocument();
    expect(screen.getByText("Selected rooms do not have enough suitable seats.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish schedule" })).toBeDisabled();
  });

  it("lets a ready draft be published", async () => {
    exams.getExamSchedule.mockResolvedValue(schedule("Draft"));
    exams.getScheduleValidation.mockResolvedValue({ isValid: true, errors: [] });
    show();
    expect(await screen.findByText("Ready to publish")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish schedule" })).toBeEnabled();
  });
});

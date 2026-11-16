import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AttendanceRoute } from "./AttendanceRoute";

const exams = vi.hoisted(() => ({
  getExamSeatMap: vi.fn(),
  getExamStudents: vi.fn(),
  getExamSchedule: vi.fn(),
  getExamPapers: vi.fn(async () => []),
  getShiftPaperSelection: vi.fn(),
  getSharedExamShift: vi.fn(),
  checkInStudent: vi.fn(async () => ({})),
  undoCheckInStudent: vi.fn(async () => ({})),
  checkOutStudent: vi.fn(async () => ({})),
  markStudentAbsent: vi.fn(async () => ({})),
  undoStudentAbsence: vi.fn(async () => ({})),
  openExamSchedule: vi.fn(async () => ({})),
  closeExamSchedule: vi.fn(async () => ({})),
}));
vi.mock("@/api/exams", () => exams);

const student = (id: string, name: string, overrides: Record<string, unknown> = {}) => ({
  enrollmentId: id, studentId: `s-${id}`, studentCode: `SE-${id}`, studentName: name, seatId: `seat-${id}`, seatCode: `A${id}`,
  attendanceStatus: "NotCheckedIn", checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null,
  attemptProgress: "Unknown", attemptId: null, absentAt: null, absentBy: null, absenceRecordedAutomatically: false, eTag: `"rev-${id}"`, ...overrides,
});

function load(status: "Published" | "Open", people: ReturnType<typeof student>[], attached = false, shared = false, shiftEnded = false) {
  if (shared) exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh" });
  else exams.getSharedExamShift.mockRejectedValue(new Error("not a shared shift"));
  const startsAt = new Date(Date.now() - (shiftEnded ? 120 : 30) * 60_000).toISOString();
  const endsAt = new Date(Date.now() + (shiftEnded ? -10 : 60) * 60_000).toISOString();
  exams.getExamSeatMap.mockResolvedValue({ examScheduleId: "sc", examShiftId: "sh", examRoomId: "r", roomName: "Lab 204", scheduleStatus: status, startsAt, endsAt, seats: people.map((p) => ({ seatId: p.seatId, seatCode: p.seatCode, rowNumber: 1, columnNumber: 1, isAvailable: true, hasComputer: true, hasCamera: true, student: p })) });
  exams.getExamStudents.mockResolvedValue({ items: people, totalCount: people.length, totalPages: 1, pageNumber: 1, pageSize: 50 });
  exams.getExamSchedule.mockResolvedValue({ examScheduleId: "sc", examSubjectId: "sub", examShiftId: "sh", status });
  exams.getShiftPaperSelection.mockResolvedValue(attached ? { selectionId: "a", shiftId: "sh", versionId: "v", operationId: "o", selectedAt: startsAt, releasedAt: null, consumedAt: null } : null);
  const router = createMemoryRouter([{ path: "/lecturer/exams/:examId/attendance", element: <AttendanceRoute /> }], { initialEntries: ["/lecturer/exams/sc/attendance"] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>);
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = () => {};
});
beforeEach(() => vi.clearAllMocks());

describe("Lecturer attendance", () => {
  it("checks a student in before the exam opens", async () => {
    const user = userEvent.setup();
    load("Published", [student("1", "An")]);
    const list = await screen.findByRole("region", { name: "Live student list" });
    await user.click(within(list).getByRole("button", { name: "Check in" }));
    await waitFor(() => expect(exams.checkInStudent).toHaveBeenCalledWith("sc", "1"));
  });

  it("locks check-in once the exam is open and offers to mark the missing student absent", async () => {
    const user = userEvent.setup();
    load("Open", [student("1", "An"), student("2", "Binh", { attendanceStatus: "Present" })]);
    expect(await screen.findByText(/Check-in is locked because the exam is open/)).toBeInTheDocument();
    const list = screen.getByRole("region", { name: "Live student list" });
    expect(within(list).queryByRole("button", { name: "Check in" })).not.toBeInTheDocument();
    await user.click(within(list).getByRole("button", { name: "Mark absent" }));
    await waitFor(() => expect(exams.markStudentAbsent).toHaveBeenCalledWith("sc", "1", '"rev-1"'));
  });

  it("undoes an absence with the student's ETag and says who recorded it", async () => {
    const user = userEvent.setup();
    load("Open", [student("1", "An", { attendanceStatus: "Absent", absenceRecordedAutomatically: false, absentAt: new Date().toISOString() })]);
    expect(await screen.findByText(/Marked absent by the lecturer/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo absence" }));
    await waitFor(() => expect(exams.undoStudentAbsence).toHaveBeenCalledWith("sc", "1", '"rev-1"'));
  });

  it("checks a student out only after they submitted", async () => {
    const user = userEvent.setup();
    load("Open", [student("1", "An", { attendanceStatus: "Present", attemptProgress: "Submitted" }), student("2", "Binh", { attendanceStatus: "Present", attemptProgress: "InProgress" })]);
    const list = await screen.findByRole("region", { name: "Live student list" });
    expect(within(list).getAllByRole("button", { name: "Check out" })).toHaveLength(1);
    await user.click(within(list).getByRole("button", { name: "Check out" }));
    await waitFor(() => expect(exams.checkOutStudent).toHaveBeenCalledWith("sc", "1"));
  });

  it("opens the exam without choosing a paper when a package is attached", async () => {
    const user = userEvent.setup();
    load("Published", [student("1", "An", { attendanceStatus: "Present" })], true);
    expect(await screen.findByText(/sealed exam package is attached/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open exam" }));
    await waitFor(() => expect(exams.openExamSchedule).toHaveBeenCalledWith("sc", undefined));
  });

  it("leaves opening a shared shift to the examiner", async () => {
    load("Published", [student("1", "An", { attendanceStatus: "Present" })], true, true);
    expect(await screen.findByText(/examiner opens this exam for every room at once/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open exam" })).not.toBeInTheDocument();
  });

  it("keeps the room open until the shift has ended", async () => {
    load("Open", [student("1", "An", { attendanceStatus: "Present", attemptProgress: "Submitted" })]);
    expect(await screen.findByRole("button", { name: "End the exam for this room" })).toBeDisabled();
    expect(screen.getByText(/Available once the shift ends/)).toBeInTheDocument();
  });

  it("ends the exam for the room after the shift ended and the lecturer confirms", async () => {
    const user = userEvent.setup();
    load("Open", [student("1", "An", { attendanceStatus: "Present", attemptProgress: "Submitted" })], false, false, true);
    await user.click(await screen.findByRole("button", { name: "End the exam for this room" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(exams.closeExamSchedule).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "End the exam" }));
    await waitFor(() => expect(exams.closeExamSchedule).toHaveBeenCalledWith("sc"));
  });

  it("counts students waiting for the exam", async () => {
    load("Published", [student("1", "An", { attendanceStatus: "Present" }), student("2", "Binh")]);
    const summary = await screen.findByRole("list", { name: "Seats" }).then(() => screen.getByLabelText("Attendance summary"));
    expect(within(summary).getByText("Waiting for the exam").nextElementSibling).toHaveTextContent("1");
    expect(within(summary).getByText("Not checked in").nextElementSibling).toHaveTextContent("1");
  });
});

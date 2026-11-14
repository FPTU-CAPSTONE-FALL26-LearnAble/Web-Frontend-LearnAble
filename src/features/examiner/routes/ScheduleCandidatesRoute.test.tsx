import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure } from "@/api/client";
import { ScheduleCandidatesRoute } from "./ScheduleCandidatesRoute";

const admin = vi.hoisted(() => ({ getAllStudentProfiles: vi.fn(), getAllStudentUsers: vi.fn(), getAllLecturerProfiles: vi.fn(), getRoomSeats: vi.fn() }));
const exams = vi.hoisted(() => ({
  getExamRooms: vi.fn(), previewBulkExamSchedules: vi.fn(), createBulkExamSchedules: vi.fn(),
  getSharedExamShift: vi.fn(), getShiftPaperSelection: vi.fn(), getExamSchedule: vi.fn(), getExamSubject: vi.fn(),
  addExamEnrollments: vi.fn(async () => []), setExamInvigilators: vi.fn(async () => []), autoAssignSeats: vi.fn(async () => []),
}));
const invigilation = vi.hoisted(() => ({ getInvigilationCandidates: vi.fn(), downloadStudentImportTemplate: vi.fn(), validateStudentImport: vi.fn() }));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...admin }));
vi.mock("@/api/exams", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/exams")>()), ...exams }));
vi.mock("@/api/invigilation", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/invigilation")>()), ...invigilation }));
vi.mock("@/shared/a11y/useRouteAnnouncer", () => ({ useRouteAnnouncer: vi.fn() }));

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const profile = (userId: string, status = "Studying") => ({ userId, enrollmentStatus: status, fullName: "Not available", studentCode: null, avatarUrl: null });
const account = (userId: string, fullName: string, userCode: string) => ({ userId, fullName, userCode });

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><ScheduleCandidatesRoute /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
    sharedShiftId: "shift-1", examSubjectId: "exam-subject-1", examRoomIds: ["room-1"],
    shiftName: "Morning", startsAt: "2026-11-14T09:00", endsAt: "2026-11-14T10:30", entryOpensAt: "2026-11-14T08:45", entryClosesAt: "2026-11-14T09:00",
  }));
  exams.getSharedExamShift.mockResolvedValue({ shiftId: "shift-1", scheduleIds: ["sch-1"], status: "Draft", examSubjectId: "exam-subject-1" });
  exams.getExamSchedule.mockResolvedValue({ examScheduleId: "sch-1", examRoomId: "room-1", roomName: "Lab 1" });
  exams.getShiftPaperSelection.mockResolvedValue(null);
  exams.getExamSubject.mockResolvedValue({ examSubjectId: "exam-subject-1", cameraRequired: false, cameraUnavailablePolicy: "Allow" });
  admin.getRoomSeats.mockResolvedValue([{ isAvailable: true, hasComputer: true, hasCamera: true }, { isAvailable: true, hasComputer: true, hasCamera: true }, { isAvailable: true, hasComputer: true, hasCamera: false }, { isAvailable: false, hasComputer: true, hasCamera: true }]);
  admin.getAllStudentProfiles.mockResolvedValue(page([profile("33333333-0000-0000-0000-000000000001"), profile("33333333-0000-0000-0000-000000000002", "Reserved"), profile("99999999-0000-0000-0000-000000000003")]));
  admin.getAllStudentUsers.mockResolvedValue(page([
    account("33333333-0000-0000-0000-000000000001", "Nguyễn Văn An", "HE170001"),
    account("33333333-0000-0000-0000-000000000002", "Trần Thị Bé", "HE170002"),
  ]));
  exams.getExamRooms.mockResolvedValue(page([]));
  admin.getAllLecturerProfiles.mockResolvedValue(page([]));
  admin.getRoomSeats.mockResolvedValue([]);
  invigilation.getInvigilationCandidates.mockResolvedValue(page([]));
});

describe("student list of the schedule step", () => {
  it("shows each student's real name and code from the user account, and a stand-in only when there is none", async () => {
    show();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText(/HE170001 · Studying/)).toBeInTheDocument();
    expect(screen.getByText("Trần Thị Bé")).toBeInTheDocument();
    expect(screen.getByText(/HE170002 · Reserved/)).toBeInTheDocument();
    // This student has no account in the list, so they are left out instead of shown by the start of an id.
    expect(screen.queryByText(/Student 99999999/)).not.toBeInTheDocument();
    expect(screen.queryByText(/99999999/)).not.toBeInTheDocument();
    expect(screen.getByText("2 of 2 students shown")).toBeInTheDocument();
    expect(admin.getAllStudentUsers).toHaveBeenCalled();
  });

  it("finds students by name without accents or by code, and selects only those shown", async () => {
    show();
    await screen.findByText("Nguyễn Văn An");
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "nguyen" } });
    expect(screen.queryByText("Trần Thị Bé")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 2 students shown")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select shown" }));
    expect(screen.getByText("1 selected for automatic room and seat allocation")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "he170002" } });
    expect(screen.getByText("Trần Thị Bé")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "zzz" } });
    expect(screen.getByText("No student matches this search.")).toBeInTheDocument();
  });

  it("lists no students rather than made-up ones when names cannot be read, and does not ask the user list again", async () => {
    admin.getAllStudentUsers.mockRejectedValue(new ApiFailure({ kind: "server", status: 403 }));
    const first = show();
    expect(await screen.findByText("No student names to show yet")).toBeInTheDocument();
    expect(screen.queryByText(/Student 33333333/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search students")).not.toBeInTheDocument();
    expect(admin.getAllStudentUsers).toHaveBeenCalledTimes(1);
    first.unmount();
    // Opening the step again in the same session does not repeat the refused request.
    show();
    expect(await screen.findByText("No student names to show yet")).toBeInTheDocument();
    expect(admin.getAllStudentUsers).toHaveBeenCalledTimes(1);
  });

  it("learns names and codes from a validated student list and keeps them for the session", async () => {
    admin.getAllStudentUsers.mockRejectedValue(new ApiFailure({ kind: "server", status: 403 }));
    invigilation.validateStudentImport.mockResolvedValue({
      totalRows: 1, validRows: 1, invalidRows: 0, errors: [],
      rows: [{ rowNumber: 2, studentCode: "HE170001", studentId: "33333333-0000-0000-0000-000000000001", fullName: "Nguyễn Văn An", isValid: true, errors: [] }],
    });
    const first = show();
    await screen.findByText("No student names to show yet");
    fireEvent.change(screen.getByLabelText("Import student list"), { target: { files: [new File(["x"], "students.xlsx")] } });
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText(/HE170001 · Studying/)).toBeInTheDocument();
    first.unmount();
    show();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();
  });
});

describe("student import report", () => {
  const chooseFile = () => fireEvent.change(screen.getByLabelText("Import student list"), { target: { files: [new File(["x"], "students.xlsx")] } });
  const row = (rowNumber: number, studentCode: string, isValid: boolean, studentId: string | null) => ({ rowNumber, studentCode, studentId, fullName: isValid ? "Nguyễn Văn An" : null, isValid, errors: [] });
  const withError = {
    totalRows: 2, validRows: 1, invalidRows: 1,
    errors: [{ rowNumber: 2, column: "Student Code", code: "STUDENT_NOT_FOUND", message: "Student code was not found in this university." }],
    rows: [row(2, "SE9999", false, null), row(3, "HE170001", true, "33333333-0000-0000-0000-000000000001")],
  };
  const clean = { totalRows: 1, validRows: 1, invalidRows: 0, errors: [], rows: [row(2, "HE170001", true, "33333333-0000-0000-0000-000000000001")] };

  it("names the code of a wrong row, and the error is gone once a corrected file is chosen", async () => {
    show();
    await screen.findByText("Nguyễn Văn An");
    invigilation.validateStudentImport.mockResolvedValueOnce(withError);
    chooseFile();
    expect(await screen.findByText("Row 2 · SE9999: SE9999 is not a student of your university.")).toBeInTheDocument();
    expect(screen.getByText("Check the code for a typo, or remove this row.")).toBeInTheDocument();
    // The Backend's own wording is replaced by the plain explanation.
    expect(screen.queryByText(/Student code was not found/)).not.toBeInTheDocument();
    expect(screen.getByText("1 valid · 1 invalid")).toBeInTheDocument();
    // The wrong row is removed from the file and the file is chosen again.
    invigilation.validateStudentImport.mockResolvedValueOnce(clean);
    chooseFile();
    expect(await screen.findByText("1 valid · 0 invalid")).toBeInTheDocument();
    expect(screen.queryByText(/is not a student of your university/)).not.toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    show();
    await screen.findByText("Nguyễn Văn An");
    invigilation.validateStudentImport.mockResolvedValueOnce(withError);
    chooseFile();
    await screen.findByText(/is not a student of your university/);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/is not a student of your university/)).not.toBeInTheDocument();
  });

  it("does not keep the last file's errors when the next file cannot be checked", async () => {
    show();
    await screen.findByText("Nguyễn Văn An");
    invigilation.validateStudentImport.mockResolvedValueOnce(withError);
    chooseFile();
    await screen.findByText(/is not a student of your university/);
    invigilation.validateStudentImport.mockRejectedValueOnce(new Error("bad file"));
    chooseFile();
    await vi.waitFor(() => expect(screen.queryByText(/is not a student of your university/)).not.toBeInTheDocument());
  });
});

describe("people step of a shared shift", () => {
  beforeEach(() => {
    sessionStorage.setItem("learnable:examiner:schedule-preparation-v3", JSON.stringify({
      sharedShiftId: "shift-1", examSubjectId: "exam-subject-1", examRoomIds: ["room-1"], shiftName: "Morning",
      startsAt: "2026-11-20T09:00", endsAt: "2026-11-20T10:30", entryOpensAt: "2026-11-20T08:45", entryClosesAt: "2026-11-20T09:00",
    }));
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "shift-1", scheduleIds: ["sch-1"], status: "Draft", examSubjectId: "exam-subject-1" });
    exams.getExamSchedule.mockResolvedValue({ examScheduleId: "sch-1", examRoomId: "room-1", roomName: "Lab 1" });
    admin.getRoomSeats.mockResolvedValue([{ isAvailable: true, hasComputer: true, hasCamera: true }, { isAvailable: true, hasComputer: true, hasCamera: true }, { isAvailable: true, hasComputer: true, hasCamera: false }, { isAvailable: false, hasComputer: true, hasCamera: true }]);
    admin.getAllLecturerProfiles.mockResolvedValue(page([{ userId: "lec-1", fullName: "Tran Lan", lecturerCode: "GV1" }]));
  });

  it("adds the students, invigilators and seats room by room instead of using a bulk schedule", async () => {
    exams.getShiftPaperSelection.mockResolvedValue({ selectionId: "a", shiftId: "shift-1", versionId: "v", operationId: "o", selectedAt: "2026-11-14T01:00:00Z", releasedAt: null, consumedAt: null });
    show();
    await screen.findByText("Nguyễn Văn An");
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(await screen.findByText("Tran Lan"));
    expect(await screen.findByText("1 students · 1 invigilators")).toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add people to the shift" });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() => expect(exams.addExamEnrollments).toHaveBeenCalledWith("sch-1", [{ studentId: "33333333-0000-0000-0000-000000000001", extraTimeMinutes: 0, accommodationNotes: null }]));
    expect(exams.setExamInvigilators).toHaveBeenCalledWith("sch-1", [{ lecturerId: "lec-1", assignmentRole: "Chief" }]);
    expect(exams.autoAssignSeats).toHaveBeenCalledWith("sch-1");
    expect(exams.createBulkExamSchedules).not.toHaveBeenCalled();
  });

  it("counts only seats with a computer, and with a camera when the exam blocks students without one", async () => {
    exams.getShiftPaperSelection.mockResolvedValue({ selectionId: "a", shiftId: "shift-1", versionId: "v", operationId: "o", selectedAt: "2026-11-14T01:00:00Z", releasedAt: null, consumedAt: null });
    exams.getExamSubject.mockResolvedValue({ examSubjectId: "exam-subject-1", cameraRequired: true, cameraUnavailablePolicy: "Block" });
    admin.getAllStudentProfiles.mockResolvedValue(page(["01", "02", "03"].map((n) => profile(`33333333-0000-0000-0000-0000000000${n}`))));
    admin.getAllStudentUsers.mockResolvedValue(page(["01", "02", "03"].map((n) => account(`33333333-0000-0000-0000-0000000000${n}`, `Student ${n}`, `HE1700${n}`))));
    show();
    await screen.findByText("Student 01");
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(await screen.findByText("Tran Lan"));
    expect(await screen.findByText("3 students need seats, but the rooms have 2.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add people to the shift" })).toBeDisabled();
  });

  it("asks for a package before any person can be added", async () => {
    exams.getShiftPaperSelection.mockResolvedValue(null);
    show();
    expect(await screen.findByText(/Attach a package to the shift first/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add people to the shift" })).toBeDisabled();
    expect(exams.createBulkExamSchedules).not.toHaveBeenCalled();
  });
});

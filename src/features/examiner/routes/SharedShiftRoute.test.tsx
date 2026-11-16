import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { SharedShiftRoute } from "./SharedShiftRoute";

const exams = vi.hoisted(() => ({
  getSharedExamShift: vi.fn(),
  getShiftPaperSelection: vi.fn(),
  getSealedExamPapers: vi.fn(async () => []),
  getExamSchedule: vi.fn(),
  getExamEnrollments: vi.fn(),
  getExamInvigilators: vi.fn(),
  getScheduleValidation: vi.fn(),
  selectShiftPaper: vi.fn(),
  releaseShiftPaper: vi.fn(),
  publishSharedExamShift: vi.fn(),
  openSharedExamShift: vi.fn(),
  cancelSharedExamShift: vi.fn(async () => ({})),
}));
vi.mock("@/api/exams", () => exams);

const attached = { selectionId: "a", shiftId: "sh", versionId: "v1", operationId: "o", selectedAt: "2026-11-14T01:00:00Z", releasedAt: null, consumedAt: null };

function show() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/examiner/schedule/shared/sh"]}>
        <Routes>
          <Route path="/examiner/schedule/shared/:shiftId" element={<SharedShiftRoute />} />
          <Route path="/examiner/schedule/new/candidates" element={<p>People step</p>} />
          <Route path="/examiner/schedule" element={<p>Schedule list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", name: "FE morning", startsAt: "2026-11-20T09:00:00Z", endsAt: "2026-11-20T10:30:00Z", status: "Draft", eTag: '"s-1"', scheduleIds: ["s1", "s2"], examSubjectId: "exam-1" });
  exams.getExamSchedule.mockImplementation(async (id: string) => ({ examScheduleId: id, examRoomId: `room-${id}`, roomName: id === "s1" ? "Lab 1" : "Lab 2" }));
  exams.getExamEnrollments.mockImplementation(async (id: string) => (id === "s1" ? [{ status: "Registered" }, { status: "Cancelled" }, { status: "Registered" }] : []));
  exams.getExamInvigilators.mockImplementation(async (id: string) => (id === "s1" ? [{ status: "Active" }] : []));
  exams.getScheduleValidation.mockImplementation(async (id: string) => (id === "s1" ? { isValid: true, errors: [] } : { isValid: false, errors: ["No invigilator is assigned."] }));
});

describe("SharedShiftRoute", () => {
  it("lists every room with its people and says what is wrong with a room", async () => {
    exams.getShiftPaperSelection.mockResolvedValue(attached);
    show();
    expect(await screen.findByRole("heading", { name: "FE morning" })).toBeInTheDocument();
    const rooms = await screen.findByRole("region", { name: "Rooms and people" });
    expect(await within(rooms).findByText("2 students · 1 invigilators")).toBeInTheDocument();
    expect(within(rooms).getByText("0 students · 0 invigilators")).toBeInTheDocument();
    expect(await within(rooms).findByText("Ready")).toBeInTheDocument();
    expect(await within(rooms).findByText("No invigilator is assigned.")).toBeInTheDocument();
  });

  it("holds the people step back until a package is attached", async () => {
    exams.getShiftPaperSelection.mockResolvedValue(null);
    show();
    const rooms = await screen.findByRole("region", { name: "Rooms and people" });
    await within(rooms).findByText("Lab 1");
    expect(within(rooms).getByRole("button", { name: "Add students and invigilators" })).toBeDisabled();
    expect(within(rooms).getByText(/Attach a package first/)).toBeInTheDocument();
  });

  it("carries the shift into the people step once a package is attached", async () => {
    const user = userEvent.setup();
    exams.getShiftPaperSelection.mockResolvedValue(attached);
    show();
    const rooms = await screen.findByRole("region", { name: "Rooms and people" });
    await within(rooms).findByText("Lab 2");
    const add = within(rooms).getByRole("button", { name: "Add students and invigilators" });
    await waitFor(() => expect(add).toBeEnabled());
    await user.click(add);
    expect(await screen.findByText("People step")).toBeInTheDocument();
    const draft = JSON.parse(sessionStorage.getItem("learnable:examiner:schedule-preparation-v3") ?? "{}");
    expect(draft).toMatchObject({ sharedShiftId: "sh", examSubjectId: "exam-1", examRoomIds: ["room-s1", "room-s2"] });
  });

  it("offers to change the rooms and times only while the shift is a draft", async () => {
    exams.getShiftPaperSelection.mockResolvedValue(null);
    show();
    expect(await screen.findByRole("link", { name: "Edit rooms and times" })).toHaveAttribute("href", "/examiner/schedule/new/details?edit=sh");
  });

  it("cancels the shift after the examiner confirms", async () => {
    const user = userEvent.setup();
    exams.getShiftPaperSelection.mockResolvedValue(attached);
    show();
    await user.click(await screen.findByRole("button", { name: "Cancel the shift" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(exams.cancelSharedExamShift).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Cancel the shift" }));
    await waitFor(() => expect(exams.cancelSharedExamShift).toHaveBeenCalledWith("sh", '"s-1"'));
    expect(await screen.findByText("Schedule list")).toBeInTheDocument();
  });

  it("shows how far the shift has come", async () => {
    exams.getShiftPaperSelection.mockResolvedValue(attached);
    exams.getSharedExamShift.mockResolvedValue({ shiftId: "sh", name: "FE morning", startsAt: "2026-11-20T09:00:00Z", endsAt: "2026-11-20T10:30:00Z", status: "Published", eTag: '"s-2"', scheduleIds: ["s1"], examSubjectId: "exam-1" });
    show();
    const progress = await screen.findByRole("list", { name: "Shift progress" });
    await waitFor(() => expect(within(progress).getByText("Attach a package").closest("li")).toHaveClass("bg-success"));
    expect(within(progress).getByText("Publish the shift").closest("li")).toHaveClass("bg-success");
    expect(within(progress).getByText("Open the exam").closest("li")).not.toHaveClass("bg-success");
  });
});

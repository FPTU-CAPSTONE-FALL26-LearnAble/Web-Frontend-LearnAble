import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GraderAssignmentPanel } from "./GraderAssignmentPanel";

const grading = vi.hoisted(() => ({ getScheduleGradingAssignments: vi.fn(), assignAttemptGrader: vi.fn(async () => undefined) }));
vi.mock("@/api/grading", () => grading);

const rows = [
  { enrollmentId: "e1", attemptId: "a1", fullName: "An", userCode: "SE1" },
  { enrollmentId: "e2", attemptId: "a2", fullName: "Binh", userCode: "SE2" },
  { enrollmentId: "e3", attemptId: "a3", fullName: "Chi", userCode: "SE3" },
] as never[];
const candidates = [{ lecturerId: "l1", userCode: "GV1", fullName: "Tran Thi Lan", departmentId: null }];
const assignment = (attemptId: string, extra: Record<string, unknown> = {}) => ({ attemptId, revision: `rev-${attemptId}`, lecturerId: null, assignedBy: null, assignedAt: null, assignmentNote: null, markingCompletedAt: null, ...extra });

function show() {
  const onChanged = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GraderAssignmentPanel scheduleId="s1" rows={rows} candidates={candidates} onChanged={onChanged} />
    </QueryClientProvider>,
  );
  return onChanged;
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = () => {};
});
beforeEach(() => vi.clearAllMocks());

describe("GraderAssignmentPanel", () => {
  it("warns while attempts have no grader", async () => {
    grading.getScheduleGradingAssignments.mockResolvedValue({ items: [assignment("a1"), assignment("a2", { lecturerId: "l1" }), assignment("a3")] });
    show();
    expect(await screen.findByText(/2 attempts have no grader yet/)).toBeInTheDocument();
    expect(screen.getByText("1 of 3 assigned")).toBeInTheDocument();
  });

  it("hands the chosen attempts to the chosen lecturer, each with its own revision", async () => {
    const user = userEvent.setup();
    grading.getScheduleGradingAssignments.mockResolvedValue({ items: [assignment("a1"), assignment("a2"), assignment("a3", { lecturerId: "l1" })] });
    const onChanged = show();
    await screen.findByRole("list", { name: "Attempts to grade" });
    await user.click(screen.getByRole("button", { name: "Select unassigned" }));
    await user.click(screen.getByLabelText("Grader"));
    await user.click(await screen.findByRole("option", { name: /Tran Thi Lan/ }));
    await user.click(screen.getByRole("button", { name: "Assign 2 selected" }));
    await waitFor(() => expect(grading.assignAttemptGrader).toHaveBeenCalledTimes(2));
    expect(grading.assignAttemptGrader).toHaveBeenCalledWith("a1", "rev-a1", { lecturerId: "l1" });
    expect(grading.assignAttemptGrader).toHaveBeenCalledWith("a2", "rev-a2", { lecturerId: "l1" });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("keeps an attempt whose marking is confirmed out of reach", async () => {
    grading.getScheduleGradingAssignments.mockResolvedValue({ items: [assignment("a1", { lecturerId: "l1", markingCompletedAt: "2026-11-13T01:00:00Z" })] });
    show();
    const list = await screen.findByRole("list", { name: "Attempts to grade" });
    expect(within(list).getByRole("checkbox", { name: "Select An" })).toBeDisabled();
    expect(within(list).getByText("Marking confirmed")).toBeInTheDocument();
  });

  it("shows nothing when no attempt needs a grader", async () => {
    grading.getScheduleGradingAssignments.mockResolvedValue({ items: [] });
    show();
    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading grading assignments" })).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Grader assignment" })).not.toBeInTheDocument();
  });
});

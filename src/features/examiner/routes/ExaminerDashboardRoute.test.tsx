import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

const exams = vi.hoisted(() => ({ getExamPaperBank: vi.fn(), getExamRooms: vi.fn(), getExamSchedules: vi.fn() }));
vi.mock("@/api/exams", () => exams);
vi.mock("@/shared/a11y/useRouteAnnouncer", () => ({ useRouteAnnouncer: vi.fn() }));

import { ExaminerDashboardRoute } from "./ExaminerDashboardRoute";

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const iso = (value: string) => new Date(value).toISOString();
const shift = (examScheduleId: string, examName: string, start: string, end: string, status: string, roomName = "Lab Alpha 302") => ({
  examScheduleId,
  examName,
  roomName,
  startsAt: iso(start),
  endsAt: iso(end),
  status,
});
const paper = (examPaperId: string, name: string, status: string, createdAt: string) => ({ examPaperId, name, paperCode: `${examPaperId}-CODE`, status, createdAt, examSubject: { name: "Software Engineering" } });
const room = (examRoomId: string, roomCode: string, name: string, capacity: number, isActive = true) => ({ examRoomId, roomCode, name, building: "Alpha", floor: 3, capacity, isActive });

function renderDashboard() {
  useAuthStore.setState({ user: { id: "e1", universityId: "uni-1", isSuperAdmin: false, fullName: "Mai Chi", email: "mai@fpt.edu.vn", role: "Examiner" } });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ExaminerDashboardRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const panel = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T10:00"));
  Object.values(exams).forEach((mock) => mock.mockReset());
  exams.getExamSchedules.mockResolvedValue(
    page([
      shift("morning", "SWE201 Final", "2026-11-09T09:30", "2026-11-09T11:00", "Open"),
      shift("afternoon", "PRF192 Practical", "2026-11-09T14:00", "2026-11-09T15:30", "Published", "Lab Beta 204"),
      shift("tomorrow", "MAD101 Final", "2026-11-10T09:00", "2026-11-10T10:30", "Draft"),
      shift("thursday", "DBI202 Final", "2026-11-12T07:10", "2026-11-12T08:40", "Published"),
      shift("old", "Last week", "2026-11-02T09:00", "2026-11-02T10:30", "Closed"),
      shift("cancelled", "Dropped exam", "2026-11-11T09:00", "2026-11-11T10:30", "Cancelled"),
    ]),
  );
  exams.getExamRooms.mockResolvedValue(page([room("r1", "A302", "Lab Alpha 302", 35), room("r2", "B204", "Lab Beta 204", 30), room("r3", "C101", "Hall C", 99, false)]));
  exams.getExamPaperBank.mockResolvedValue([
    paper("p1", "SWE201 Final Paper", "Draft", "2026-11-08T08:00:00Z"),
    paper("p2", "PRF192 Practical Paper", "Published", "2026-11-05T08:00:00Z"),
    paper("p3", "MAD101 Final Paper", "Published", "2026-11-01T08:00:00Z"),
  ]);
});
afterEach(() => vi.useRealTimers());

describe("ExaminerDashboardRoute", () => {
  it("greets by time of day and summarises today", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { level: 1, name: "Good morning, Mai Chi." })).toBeInTheDocument();
    expect(await screen.findByText(/Monday, 9 November 2026 · 2 exam shifts today · 1 open now · 1 still to start/)).toBeInTheDocument();
  });

  it("opens with three headline numbers that link to where they are managed", async () => {
    renderDashboard();
    const overview = await screen.findByRole("region", { name: "Overview" });
    await waitFor(() => expect(within(overview).getByRole("link", { name: /Exam papers/ })).toHaveTextContent("32 published · 1 draft"));
    expect(within(overview).getByRole("link", { name: /Exam shifts, next 30 days/ })).toHaveTextContent("41 open now");
    expect(within(overview).queryByText(/registration/i)).not.toBeInTheDocument();
    expect(within(overview).getByText("Active exam rooms").closest("li")).toHaveTextContent("2of 3 · 65 seats");
  });

  it("walks through the preparation stages with how far each has got", async () => {
    renderDashboard();
    const flow = await screen.findByRole("region", { name: "Exam preparation" });
    const steps = await within(flow).findAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(within(steps[0]).getByRole("heading", { name: "Build exam papers" })).toBeInTheDocument();
    expect(within(steps[0]).getByText("In progress")).toBeInTheDocument();
    expect(within(steps[0]).getByText("1 paper in draft · 2 published")).toBeInTheDocument();
    expect(within(steps[1]).getByText("4 shifts in the next 30 days · 1 not published")).toBeInTheDocument();
    expect(within(steps[2]).getByText("Live")).toBeInTheDocument();
    expect(within(steps[2]).getByRole("link", { name: "Live monitoring" })).toHaveAttribute("href", "/examiner/monitoring");
    expect(within(steps[2]).getByRole("link", { name: "Grade release" })).toHaveAttribute("href", "/examiner/results");
  });

  it("stays full of useful content when nothing is scheduled yet", async () => {
    exams.getExamSchedules.mockResolvedValue(page([]));
    renderDashboard();
    const overview = await screen.findByRole("region", { name: "Overview" });
    await waitFor(() => expect(within(overview).getByRole("link", { name: /Exam shifts, next 30 days/ })).toHaveTextContent("0None scheduled"));
    const flow = panel("Exam preparation");
    expect(await within(flow).findByText("No exam shifts planned in the next 30 days. Pick a published paper, rooms and candidates.")).toBeInTheDocument();
    expect(within(flow).getAllByText("Not started")).toHaveLength(1);
    const shifts = panel("Exam shifts");
    expect(within(shifts).getByText("No exam shifts in the next 30 days")).toBeInTheDocument();
    expect(within(shifts).getByRole("link", { name: "Create schedule" })).toHaveAttribute("href", "/examiner/schedule/new/details");
    expect(await within(panel("Exam papers")).findByText("SWE201 Final Paper")).toBeInTheDocument();
    expect(await within(panel("Exam rooms")).findByText("A302 · Lab Alpha 302")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Lecturer registration" })).not.toBeInTheDocument();
  });

  it("lists today's shifts with where they run and how they stand", async () => {
    renderDashboard();
    const shifts = await screen.findByRole("region", { name: "Exam shifts" });
    expect(await within(shifts).findByText("SWE201 Final")).toBeInTheDocument();
    expect(within(shifts).getByText("09:30")).toBeInTheDocument();
    expect(within(shifts).getByText("to 11:00")).toBeInTheDocument();
    expect(within(shifts).getByText("In progress · ends 11:00")).toBeInTheDocument();
    expect(within(shifts).getByText("Starts in 4h")).toBeInTheDocument();
    expect(within(shifts).getByText("Lab Beta 204")).toBeInTheDocument();
    expect(within(shifts).getByRole("link", { name: "Details: SWE201 Final" })).toHaveAttribute("href", "/examiner/schedule/morning");
  });

  it("groups the days ahead and leaves out cancelled and past shifts", async () => {
    renderDashboard();
    const shifts = await screen.findByRole("region", { name: "Exam shifts" });
    expect(await within(shifts).findByRole("heading", { level: 4, name: "Tomorrow" })).toBeInTheDocument();
    expect(within(shifts).getByRole("heading", { level: 4, name: "Thu 12 Nov" })).toBeInTheDocument();
    expect(within(shifts).getByText("MAD101 Final")).toBeInTheDocument();
    expect(within(shifts).getByText("DBI202 Final")).toBeInTheDocument();
    expect(within(shifts).queryByText("Dropped exam")).not.toBeInTheDocument();
    expect(within(shifts).queryByText("Last week")).not.toBeInTheDocument();
  });

  it("asks only for the shifts of the next 30 days, in pages the Backend accepts", async () => {
    renderDashboard();
    await screen.findByText("SWE201 Final");
    const filters = exams.getExamSchedules.mock.calls[0][0];
    expect(filters).toMatchObject({ Page: 1, PageSize: 100, From: iso("2026-11-09T00:00") });
    expect(new Date(filters.To).getTime() - new Date(filters.From).getTime()).toBe(31 * 86_400_000);
  });

  it("says when there is nothing today and points to the next shift", async () => {
    exams.getExamSchedules.mockResolvedValue(page([shift("tomorrow", "MAD101 Final", "2026-11-10T09:00", "2026-11-10T10:30", "Published")]));
    renderDashboard();
    expect(await screen.findByText(/No exam shifts today\. Next: Tomorrow, 09:00 · MAD101 Final\./)).toBeInTheDocument();
    expect(await screen.findByText(/Monday, 9 November 2026 · No exam shifts today/)).toBeInTheDocument();
  });

  it("shows what needs attention and where to fix it", async () => {
    renderDashboard();
    const attention = await screen.findByRole("region", { name: "Needs attention" });
    await waitFor(() => expect(within(attention).getByRole("link", { name: /Exam papers in draft/ })).toHaveAttribute("href", "/examiner/exams"));
    expect(within(attention).getByRole("link", { name: /Schedules not published/ })).toHaveAttribute("href", "/examiner/schedule");
    expect(within(attention).queryByText(/registration/i)).not.toBeInTheDocument();
  });

  it("offers a quick jump to what needs attention", async () => {
    renderDashboard();
    expect(await screen.findByRole("link", { name: "2 items need attention" })).toHaveAttribute("href", "#needs-attention");
    expect(screen.getByRole("region", { name: "Needs attention" })).toHaveAttribute("id", "needs-attention");
  });

  it("reassures when nothing needs attention", async () => {
    exams.getExamSchedules.mockResolvedValue(page([]));
    exams.getExamPaperBank.mockResolvedValue([paper("p1", "Only paper", "Published", "2026-11-05T08:00:00Z")]);
    renderDashboard();
    expect(await screen.findByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("shows the newest papers with their state, beside the split by status", async () => {
    renderDashboard();
    const papers = await screen.findByRole("region", { name: "Exam papers" });
    expect(await within(papers).findByRole("img", { name: "Draft 1, Published 2, Archived 0" })).toBeInTheDocument();
    const rows = within(papers).getAllByRole("listitem").filter((item) => item.textContent?.includes("Paper"));
    expect(rows.map((row) => within(row).getByText(/Paper$/).textContent)).toEqual(["SWE201 Final Paper", "PRF192 Practical Paper", "MAD101 Final Paper"]);
    expect(within(rows[0]).getByText("Draft", { selector: "span" })).toBeInTheDocument();
    expect(within(rows[0]).getByText("p1-CODE · Software Engineering · 8 Nov 2026")).toBeInTheDocument();
  });

  it("shows the rooms with their seats and state", async () => {
    renderDashboard();
    const rooms = screen.getByRole("region", { name: "Exam rooms" });
    expect(await within(rooms).findByText("A302 · Lab Alpha 302")).toBeInTheDocument();
    expect(within(rooms).getByText("Alpha · Floor 3 · 35 seats")).toBeInTheDocument();
    expect(within(rooms).getAllByText("Active")).toHaveLength(2);
    expect(within(rooms).getByText("Inactive")).toBeInTheDocument();
  });

  it("keeps the rest of the page working when schedules fail, and can retry", async () => {
    exams.getExamSchedules.mockRejectedValueOnce(new Error("down")).mockResolvedValue(page([shift("morning", "SWE201 Final", "2026-11-09T09:30", "2026-11-09T11:00", "Open")]));
    const user = userEvent.setup({ advanceTimers: () => undefined });
    renderDashboard();
    const shifts = await screen.findByRole("region", { name: "Exam shifts" });
    expect(await within(shifts).findByText("Exam schedules are temporarily unavailable.")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Draft 1, Published 2, Archived 0" })).toBeInTheDocument();
    expect(await within(panel("Exam preparation")).findByText("Exam schedules could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByText(/exam shifts? today/)).not.toBeInTheDocument();
    await user.click(within(shifts).getByRole("button", { name: "Try again" }));
    expect(await within(shifts).findByText("SWE201 Final")).toBeInTheDocument();
  });

  it("keeps schedules visible when the paper list fails", async () => {
    exams.getExamPaperBank.mockRejectedValue(new Error("down"));
    renderDashboard();
    expect(await screen.findByText("SWE201 Final")).toBeInTheDocument();
    expect(await within(panel("Exam papers")).findByText("Exam papers are temporarily unavailable.")).toBeInTheDocument();
    expect(await within(panel("Needs attention")).findByText("Some items could not be checked.")).toBeInTheDocument();
  });

  it("announces loading while data is on its way", () => {
    exams.getExamSchedules.mockReturnValue(new Promise(() => undefined));
    renderDashboard();
    expect(within(panel("Exam shifts")).getByRole("status")).toHaveTextContent("Loading…");
    expect(within(panel("Overview")).getAllByText("Loading…").length).toBeGreaterThan(0);
  });

  it("offers the two ways to start new work", async () => {
    renderDashboard();
    expect(await screen.findByRole("link", { name: "Create schedule" })).toHaveAttribute("href", "/examiner/schedule/new/details");
    expect(screen.getByRole("link", { name: "Create exam paper" })).toHaveAttribute("href", "/examiner/exams/new/setup");
  });
});

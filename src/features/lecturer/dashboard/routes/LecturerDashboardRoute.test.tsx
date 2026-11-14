import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

const api = vi.hoisted(() => ({ getQuestions: vi.fn(), getMaterials: vi.fn(), getMyExamSchedules: vi.fn() }));
vi.mock("@/api/lecturer", () => ({ getQuestions: api.getQuestions, getMaterials: api.getMaterials }));
vi.mock("@/api/exams", () => ({ getMyExamSchedules: api.getMyExamSchedules }));
vi.mock("@/shared/a11y/useRouteAnnouncer", () => ({ useRouteAnnouncer: vi.fn() }));

import { LecturerDashboardRoute } from "./LecturerDashboardRoute";

const page = <T,>(items: T[], totalCount = items.length) => ({ items, pageNumber: 1, pageSize: 100, totalCount, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const iso = (value: string) => new Date(value).toISOString();
const shift = (examScheduleId: string, examName: string, start: string, end: string, status: string, invigilatorRole: "Chief" | "Assistant" | null = "Chief") => ({
  schedule: { examScheduleId, examName, roomName: "Lab Alpha 302", startsAt: iso(start), endsAt: iso(end), status },
  seatCode: null,
  invigilatorRole,
});
const question = (questionId: string, content: string, status: string) => ({ questionId, content, questionType: "Single", difficulty: "Medium", status, createdAt: "2026-11-08T08:00:00Z" });
const material = (materialId: string, title: string, status: string) => ({ materialId, title, materialType: "PDF", status, uploadedAt: "2026-11-07T08:00:00Z" });

/** Counts for a status filter, and the newest items when no status is asked for. */
const library = (totals: Record<string, number>, recent: unknown[]) => async (filters: { Status?: string }) =>
  filters.Status ? page([], totals[filters.Status] ?? 0) : page(recent, Object.values(totals).reduce((sum, count) => sum + count, 0));

function renderDashboard() {
  useAuthStore.setState({ user: { id: "lecturer-1", fullName: "Dr. Nguyen Van A", email: "lecturer@fpt.edu.vn", role: "Lecturer", universityId: "uni-1" } });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <LecturerDashboardRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const region = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T10:00"));
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getQuestions.mockImplementation(library({ Active: 12, Draft: 3, Archived: 1 }, [question("q1", "Which process model is iterative?", "Active"), question("q2", "Define coupling and cohesion", "Draft")]));
  api.getMaterials.mockImplementation(library({ Published: 4, Draft: 2 }, [material("m1", "Week 1 slides", "Published"), material("m2", "Lab handout", "Draft")]));
  api.getMyExamSchedules.mockResolvedValue(
    page([
      shift("live", "SWE201 Final", "2026-11-09T09:30", "2026-11-09T11:00", "Open"),
      shift("afternoon", "PRF192 Practical", "2026-11-09T14:00", "2026-11-09T15:30", "Published", "Assistant"),
      shift("thursday", "DBI202 Final", "2026-11-12T07:10", "2026-11-12T08:40", "Published"),
      shift("cancelled", "Dropped exam", "2026-11-11T09:00", "2026-11-11T10:30", "Cancelled"),
      shift("old", "Last week", "2026-11-02T09:00", "2026-11-02T10:30", "Closed"),
    ]),
  );
});
afterEach(() => vi.useRealTimers());

describe("LecturerDashboardRoute", () => {
  it("greets by time of day with today's date", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { level: 1, name: "Good morning, Dr. Nguyen Van A." })).toBeInTheDocument();
    expect(screen.getByText("Monday, 9 November 2026")).toBeInTheDocument();
  });

  it("opens with three headline numbers that link to where they are managed", async () => {
    renderDashboard();
    const overview = await screen.findByRole("region", { name: "Overview" });
    await waitFor(() => expect(within(overview).getByRole("link", { name: /Questions/ })).toHaveTextContent("1612 active · 3 draft"));
    expect(within(overview).getByRole("link", { name: /Learning materials/ })).toHaveTextContent("64 published · 2 draft");
    expect(within(overview).getByRole("link", { name: /Invigilation shifts, next 30 days/ })).toHaveTextContent("3One in progress now");
    expect(within(overview).queryByText(/registration/i)).not.toBeInTheDocument();
  });

  it("features the shift in progress and links to its attendance", async () => {
    renderDashboard();
    const next = await screen.findByRole("region", { name: "Next invigilation shift" });
    await within(next).findByText("SWE201 Final");
    expect(within(next).getByText("09:30")).toBeInTheDocument();
    expect(within(next).getByText("In progress · ends 11:00")).toBeInTheDocument();
    expect(within(next).getByText("Chief invigilator")).toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "Open attendance" })).toHaveAttribute("href", "/lecturer/exams/live/attendance");
  });

  it("features the next shift once nothing is in progress", async () => {
    vi.setSystemTime(new Date("2026-11-09T12:00"));
    renderDashboard();
    const next = await screen.findByRole("region", { name: "Next invigilation shift" });
    await within(next).findByText("PRF192 Practical");
    expect(within(next).getByText("Starts in 2h")).toBeInTheDocument();
    expect(within(next).getByText("Assistant invigilator")).toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "View shift" })).toHaveAttribute("href", "/lecturer/exams/afternoon/attendance");
  });

  it("lists the schedule by day without cancelled or past shifts", async () => {
    renderDashboard();
    const schedule = await screen.findByRole("region", { name: "Your schedule" });
    await within(schedule).findByRole("heading", { level: 3, name: "Today" });
    expect(within(schedule).getByRole("heading", { level: 3, name: "Thu 12 Nov" })).toBeInTheDocument();
    expect(within(schedule).getByText("PRF192 Practical")).toBeInTheDocument();
    expect(within(schedule).getByText("DBI202 Final")).toBeInTheDocument();
    expect(within(schedule).queryByText("Dropped exam")).not.toBeInTheDocument();
    expect(within(schedule).queryByText("Last week")).not.toBeInTheDocument();
  });

  it("asks only for the shifts of the next 30 days, in pages the Backend accepts", async () => {
    renderDashboard();
    await screen.findByText("DBI202 Final");
    expect(api.getMyExamSchedules.mock.calls[0][0]).toMatchObject({ Page: 1, PageSize: 100, From: iso("2026-11-09T00:00") });
  });

  it("stays full of useful content when there is nothing at all", async () => {
    api.getMyExamSchedules.mockResolvedValue(page([]));
    api.getQuestions.mockImplementation(library({}, []));
    api.getMaterials.mockImplementation(library({}, []));
    renderDashboard();
    const overview = await screen.findByRole("region", { name: "Overview" });
    await waitFor(() => expect(within(overview).getByRole("link", { name: /Questions/ })).toHaveTextContent("00 active · 0 draft"));
    expect(await within(region("Next invigilation shift")).findByText("You have no upcoming invigilation shifts.")).toBeInTheDocument();
    expect(within(region("Your schedule")).getByText("Nothing is scheduled for you in the next 30 days.")).toBeInTheDocument();
    expect(await within(region("Question bank")).findByText("No questions yet")).toBeInTheDocument();
    expect(within(region("Learning materials")).getByText("No learning materials yet")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Shift registration" })).not.toBeInTheDocument();
    expect(within(region("Shortcuts")).getAllByRole("link")).toHaveLength(5);
  });

  it("explains how shifts arrive when none are assigned", async () => {
    api.getMyExamSchedules.mockResolvedValue(page([]));
    renderDashboard();
    expect(await screen.findByText("Shifts appear here once an examiner assigns you to an exam.")).toBeInTheDocument();
  });

  it("shows what needs attention", async () => {
    renderDashboard();
    const attention = await screen.findByRole("region", { name: "Needs your attention" });
    expect(await within(attention).findByRole("link", { name: /Draft questions/ })).toHaveTextContent("3");
    expect(within(attention).queryByText(/registration/i)).not.toBeInTheDocument();
    expect(within(attention).getByRole("link", { name: /Draft learning materials/ })).toHaveTextContent("2");
  });

  it("offers a quick jump to what needs attention", async () => {
    renderDashboard();
    expect(await screen.findByRole("link", { name: "2 items need attention" })).toHaveAttribute("href", "#needs-attention");
    expect(screen.getByRole("region", { name: "Needs your attention" })).toHaveAttribute("id", "needs-attention");
  });

  it("reassures when nothing needs attention", async () => {
    api.getQuestions.mockImplementation(library({ Active: 5 }, []));
    api.getMaterials.mockImplementation(library({ Published: 1 }, []));
    renderDashboard();
    expect(await screen.findByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("shows the question bank by status with the newest questions", async () => {
    renderDashboard();
    const bank = await screen.findByRole("region", { name: "Question bank" });
    expect(await within(bank).findByRole("img", { name: "Active 12, Draft 3, Archived 1" })).toBeInTheDocument();
    expect(within(bank).getByText("Which process model is iterative?")).toBeInTheDocument();
    expect(within(bank).getAllByText("Single · Medium · 8 Nov 2026")).toHaveLength(2);
    const draftRow = within(bank).getByText("Define coupling and cohesion").closest("li")!;
    expect(within(draftRow).getByText("Draft")).toBeInTheDocument();
    expect(within(bank).getByRole("link", { name: "Import questions" })).toHaveAttribute("href", "/lecturer/questions/import");
  });

  it("shows the learning materials by status with the newest uploads", async () => {
    renderDashboard();
    const library = await screen.findByRole("region", { name: "Learning materials" });
    expect(await within(library).findByRole("img", { name: "Published 4, Draft 2, Archived 0" })).toBeInTheDocument();
    expect(within(library).getByText("Week 1 slides")).toBeInTheDocument();
    expect(within(library).getAllByText("PDF · 7 Nov 2026")).toHaveLength(2);
  });

  it("asks for the newest items, and counts materials by the signed-in lecturer, not by university", async () => {
    renderDashboard();
    await screen.findByRole("img", { name: "Published 4, Draft 2, Archived 0" });
    expect(api.getQuestions).toHaveBeenCalledWith(expect.objectContaining({ PageSize: 5, SortBy: "-createdAt" }));
    expect(api.getMaterials).toHaveBeenCalledWith(expect.objectContaining({ UploadedBy: "lecturer-1", PageSize: 5, SortBy: "-uploadedAt" }));
    expect(api.getMaterials.mock.calls.every(([filters]) => filters.UploadedBy === "lecturer-1")).toBe(true);
    expect(api.getMaterials.mock.calls.map(([filters]) => filters.Status).filter(Boolean).sort()).toEqual(["Archived", "Draft", "Published"]);
  });

  it("links the jobs a lecturer does most", async () => {
    renderDashboard();
    const shortcuts = await screen.findByRole("region", { name: "Shortcuts" });
    expect(within(shortcuts).getByRole("link", { name: /Import questions/ })).toHaveAttribute("href", "/lecturer/questions/import");
    expect(within(shortcuts).getByRole("link", { name: /Grade essay answers/ })).toHaveAttribute("href", "/lecturer/grading");
  });

  it("keeps the libraries visible when schedules are unavailable, and can retry", async () => {
    api.getMyExamSchedules.mockRejectedValueOnce(new Error("Schedule service unavailable")).mockResolvedValue(page([shift("live", "SWE201 Final", "2026-11-09T09:30", "2026-11-09T11:00", "Open")]));
    const user = userEvent.setup({ advanceTimers: () => undefined });
    renderDashboard();
    const next = await screen.findByRole("region", { name: "Next invigilation shift" });
    expect(await within(next).findByText("Exam schedules are temporarily unavailable.")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Active 12, Draft 3, Archived 1" })).toBeInTheDocument();
    await user.click(within(next).getByRole("button", { name: "Try again" }));
    expect(await within(next).findByText("SWE201 Final")).toBeInTheDocument();
  });

  it("keeps schedules visible when the question counts fail", async () => {
    api.getQuestions.mockRejectedValue(new Error("down"));
    renderDashboard();
    expect(await screen.findByText("DBI202 Final")).toBeInTheDocument();
    expect(await within(region("Question bank")).findByText("Question counts are temporarily unavailable.")).toBeInTheDocument();
    expect(await within(region("Needs your attention")).findByText("Some items could not be checked.")).toBeInTheDocument();
  });

  it("announces loading while data is on its way", () => {
    api.getMyExamSchedules.mockReturnValue(new Promise(() => undefined));
    renderDashboard();
    expect(within(region("Next invigilation shift")).getByRole("status")).toHaveTextContent("Loading…");
    expect(within(region("Overview")).getAllByText("Loading…").length).toBeGreaterThan(0);
  });

  it("offers the two ways to add content", async () => {
    renderDashboard();
    expect(await screen.findByRole("link", { name: "Create question" })).toHaveAttribute("href", "/lecturer/questions/new?purpose=exam");
    await waitFor(() => expect(screen.getByRole("link", { name: "Upload material" })).toHaveAttribute("href", "/lecturer/materials/new"));
  });
});

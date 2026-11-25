import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { getMyExamSchedules, type MyExamSchedule } from "@/api/exams";
import { getMyExamResult, type ExamResult } from "@/api/results";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { ResultDetailRoute } from "./ResultDetailRoute";
import { ResultsListRoute } from "./ResultsListRoute";

vi.mock("@/api/exams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/exams")>()),
  getMyExamSchedules: vi.fn(),
}));
vi.mock("@/api/results", () => ({ getMyExamResult: vi.fn() }));

const DAY = 24 * 3_600_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();
const exam = (id: string, days: number, status: MyExamSchedule["schedule"]["status"]): MyExamSchedule => ({
  schedule: {
    examScheduleId: id,
    examSubjectId: "subject",
    examName: `Exam ${id}`,
    examShiftId: "shift",
    examRoomId: "room",
    roomName: "FPTU-EXAM-902",
    startsAt: iso(days * DAY),
    endsAt: iso(days * DAY + 5_400_000),
    entryOpensAt: iso(days * DAY - 1_800_000),
    entryClosesAt: iso(days * DAY + 900_000),
    status,
  },
  seatCode: "A-12",
});
const paged = (items: MyExamSchedule[]) => ({
  items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false,
});
const result = (scheduleId: string, overrides: Partial<ExamResult> = {}): ExamResult => ({
  scheduleId, score: 8, maxScore: 10, scoreOnTen: null, passed: null, status: "graded", submittedAt: null, releasedAt: null, ...overrides,
});

function view(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/results", element: <main><ResultsListRoute /></main> },
      { path: "/results/:scheduleId", element: <main><ResultDetailRoute /></main> },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("student exam results", () => {
  beforeEach(() => {
    vi.mocked(getMyExamSchedules).mockReset();
    vi.mocked(getMyExamResult).mockReset();
  });

  it("lists finished exams with their result, and says when one is not released", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(
      paged([exam("graded", -10, "Closed"), exam("waiting", -3, "Closed"), exam("upcoming", 4, "Published"), exam("cancelled", -5, "Cancelled")]),
    );
    vi.mocked(getMyExamResult).mockImplementation(async (id) => (id === "graded" ? result(id) : null));
    const { container } = view("/results");

    const list = await screen.findByRole("list", { name: "Exam result list" });
    expect(await within(list).findByText("8/10 points")).toBeInTheDocument();
    const rows = within(list).getAllByRole("article");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual(["Exam waiting", "Exam graded"]);
    expect(within(rows[0]).getByText("Result not released yet")).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("link")).not.toBeInTheDocument();
    expect(within(rows[1]).getByText("Graded")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "View details: Exam graded" })).toHaveAttribute("href", "/results/graded");
    expect(getMyExamResult).toHaveBeenCalledTimes(2);

    await expectNoAxeViolations(container);
  });

  it("says so when no exam has finished yet", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("upcoming", 4, "Published")]));
    view("/results");
    expect(await screen.findByText("No exam results yet")).toBeInTheDocument();
    expect(getMyExamResult).not.toHaveBeenCalled();
  });

  it("reports a failed schedule load in words", async () => {
    vi.mocked(getMyExamSchedules).mockRejectedValue(new Error("down"));
    view("/results");
    expect(await screen.findByRole("alert")).toHaveTextContent("Your exam results could not be loaded.");
  });

  it("keeps the list when one result fails, and says which", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("broken", -3, "Closed")]));
    vi.mocked(getMyExamResult).mockRejectedValue(new Error("down"));
    view("/results");
    expect(await screen.findByText("This result could not be loaded.")).toBeInTheDocument();
  });

  it("shows the score and state of one result", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("graded", -10, "Closed")]));
    vi.mocked(getMyExamResult).mockResolvedValue(result("graded", { status: "pending", score: 6.5 }));
    const { container } = view("/results/graded");
    expect(await screen.findByRole("heading", { level: 1, name: "Exam graded" })).toBeInTheDocument();
    expect(screen.getByText("6.5/10 points")).toBeInTheDocument();
    expect(screen.getByText("Awaiting grading")).toBeInTheDocument();
    expect(screen.getByText("This exam is still being graded. The score may change.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to exam results" })).toHaveAttribute("href", "/results");
    expect(vi.mocked(getMyExamResult).mock.calls[0][0]).toBe("graded");
    await expectNoAxeViolations(container);
  });

  it("writes out the score out of ten and whether the exam was passed", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("graded", -10, "Closed")]));
    vi.mocked(getMyExamResult).mockResolvedValue(result("graded", { score: 7.5, scoreOnTen: 7.5, passed: true }));
    view("/results/graded");
    expect(await screen.findByText("7.5/10 points")).toBeInTheDocument();
    expect(screen.getByText("7.5 out of 10")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Graded")).toBeInTheDocument();
  });

  it("explains a result that is not released", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("waiting", -3, "Closed")]));
    vi.mocked(getMyExamResult).mockResolvedValue(null);
    view("/results/waiting");
    expect(await screen.findByText("The result of this exam has not been released to students yet.")).toBeInTheDocument();
  });
});

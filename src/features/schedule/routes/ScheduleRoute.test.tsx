import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { getMyExamSchedules, type MyExamSchedule } from "@/api/exams";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { formatExamDate, formatExamTime, groupSchedules } from "@/features/schedule/scheduleView";
import { ScheduleRoute } from "./ScheduleRoute";

vi.mock("@/api/exams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/exams")>()),
  getMyExamSchedules: vi.fn(),
}));

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const exam = (
  id: string,
  startOffset: number,
  overrides: Partial<MyExamSchedule["schedule"]> = {},
  seatCode: string | null = "A-12",
): MyExamSchedule => ({
  schedule: {
    examScheduleId: id,
    examSubjectId: "subject",
    examName: `Exam ${id}`,
    examShiftId: "shift",
    examRoomId: "room",
    roomName: "FPTU-EXAM-902",
    startsAt: iso(startOffset),
    endsAt: iso(startOffset + 1.5 * HOUR),
    entryOpensAt: iso(startOffset - 0.5 * HOUR),
    entryClosesAt: iso(startOffset + 0.25 * HOUR),
    status: "Published",
    ...overrides,
  },
  seatCode,
});

const paged = (items: MyExamSchedule[]) => ({
  items,
  pageNumber: 1,
  pageSize: 100,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

function view() {
  const router = createMemoryRouter([{ path: "/", element: <main><ScheduleRoute /></main> }]);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("groupSchedules", () => {
  it("orders upcoming exams soonest first and past exams most recent first", () => {
    const groups = groupSchedules([
      exam("later", 5 * DAY),
      exam("old", -20 * DAY, { status: "Closed" }),
      exam("soon", 2 * DAY),
      exam("recent", -3 * DAY, { status: "Closed" }),
    ]);
    expect(groups.upcoming.map((item) => item.schedule.examScheduleId)).toEqual(["soon", "later"]);
    expect(groups.past.map((item) => item.schedule.examScheduleId)).toEqual(["recent", "old"]);
  });

  it("keeps an exam that is running now under upcoming", () => {
    const groups = groupSchedules([exam("running", -0.5 * HOUR, { status: "Open" })]);
    expect(groups.upcoming).toHaveLength(1);
    expect(groups.past).toHaveLength(0);
  });
});

describe("ScheduleRoute", () => {
  beforeEach(() => vi.mocked(getMyExamSchedules).mockReset());

  it("shows each upcoming exam with its date, time, room, seat and status in words", async () => {
    const next = exam("next", 2 * DAY);
    vi.mocked(getMyExamSchedules).mockResolvedValue(
      paged([exam("later", 6 * DAY, { status: "Cancelled" }, null), next, exam("done", -10 * DAY, { status: "Closed" })]),
    );
    const { container } = view();

    const upcoming = await screen.findByRole("region", { name: "Upcoming exams" });
    expect(within(upcoming).getByText("2 upcoming exams")).toBeInTheDocument();
    const cards = within(upcoming).getAllByRole("article");
    expect(cards).toHaveLength(2);

    const first = within(cards[0]);
    expect(first.getByRole("heading", { level: 3, name: "Exam next" })).toBeInTheDocument();
    expect(first.getByText("Next exam")).toBeInTheDocument();
    expect(first.getByText(formatExamDate(next.schedule.startsAt))).toBeInTheDocument();
    expect(
      first.getByText(`${formatExamTime(next.schedule.startsAt)} to ${formatExamTime(next.schedule.endsAt)}`),
    ).toBeInTheDocument();
    expect(first.getByText("FPTU-EXAM-902")).toBeInTheDocument();
    expect(first.getByText("A-12")).toBeInTheDocument();
    expect(first.getByText("Scheduled")).toBeInTheDocument();

    const second = within(cards[1]);
    expect(second.getByText("Cancelled")).toBeInTheDocument();
    expect(second.getByText("Not assigned yet")).toBeInTheDocument();
    expect(second.queryByText("Next exam")).not.toBeInTheDocument();

    const past = screen.getByRole("region", { name: "Past exams" });
    expect(within(past).getByRole("heading", { level: 3, name: "Exam done" })).toBeInTheDocument();
    expect(within(past).getByText("Finished")).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });

  it("moves focus to the page heading and sets the document title", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([]));
    view();
    expect(await screen.findByRole("heading", { level: 1, name: "Exam schedule" })).toHaveFocus();
    expect(document.title).toBe("Exam schedule — LearnAble");
  });

  it("explains an empty schedule in words", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([]));
    const { container } = view();
    expect(await screen.findByRole("heading", { name: "No exams are scheduled for you yet" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Upcoming exams" })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("says so when only past exams exist", async () => {
    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("done", -10 * DAY, { status: "Closed" })]));
    view();
    expect(await screen.findByText("You have no upcoming exams.")).toBeInTheDocument();
  });

  it("reports a loading failure as text and lets the student retry", async () => {
    vi.mocked(getMyExamSchedules).mockRejectedValueOnce(new Error("down"));
    const { container } = view();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your exam schedule could not be loaded.");
    await expectNoAxeViolations(container);

    vi.mocked(getMyExamSchedules).mockResolvedValue(paged([exam("next", 2 * DAY)]));
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 3, name: "Exam next" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

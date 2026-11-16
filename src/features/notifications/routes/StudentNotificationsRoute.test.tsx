import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { StudentNotificationsRoute, studentNotificationTarget } from "./StudentNotificationsRoute";

const api = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));
vi.mock("@/api/notifications", () => api);

const item = (overrides: Record<string, unknown> = {}) => ({
  notificationId: "n1",
  title: "Exam schedule published: PRO192",
  content: "Room FPTU-EXAM-902, seat A-12.",
  notificationType: "ExamSchedulePublished",
  actionUrl: "/exam-schedules/11111111-1111-4111-8111-111111111111",
  relatedEntityType: "ExamSchedule",
  relatedEntityId: "11111111-1111-4111-8111-111111111111",
  publishedAt: "2026-11-10T00:00:00Z",
  expiresAt: null,
  receivedAt: "2026-11-10T00:00:00Z",
  readAt: null,
  ...overrides,
});
const maintenance = item({
  notificationId: "n2",
  title: "Planned maintenance",
  content: "Sunday 01:00 to 03:00.",
  notificationType: "SystemMaintenance",
  actionUrl: null,
  relatedEntityType: null,
  relatedEntityId: null,
  readAt: "2026-11-11T00:00:00Z",
});

function view() {
  const router = createMemoryRouter(
    [
      { path: "/notifications", element: <main><StudentNotificationsRoute /></main> },
      { path: "/schedule", element: <main><h1>Schedule page</h1></main> },
    ],
    { initialEntries: ["/notifications"] },
  );
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("studentNotificationTarget", () => {
  it("opens the student's schedule page for a published exam schedule", () => {
    expect(studentNotificationTarget(item())).toBe("/schedule");
    expect(studentNotificationTarget(item({ notificationType: "GeneralAnnouncement" }))).toBe("/schedule");
  });
  it("follows other links only to pages a student can open", () => {
    const other = { notificationType: "GeneralAnnouncement", relatedEntityType: null };
    expect(studentNotificationTarget(item({ ...other, actionUrl: "/results" }))).toBe("/results");
    expect(studentNotificationTarget(item({ ...other, actionUrl: "/examiner/schedule" }))).toBeNull();
    expect(studentNotificationTarget(item({ ...other, actionUrl: "https://example.com" }))).toBeNull();
    expect(studentNotificationTarget(item({ ...other, actionUrl: null }))).toBeNull();
  });
});

describe("StudentNotificationsRoute", () => {
  beforeEach(() => {
    api.getMyNotifications.mockReset();
    api.markNotificationRead.mockReset().mockResolvedValue({ updatedCount: 1 });
    api.markAllNotificationsRead.mockReset().mockResolvedValue({ updatedCount: 1 });
  });

  it("lists notifications with the read state and the schedule type in words", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item(), maintenance] });
    const { container } = view();

    const list = await screen.findByRole("list", { name: "Notification list" });
    const [schedule, other] = within(list).getAllByRole("article");
    expect(within(schedule).getByRole("heading", { level: 2, name: "Exam schedule published: PRO192" })).toBeInTheDocument();
    expect(within(schedule).getByText("Unread")).toBeInTheDocument();
    expect(within(schedule).getByText("Exam schedule")).toBeInTheDocument();
    expect(within(schedule).getByText("Room FPTU-EXAM-902, seat A-12.")).toBeInTheDocument();
    expect(
      within(schedule).getByRole("link", { name: "View exam schedule: Exam schedule published: PRO192" }),
    ).toHaveAttribute("href", "/schedule");

    expect(within(other).getByText("Read")).toBeInTheDocument();
    expect(within(other).queryByRole("link")).not.toBeInTheDocument();
    expect(within(other).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("1 unread notification")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toHaveFocus();

    await expectNoAxeViolations(container);
  });

  it("marks one notification as read", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item()] });
    view();
    await userEvent.click(
      await screen.findByRole("button", { name: "Mark as read: Exam schedule published: PRO192" }),
    );
    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalled());
    expect(api.markNotificationRead.mock.calls[0][0]).toBe("n1");
    await waitFor(() => expect(api.getMyNotifications).toHaveBeenCalledTimes(2));
  });

  it("marks a schedule notification as read when the student opens the schedule", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item()] });
    view();
    await userEvent.click(await screen.findByRole("link", { name: /View exam schedule/ }));
    expect(await screen.findByRole("heading", { name: "Schedule page" })).toBeInTheDocument();
    expect(api.markNotificationRead.mock.calls[0][0]).toBe("n1");
  });

  it("marks everything as read, and disables that when nothing is unread", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item(), maintenance] });
    view();
    const all = await screen.findByRole("button", { name: "Mark all as read" });
    await waitFor(() => expect(all).toBeEnabled());
    api.getMyNotifications.mockResolvedValue({ items: [item({ readAt: "2026-11-12T00:00:00Z" }), maintenance] });
    await userEvent.click(all);
    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("All notifications are read")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("says in words when marking as read fails", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item()] });
    api.markNotificationRead.mockRejectedValue(new Error("down"));
    view();
    await userEvent.click(await screen.findByRole("button", { name: /Mark as read:/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The notification could not be updated. Try again.");
  });

  it("explains an empty inbox", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [] });
    const { container } = view();
    expect(await screen.findByRole("heading", { name: "No notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
    await expectNoAxeViolations(container);
  });

  it("reports a loading failure as text and lets the student retry", async () => {
    api.getMyNotifications.mockRejectedValueOnce(new Error("down"));
    view();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Notifications could not be loaded.");
    api.getMyNotifications.mockResolvedValue({ items: [maintenance] });
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Planned maintenance" })).toBeInTheDocument();
  });
});

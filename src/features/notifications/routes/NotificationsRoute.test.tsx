import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { NotificationsRoute, notificationTarget } from "./NotificationsRoute";

const api = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(async () => undefined),
  markNotificationRead: vi.fn(async () => undefined),
}));
vi.mock("@/api/notifications", () => api);

const item = (overrides: Record<string, unknown> = {}) => ({
  notificationId: "n1", title: "Exam schedule published", content: "CSD_FE", notificationType: "ExamSchedulePublished",
  actionUrl: "/student/exams/abc", relatedEntityType: null, relatedEntityId: null, publishedAt: "2026-11-10T00:00:00Z",
  expiresAt: null, receivedAt: "2026-11-10T00:00:00Z", readAt: null, ...overrides,
});

describe("notificationTarget", () => {
  it("opens the lecturer schedule page for a published exam schedule", () => {
    expect(notificationTarget(item(), "/lecturer/notifications")).toBe("/lecturer/exams");
  });
  it("also recognises a schedule by its related entity", () => {
    expect(notificationTarget(item({ notificationType: "GeneralAnnouncement", relatedEntityType: "ExamSchedule" }), "/lecturer/notifications")).toBe("/lecturer/exams");
  });
  it("keeps the Backend link for other notifications and other roles", () => {
    expect(notificationTarget(item({ notificationType: "GeneralAnnouncement", actionUrl: "/x" }), "/lecturer/notifications")).toBe("/x");
    expect(notificationTarget(item(), "/examiner/notifications")).toBe("/student/exams/abc");
  });
  it("sends an examiner from the Backend schedule link to the examiner schedule page", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(notificationTarget(item({ actionUrl: `/exam-schedules/${id}` }), "/examiner/notifications")).toBe(`/examiner/schedule/${id}`);
  });

  it("offers no link when there is nowhere to go", () => {
    expect(notificationTarget(item({ notificationType: "GeneralAnnouncement", actionUrl: null }), "/lecturer/notifications")).toBeNull();
  });
});

describe("NotificationsRoute", () => {
  it("links Open to the lecturer exam schedule page", async () => {
    api.getMyNotifications.mockResolvedValue({ items: [item()] });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={createMemoryRouter([{ path: "/lecturer/notifications", element: <NotificationsRoute /> }], { initialEntries: ["/lecturer/notifications"] })} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("link", { name: "Open" })).toHaveAttribute("href", "/lecturer/exams");
  });
});

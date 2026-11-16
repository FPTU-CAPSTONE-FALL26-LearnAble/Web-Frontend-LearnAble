import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { getUnreadNotificationCount } from "@/api/notifications";
import { AppLayout } from "./AppLayout";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn() }));

function view() {
  const router = createMemoryRouter(
    [{ element: <AppLayout />, children: [{ path: "/schedule", element: <h1>Schedule</h1> }] }],
    { initialEntries: ["/schedule"] },
  );
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("AppLayout student navigation", () => {
  it("links to the exam schedule and marks the current page", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 });
    view();
    const nav = screen.getByRole("navigation");
    const schedule = within(nav).getByRole("link", { name: "Exam schedule" });
    expect(schedule).toHaveAttribute("href", "/schedule");
    expect(schedule).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
  });

  it("puts the unread count in the notifications link name", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 3 });
    view();
    expect(await screen.findByRole("link", { name: "Notifications 3 unread" })).toHaveAttribute("href", "/notifications");
  });
});

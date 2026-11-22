import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { getUnreadNotificationCount } from "@/api/notifications";
import { PageKeys } from "@/lib/a11y/PageKeys";
import { AppLayout } from "./AppLayout";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn() }));

function view() {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/schedule",
            element: (
              <>
                <h1>Schedule</h1>
                <PageKeys keys={[["Enter", "open"]]} />
              </>
            ),
          },
          { path: "/home", element: <h1>Main menu</h1> },
        ],
      },
    ],
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

  it("returns to the main menu with Alt+H from any page", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 });
    view();
    expect(screen.getByRole("link", { name: "Main menu" })).toHaveAttribute("href", "/home");
    await userEvent.keyboard("{Alt>}h{/Alt}");
    expect(await screen.findByRole("heading", { name: "Main menu" })).toBeInTheDocument();
  });

  it("shows the page's keys and the keys that work everywhere as separate groups in the bottom bar", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 });
    view();
    const bar = within(screen.getByRole("contentinfo")).getByRole("group", { name: "Keyboard keys" });
    const page = within(bar).getByText("On this page:").parentElement!;
    const everywhere = within(bar).getByText("On every page:").parentElement!;
    expect(within(page).getByText("open")).toBeInTheDocument();
    expect(within(page).queryByText("back to menu")).not.toBeInTheDocument();
    expect(within(everywhere).getByText("Alt+H")).toBeInTheDocument();
    expect(within(everywhere).getByText("back to menu")).toBeInTheDocument();
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { getUnreadNotificationCount } from "@/api/notifications";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { StudentHomeRoute } from "./StudentHomeRoute";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn() }));

const signOut = vi.fn();
function view() {
  const router = createMemoryRouter(
    [
      {
        element: <main><Outlet context={{ signOut }} /></main>,
        children: [
          { path: "/home", element: <StudentHomeRoute /> },
          { path: "/assistant", element: <h1>Assistant page</h1> },
          { path: "/results", element: <h1>Results page</h1> },
        ],
      },
    ],
    { initialEntries: ["/home"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("StudentHomeRoute", () => {
  beforeEach(() => {
    sessionStorage.clear();
    signOut.mockReset();
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 });
  });

  it("is one menu with a single tab stop, numbered items and no axe violations", async () => {
    view();
    const menu = screen.getByRole("menu", { name: "Main menu" });
    expect(menu).toHaveAccessibleDescription(/8 items\. Use Up and Down arrows/);
    const items = within(menu).getAllByRole("menuitem");
    expect(items).toHaveLength(8);
    expect(items[0]).toHaveFocus();
    expect(items.filter((item) => item.tabIndex === 0)).toHaveLength(1);
    expect(within(menu).getByRole("menuitem", { name: /AI learning assistant/ })).toHaveAttribute("href", "/assistant");
    expect(items[1]).toHaveAttribute("aria-keyshortcuts", "2");
    await expectNoAxeViolations(document.body);
  });

  it("moves with the arrow keys, wraps, and jumps with Home and End", async () => {
    view();
    const items = screen.getAllByRole("menuitem");
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    expect(screen.getByText("Focus · 2 of 8")).toBeInTheDocument();
    expect(items[1]).toHaveAttribute("data-highlighted");
    expect(items[0]).not.toHaveAttribute("data-highlighted");
    // The pointer highlights the item it is over, too.
    await userEvent.hover(items[4]);
    expect(items[4]).toHaveAttribute("data-highlighted");
    await userEvent.unhover(items[4]);
    expect(items[4]).not.toHaveAttribute("data-highlighted");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[7]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(items[7]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });

  it("opens an item with Enter or its number, and returns to it afterwards", async () => {
    const router = view();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("heading", { name: "Assistant page" })).toBeInTheDocument();
    await router.navigate("/home");
    expect(await screen.findByRole("menuitem", { name: /AI learning assistant/ })).toHaveFocus();

    await userEvent.keyboard("5");
    expect(await screen.findByRole("heading", { name: "Results page" })).toBeInTheDocument();
  });

  it("signs out with 9 and says how many notifications are unread", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 3 });
    view();
    expect(await screen.findByRole("menuitem", { name: /Notifications 3 unread/ })).toBeInTheDocument();
    await userEvent.keyboard("9");
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

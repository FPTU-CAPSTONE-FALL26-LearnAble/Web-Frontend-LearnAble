import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/api/notifications";
import { LecturerSidebar } from "./LecturerSidebar";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));

const user = {
  id: "lecturer-1",
  fullName: "Lecturer One",
  email: "lecturer@fpt.edu.vn",
  role: "Lecturer",
};

function renderSidebar(activePath: string, extra: Partial<Parameters<typeof LecturerSidebar>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[activePath]}>
        <LecturerSidebar
          activePath={activePath}
          user={user}
          campus="Hoa Lac"
          semester="Fall 2026"
          onSignOut={() => {}}
          onUnavailable={() => {}}
          {...extra}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LecturerSidebar collapsed", () => {
  afterEach(() => vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 }));

  const destinations = ["Dashboard", "Exam Questions", "Practice Questions", "Learning Materials", "Exam Papers", "Sealed Packages", "Exam Schedule", "Essay Grading", "Notifications"];

  it("keeps every destination one click away as an icon with a name", () => {
    renderSidebar("/lecturer/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    const nav = screen.getByRole("navigation", { name: "Lecturer navigation" });
    for (const label of destinations) {
      expect(within(nav).getByRole("link", { name: label })).toHaveTextContent("");
    }
    expect(screen.getByRole("link", { name: "Open Lecturer One's profile" })).toBeInTheDocument();
  });

  it("marks the current page", () => {
    renderSidebar("/lecturer/questions/practice", { collapsed: true, onToggleCollapsed: vi.fn() });
    expect(screen.getByRole("link", { name: "Practice Questions" })).toHaveAttribute("aria-current", "page");
  });

  it("opens again from the toggle and can be folded from the full sidebar", async () => {
    const actor = userEvent.setup();
    const onToggle = vi.fn();
    const { unmount } = renderSidebar("/lecturer/dashboard", { collapsed: true, onToggleCollapsed: onToggle });
    await actor.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();
    renderSidebar("/lecturer/dashboard", { onToggleCollapsed: onToggle });
    await actor.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("offers no fold button where the sidebar cannot be folded", () => {
    renderSidebar("/lecturer/dashboard", { collapsed: true });
    expect(screen.queryByRole("button", { name: /sidebar$/ })).not.toBeInTheDocument();
    expect(screen.getByText("Learning Materials")).toBeInTheDocument();
  });

  it("shows unread notifications in both forms", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 5 });
    const { unmount } = renderSidebar("/lecturer/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    expect(await screen.findByRole("link", { name: "Notifications, 5 unread" })).toBeInTheDocument();
    unmount();
    renderSidebar("/lecturer/dashboard");
    expect(await screen.findByLabelText("5 unread notifications")).toBeInTheDocument();
  });
});

describe("LecturerSidebar question management", () => {
  it("opens automatically and marks the matching question child active", () => {
    renderSidebar("/lecturer/questions/practice");
    expect(
      screen.getByRole("button", { name: "Question Management" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: "Practice Questions" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("can collapse and expand the question group", async () => {
    const actor = userEvent.setup();
    renderSidebar("/lecturer/dashboard");
    const group = screen.getByRole("button", { name: "Question Management" });
    expect(group).toHaveAttribute("aria-expanded", "false");
    await actor.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Exam Questions" })).toBeVisible();
  });
});

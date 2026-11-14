import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/api/auth";
import { getUnreadNotificationCount } from "@/api/notifications";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));
vi.mock("@/components/BrandIdentity", () => ({ BrandIdentity: () => <span>LearnAble</span> }));

import { ExaminerSidebar } from "./ExaminerSidebar";

const user = { id: "u1", fullName: "Nguyễn Văn An Khánh Tường Vy Anh Thư", email: "e@x.vn", role: "Examiner" } as User;
const labels = [
  "Dashboard", "Notifications", "Send notifications",
  "Exam papers", "Sealed packages", "Proctoring policy", "Exam schedule",
  "Live monitoring", "Extra time",
  "Grade release", "Integrity review", "Flagged sessions", "Exam reports",
  "Emergency",
];

function renderSidebar(path: string, extra: Partial<Parameters<typeof ExaminerSidebar>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ExaminerSidebar user={user} onSignOut={vi.fn()} onUnavailable={vi.fn()} {...extra} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ExaminerSidebar collapsed", () => {
  afterEach(() => vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 }));

  const destinations = labels.filter((label) => label !== "Emergency");

  it("keeps every destination one click away as an icon with a name", () => {
    renderSidebar("/examiner/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    const nav = screen.getByRole("navigation", { name: "Examiner navigation" });
    for (const label of destinations) {
      expect(within(nav).getByRole("link", { name: label })).toHaveTextContent("");
    }
    expect(within(nav).getByRole("button", { name: "Emergency" })).toBeInTheDocument();
  });

  it("marks the current page", () => {
    renderSidebar("/examiner/results", { collapsed: true, onToggleCollapsed: vi.fn() });
    expect(screen.getByRole("link", { name: "Grade release" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("reports unread notifications on the icon", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue({ unreadCount: 3 });
    renderSidebar("/examiner/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    expect(await screen.findByRole("link", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });

  it("offers a button to open the sidebar again, and a matching one to fold it", async () => {
    const person = userEvent.setup();
    const onToggle = vi.fn();
    const { unmount } = renderSidebar("/examiner/dashboard", { collapsed: true, onToggleCollapsed: onToggle });
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await person.click(expand);
    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();
    renderSidebar("/examiner/dashboard", { onToggleCollapsed: onToggle });
    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    await person.click(collapse);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("stays fully open where it cannot be folded, such as the phone menu", () => {
    renderSidebar("/examiner/dashboard", { collapsed: true });
    expect(screen.queryByRole("button", { name: /sidebar$/ })).not.toBeInTheDocument();
    expect(screen.getByText("Exam preparation")).toBeInTheDocument();
  });

  it("keeps sign out and the account in the rail", async () => {
    const person = userEvent.setup();
    const onSignOut = vi.fn();
    renderSidebar("/examiner/dashboard", { collapsed: true, onToggleCollapsed: vi.fn(), onSignOut });
    await person.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("ExaminerSidebar", () => {
  it("lists every destination once all groups are open", async () => {
    const person = userEvent.setup();
    renderSidebar("/examiner/sealed-papers");
    for (const name of ["Exam operations", "Review & reporting"]) {
      await person.click(screen.getByRole("button", { name }));
    }
    const nav = screen.getByRole("navigation", { name: "Examiner navigation" });
    for (const label of labels) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  it("never cuts a label short", async () => {
    const person = userEvent.setup();
    renderSidebar("/examiner/sealed-papers");
    await person.click(screen.getByRole("button", { name: "Review & reporting" }));
    const nav = screen.getByRole("navigation", { name: "Examiner navigation" });
    expect(nav.querySelectorAll(".truncate")).toHaveLength(0);
    expect(within(nav).getByText("Review & reporting").className).toContain("wrap-anywhere");
    expect(within(nav).getByText("Sealed packages").className).toContain("wrap-anywhere");
  });

  it("scrolls only the navigation and keeps the account controls outside it", () => {
    renderSidebar("/examiner/dashboard");
    const nav = screen.getByRole("navigation", { name: "Examiner navigation" });
    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.className).toContain("min-h-0");
    expect(nav).not.toContainElement(screen.getByRole("button", { name: "Sign out" }));
  });

  it("has no demo data switch, so every screen shows live Backend data", () => {
    renderSidebar("/examiner/dashboard");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
  });

  it("shows the account once, with the full name", () => {
    renderSidebar("/examiner/dashboard");
    expect(screen.getAllByText(user.fullName)).toHaveLength(1);
  });

  it("opens only the group of the current page", () => {
    renderSidebar("/examiner/results");
    expect(screen.getByText("Grade release")).toBeInTheDocument();
    expect(screen.queryByText("Exam papers")).not.toBeInTheDocument();
  });
});

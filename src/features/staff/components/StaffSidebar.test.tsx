import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/api/auth";
import { StaffSidebar } from "./StaffSidebar";

const user = { id: "s1", fullName: "Staff One", email: "s@x.vn", role: "Staff" } as User;
const destinations = [
  "Dashboard",
  "User Accounts", "Student Records", "Lecturer Records", "Examiner Records",
  "Departments", "Majors",
  "Subjects", "Curriculums", "Default Exam Policy",
  "Exam Rooms & Seats",
];

function renderSidebar(path: string, extra: Partial<Parameters<typeof StaffSidebar>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StaffSidebar activePath={path} user={user} onSignOut={vi.fn()} {...extra} />
    </MemoryRouter>,
  );
}

describe("StaffSidebar collapsed", () => {
  it("keeps every destination one click away as an icon with a name", () => {
    renderSidebar("/staff/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    const nav = screen.getByRole("navigation", { name: "Staff navigation" });
    for (const label of destinations) {
      expect(within(nav).getByRole("link", { name: label })).toHaveTextContent("");
    }
  });

  it("shows the full page name when an icon is hovered", async () => {
    const person = userEvent.setup();
    renderSidebar("/staff/dashboard", { collapsed: true, onToggleCollapsed: vi.fn() });
    await person.hover(screen.getByRole("link", { name: "Exam Rooms & Seats" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Exam Rooms & Seats");
  });

  it("marks the current page", () => {
    renderSidebar("/staff/curriculums", { collapsed: true, onToggleCollapsed: vi.fn() });
    expect(screen.getByRole("link", { name: "Curriculums" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Subjects" })).not.toHaveAttribute("aria-current");
  });

  it("opens again from the toggle and can be folded from the full sidebar", async () => {
    const person = userEvent.setup();
    const onToggle = vi.fn();
    const { unmount } = renderSidebar("/staff/dashboard", { collapsed: true, onToggleCollapsed: onToggle });
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await person.click(expand);
    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();
    renderSidebar("/staff/dashboard", { onToggleCollapsed: onToggle });
    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    await person.click(collapse);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("stays fully open where it cannot be folded, such as the phone menu", () => {
    renderSidebar("/staff/dashboard", { collapsed: true });
    expect(screen.queryByRole("button", { name: /sidebar$/ })).not.toBeInTheDocument();
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });

  it("keeps sign out in the rail", async () => {
    const person = userEvent.setup();
    const onSignOut = vi.fn();
    renderSidebar("/staff/dashboard", { collapsed: true, onToggleCollapsed: vi.fn(), onSignOut });
    await person.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

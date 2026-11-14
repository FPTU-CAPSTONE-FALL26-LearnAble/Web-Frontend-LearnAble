import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bell, LogOut } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SidebarCollapseButton, SidebarRailButton, SidebarRailLink } from "./SidebarControls";

function renderRail() {
  return render(
    <MemoryRouter>
      <SidebarRailLink to="/a" label="Invigilation registration" icon={Bell} />
      <SidebarRailLink to="/b" label="Notifications" icon={Bell} badge={3} />
      <SidebarRailButton label="Sign out" icon={LogOut} onClick={vi.fn()} />
      <SidebarCollapseButton collapsed onToggle={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("icon rail tooltips", () => {
  it("shows the full page name as soon as the pointer is over the icon", async () => {
    const person = userEvent.setup();
    renderRail();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await person.hover(screen.getByRole("link", { name: "Invigilation registration" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Invigilation registration");
  });

  it("shows one name at a time when the pointer moves to another icon", async () => {
    const person = userEvent.setup();
    renderRail();
    await person.hover(screen.getByRole("link", { name: "Invigilation registration" }));
    await screen.findByRole("tooltip");
    await person.hover(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Sign out"));
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
  });

  it("shows the name for keyboard users too, and closes with Escape", async () => {
    const person = userEvent.setup();
    renderRail();
    await person.tab();
    expect(screen.getByRole("link", { name: "Invigilation registration" })).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Invigilation registration");
    await person.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("names the page, not the unread count, in the tooltip", async () => {
    const person = userEvent.setup();
    renderRail();
    await person.hover(screen.getByRole("link", { name: "Notifications, 3 unread" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/^Notifications$/);
  });

  it("names buttons and the fold toggle as well", async () => {
    const person = userEvent.setup();
    renderRail();
    await person.hover(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Sign out");
    await person.hover(screen.getByRole("button", { name: "Expand sidebar" }));
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Expand sidebar"));
  });

  it("gives every icon the same colour, whether or not its page is open", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <SidebarRailLink to="/a" label="Open page" icon={Bell} />
        <SidebarRailLink to="/b" label="Other page" icon={Bell} />
      </MemoryRouter>,
    );
    const open = screen.getByRole("link", { name: "Open page" });
    const other = screen.getByRole("link", { name: "Other page" });
    expect(open).toHaveAttribute("aria-current", "page");
    for (const link of [open, other]) {
      expect(link.className).toContain("text-muted-foreground");
      expect(link.className).not.toContain("text-sidebar-accent-foreground");
    }
    expect(open.className).toContain("bg-sidebar-accent");
    expect(other.className).not.toContain("bg-sidebar-accent ");
  });

  it("keeps its styling when wrapped by the tooltip, and follows nested pages", () => {
    render(
      <MemoryRouter initialEntries={["/exams/new/setup"]}>
        <SidebarRailLink to="/exams" label="Exam papers" icon={Bell} />
        <SidebarRailLink to="/home" label="Home" icon={Bell} end />
      </MemoryRouter>,
    );
    const nested = screen.getByRole("link", { name: "Exam papers" });
    expect(nested.className).toContain("size-11");
    expect(nested.className).not.toContain("=>");
    expect(nested).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("does not add a second, browser-drawn tooltip", () => {
    renderRail();
    expect(screen.getByRole("link", { name: "Invigilation registration" })).not.toHaveAttribute("title");
    expect(screen.getByRole("button", { name: "Sign out" })).not.toHaveAttribute("title");
  });
});

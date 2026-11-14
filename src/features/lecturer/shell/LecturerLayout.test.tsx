import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));

import { LecturerLayout } from "./LecturerLayout";

const storageKey = "learnable.lecturer.sidebar-collapsed";

function renderLayout(path = "/lecturer/dashboard") {
  useAuthStore.setState({ user: { id: "u1", fullName: "Lecturer One", email: "l@x.vn", role: "Lecturer" } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<LecturerLayout />}>
            <Route path="/lecturer/dashboard" element={<p>Dashboard page</p>} />
            <Route path="/lecturer/questions/new" element={<p>Studio page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LecturerLayout sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("starts open and gives the page the remaining width when folded", async () => {
    const person = userEvent.setup();
    renderLayout();
    expect(screen.getByRole("complementary").className).toContain("w-64");
    expect(screen.getByRole("main").className).toContain("lg:ml-64");
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("complementary").className).toContain("w-16");
    expect(screen.getByRole("main").className).toContain("lg:ml-16");
  });

  it("follows the same rule in the question studio layout", async () => {
    const person = userEvent.setup();
    renderLayout("/lecturer/questions/new");
    expect(screen.getByRole("main").className).toContain("lg:ml-64");
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("main").className).toContain("lg:ml-16");
    expect(screen.getByRole("main").className).toContain("xl:overflow-hidden");
  });

  it("remembers the choice, separately from the examiner sidebar", async () => {
    const person = userEvent.setup();
    localStorage.setItem("learnable.examiner.sidebar-collapsed", "1");
    const first = renderLayout();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem(storageKey)).toBe("1");
    first.unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});

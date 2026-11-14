import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));

import { ExaminerLayout } from "./ExaminerLayout";

const storageKey = "learnable.examiner.sidebar-collapsed";

function renderLayout() {
  useAuthStore.setState({ user: { id: "u1", fullName: "Examiner One", email: "e@x.vn", role: "Examiner" } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/examiner/dashboard"]}>
        <Routes>
          <Route element={<ExaminerLayout />}>
            <Route path="/examiner/dashboard" element={<p>Dashboard page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ExaminerLayout sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("starts open and gives the page the remaining width when folded", async () => {
    const person = userEvent.setup();
    renderLayout();
    expect(screen.getByRole("complementary").className).toContain("w-68");
    expect(screen.getByRole("main").className).toContain("lg:ml-68");
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("complementary").className).toContain("w-16");
    expect(screen.getByRole("main").className).toContain("lg:ml-16");
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("opens the sidebar again", async () => {
    const person = userEvent.setup();
    localStorage.setItem(storageKey, "1");
    renderLayout();
    expect(screen.getByRole("complementary").className).toContain("w-16");
    await person.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("complementary").className).toContain("w-68");
    expect(screen.getByRole("main").className).toContain("lg:ml-68");
  });

  it("remembers the choice on the next visit", async () => {
    const person = userEvent.setup();
    const first = renderLayout();
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem(storageKey)).toBe("1");
    first.unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});

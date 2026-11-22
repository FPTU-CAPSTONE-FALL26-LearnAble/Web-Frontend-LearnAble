import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

vi.mock("@/api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/auth")>()),
  getCurrentUser: vi.fn().mockRejectedValue(new Error("offline")),
}));

import { StaffLayout } from "./StaffLayout";

const storageKey = "learnable.staff.sidebar-collapsed";

function renderLayout() {
  useAuthStore.setState({ user: { id: "s1", fullName: "Staff One", email: "s@x.vn", role: "Staff" } });
  return render(
    <MemoryRouter initialEntries={["/staff/dashboard"]}>
      <Routes>
        <Route element={<StaffLayout />}>
          <Route path="/staff/dashboard" element={<p>Dashboard page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("StaffLayout sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("starts open and gives the page the remaining width when folded", async () => {
    const person = userEvent.setup();
    renderLayout();
    expect(screen.getByRole("complementary").className).toContain("w-64");
    expect(screen.getByRole("main").className).toContain("lg:ml-64");
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("complementary").className).toContain("w-16");
    expect(screen.getByRole("main").className).toContain("lg:ml-16");
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("remembers the choice, separately from the other workspaces", async () => {
    const person = userEvent.setup();
    localStorage.setItem("learnable.examiner.sidebar-collapsed", "1");
    const first = renderLayout();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem(storageKey)).toBe("1");
    first.unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("complementary").className).toContain("w-64");
  });
});

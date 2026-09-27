import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RequireAdmin } from "./RequireAdmin";

function renderGuard(role: string) {
  useAuthStore.setState({
    user: { id: "a1", fullName: "Admin One", email: "admin@fpt.edu.vn", role },
  });
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin/dashboard" element={<p>Admin area</p>} />
        </Route>
        <Route path="/lecturer/dashboard" element={<p>Lecturer area</p>} />
        <Route path="/examiner/dashboard" element={<p>Examiner area</p>} />
        <Route path="/practice" element={<p>Student area</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAdmin", () => {
  beforeEach(() => useAuthStore.setState({ user: null }));

  it("accepts a case-insensitive admin role", () => {
    renderGuard("aDmIn");
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });

  it("returns lecturers to their own workspace", () => {
    renderGuard("Lecturer");
    expect(screen.getByText("Lecturer area")).toBeInTheDocument();
  });

  it("returns examiners to their own workspace", () => {
    renderGuard("Examiner");
    expect(screen.getByText("Examiner area")).toBeInTheDocument();
  });

  it("returns students to practice", () => {
    renderGuard("Student");
    expect(screen.getByText("Student area")).toBeInTheDocument();
  });

  it("clears unsupported roles instead of granting admin access", () => {
    renderGuard("Registrar");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});

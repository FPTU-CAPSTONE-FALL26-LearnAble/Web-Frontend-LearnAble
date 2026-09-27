import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RequireExaminer } from "./RequireExaminer";

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/examiner/dashboard"]}>
      <Routes>
        <Route element={<RequireExaminer />}>
          <Route path="/examiner/dashboard" element={<p>Examiner area</p>} />
        </Route>
        <Route path="/lecturer/dashboard" element={<p>Lecturer area</p>} />
        <Route path="/admin/dashboard" element={<p>Admin area</p>} />
        <Route path="/practice" element={<p>Student area</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireExaminer", () => {
  beforeEach(() => useAuthStore.setState({ user: null }));
  it("allows examiner roles without case sensitivity", () => {
    useAuthStore.setState({
      user: {
        id: "e1",
        fullName: "Examiner One",
        email: "examiner@fpt.edu.vn",
        role: "EXAMINER",
      },
    });
    renderGuard();
    expect(screen.getByText("Examiner area")).toBeInTheDocument();
  });
  it("returns lecturers to their workspace", () => {
    useAuthStore.setState({
      user: {
        id: "l1",
        fullName: "Lecturer One",
        email: "lecturer@fpt.edu.vn",
        role: "Lecturer",
      },
    });
    renderGuard();
    expect(screen.getByText("Lecturer area")).toBeInTheDocument();
  });

  it("sends admins to their own workspace", () => {
    useAuthStore.setState({
      user: {
        id: "a1",
        fullName: "Admin One",
        email: "admin@fpt.edu.vn",
        role: "Admin",
      },
    });
    renderGuard();
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });

  it("clears unsupported roles instead of treating them as students", () => {
    useAuthStore.setState({
      user: {
        id: "r1",
        fullName: "Registrar One",
        email: "registrar@fpt.edu.vn",
        role: "Registrar",
      },
    });
    renderGuard();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});

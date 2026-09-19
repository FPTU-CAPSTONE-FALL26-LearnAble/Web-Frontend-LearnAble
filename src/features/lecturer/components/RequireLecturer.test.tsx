import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RequireLecturer } from "./RequireLecturer";

function renderGuard(role: string) {
  useAuthStore.setState({
    user: {
      id: "user-1",
      fullName: "Test User",
      email: "test@fpt.edu.vn",
      role,
    },
  });
  return render(
    <MemoryRouter initialEntries={["/lecturer/dashboard"]}>
      <Routes>
        <Route element={<RequireLecturer />}>
          <Route path="/lecturer/dashboard" element={<p>Lecturer area</p>} />
        </Route>
        <Route path="/practice" element={<p>Student area</p>} />
        <Route path="/examiner/dashboard" element={<p>Examiner area</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireLecturer", () => {
  it("accepts a case-insensitive lecturer role", () => {
    renderGuard("lEcTuReR");
    expect(screen.getByText("Lecturer area")).toBeInTheDocument();
  });

  it("redirects other roles to their existing area", () => {
    renderGuard("Student");
    expect(screen.getByText("Student area")).toBeInTheDocument();
  });

  it("redirects examiners to their own workspace", () => {
    renderGuard("Examiner");
    expect(screen.getByText("Examiner area")).toBeInTheDocument();
  });

  it("clears unsupported roles instead of treating them as students", () => {
    renderGuard("Admin");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});

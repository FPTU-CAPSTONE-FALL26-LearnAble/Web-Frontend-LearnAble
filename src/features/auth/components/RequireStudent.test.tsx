import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RequireStudent } from "./RequireStudent";

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
    <MemoryRouter initialEntries={["/practice"]}>
      <Routes>
        <Route element={<RequireStudent />}>
          <Route path="/practice" element={<p>Student area</p>} />
        </Route>
        <Route path="/lecturer/dashboard" element={<p>Lecturer area</p>} />
        <Route path="/examiner/dashboard" element={<p>Examiner area</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireStudent", () => {
  it("allows students into practice", () => {
    renderGuard("Student");
    expect(screen.getByText("Student area")).toBeInTheDocument();
  });

  it.each([
    ["Lecturer", "Lecturer area"],
    ["Examiner", "Examiner area"],
  ])("returns %s to its own workspace", (role, destination) => {
    renderGuard(role);
    expect(screen.getByText(destination)).toBeInTheDocument();
  });
});

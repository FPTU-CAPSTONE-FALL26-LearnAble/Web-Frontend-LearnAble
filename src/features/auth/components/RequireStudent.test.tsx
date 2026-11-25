import { act, render, screen } from "@testing-library/react";
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
        <Route path="/" element={<p>Public home</p>} />
        <Route path="/login" element={<p>Sign in</p>} />
        <Route path="/lecturer/dashboard" element={<p>Lecturer area</p>} />
        <Route path="/examiner/dashboard" element={<p>Examiner area</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireStudent", () => {
  it("sends a student who signs out on a student page to the public home page, not a sign-in page", () => {
    renderGuard("Student");
    expect(screen.getByText("Student area")).toBeInTheDocument();
    act(() => useAuthStore.getState().logout());
    expect(screen.getByText("Public home")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

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

  it("shows the student's own colour theme in the student area only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: null, data: { contrastTheme: "Light" }, errors: null }),
      ),
    );
    // The last known theme paints first, then the one saved on the Backend.
    localStorage.setItem("learnable.contrastTheme.user-1", "yellow");
    const student = renderGuard("Student");
    expect(document.documentElement).toHaveAttribute("data-contrast", "yellow");
    await vi.waitFor(() =>
      expect(document.documentElement).toHaveAttribute("data-contrast", "white"),
    );
    student.unmount();
    expect(document.documentElement).not.toHaveAttribute("data-contrast");

    fetchMock.mockClear();
    renderGuard("Lecturer");
    expect(document.documentElement).not.toHaveAttribute("data-contrast");
    expect(fetchMock).not.toHaveBeenCalled();
    localStorage.clear();
    vi.restoreAllMocks();
  });
});

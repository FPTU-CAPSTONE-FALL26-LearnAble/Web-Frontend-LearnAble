import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { LecturerDashboardRoute } from "./LecturerDashboardRoute";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function renderDashboard() {
  useAuthStore.setState({
    user: {
      id: "lecturer-1",
      fullName: "Dr. Nguyen Van A",
      email: "lecturer@fpt.edu.vn",
      role: "Lecturer",
    },
  });
  return render(
    <MemoryRouter>
      <LecturerDashboardRoute />
    </MemoryRouter>,
  );
}

describe("LecturerDashboardRoute", () => {
  it("renders fixture content and filters the work queue", async () => {
    const user = userEvent.setup();
    renderDashboard();
    expect(
      screen.getByRole("heading", {
        name: /Good (morning|afternoon|evening), Dr\. Nguyen Van A/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Lab Alpha 302")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Urgent (2)" }));
    expect(
      screen.getByText("Showing 2 priority items of 4"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Boolean logic equivalence question"),
    ).not.toBeInTheDocument();
  });

  it("searches locally and does not send a request for preview actions", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderDashboard();
    await user.type(
      screen.getByRole("textbox", { name: "Search urgent work" }),
      "MathML",
    );
    expect(
      screen.getByText("Boolean logic equivalence question"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Garbage collection benchmark chart"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create question" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("has no detectable axe violations", async () => {
    const view = renderDashboard();
    await expectNoAxeViolations(view.container);
  });
});

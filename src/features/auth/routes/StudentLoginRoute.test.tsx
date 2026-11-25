import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { GuestDisplayScope } from "@/features/auth/components/GuestDisplayScope";
import {
  getStudentPostLoginDestination,
  StudentLoginRoute,
} from "@/features/auth/routes/StudentLoginRoute";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function renderStudentLogin() {
  const router = createMemoryRouter(
    [
      {
        element: <GuestDisplayScope />,
        children: [{ path: "/student/login", element: <StudentLoginRoute displayControls={<button type="button">Accessibility</button>} /> }],
      },
    ],
    { initialEntries: ["/student/login"] },
  );
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("StudentLoginRoute", () => {
  beforeEach(() => localStorage.clear());

  it("only preserves a requested Student route", () => {
    expect(getStudentPostLoginDestination()).toBe("/home");
    expect(getStudentPostLoginDestination("/results")).toBe("/results");
    expect(getStudentPostLoginDestination("/practice/set-1")).toBe("/practice/set-1");
    expect(getStudentPostLoginDestination("/examiner/dashboard")).toBe("/home");
  });

  it("keeps the colours and text size the visitor chose as a guest", () => {
    localStorage.setItem("learnable.contrastTheme.guest", "yellow");
    localStorage.setItem("learnable.textScale.guest", "150");
    renderStudentLogin();
    expect(document.documentElement.dataset.contrast).toBe("yellow");
    expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe("1.5");
  });

  it("marks both fields required, names every control and offers the other ways out", async () => {
    const { container } = renderStudentLogin();
    expect(screen.getByRole("heading", { level: 1, name: "Student sign in" })).toHaveFocus();
    expect(screen.getByLabelText("University email or student ID")).toBeRequired();
    expect(screen.getByLabelText("University email or student ID")).toHaveAccessibleDescription(
      "For example name@fpt.edu.vn, or your student ID.",
    );
    expect(screen.getByRole("complementary", { name: "After you sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeRequired();
    // The router passes the Accessibility card into the header.
    expect(screen.getByRole("button", { name: "Accessibility" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to LearnAble home page" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Use the staff sign-in" })).toHaveAttribute("href", "/login");
    expect(screen.getByText(/Contact Student Services or campus IT to reset it/)).toHaveTextContent(
      "Forgot your password? Contact Student Services or campus IT to reset it.",
    );
    await expectNoAxeViolations(container);
  });

  it("lets a screen reader user show the password they typed", async () => {
    const user = userEvent.setup();
    renderStudentLogin();
    const password = screen.getByLabelText("Password");
    await user.type(password, "secret");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    // The name stays the same; the pressed state tells a screen reader it is on.
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(password).toHaveAttribute("type", "password");
  });

  it("reaches the password field before its show-password toggle when tabbing", async () => {
    const user = userEvent.setup();
    renderStudentLogin();
    screen.getByLabelText("University email or student ID").focus();
    await user.tab();
    expect(screen.getByLabelText("Password")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
  });

  it("explains an empty field in words next to it", async () => {
    const user = userEvent.setup();
    renderStudentLogin();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your university email or student ID.")).toBeInTheDocument();
    expect(screen.getByLabelText("University email or student ID")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("University email or student ID")).toHaveFocus();
  });
});

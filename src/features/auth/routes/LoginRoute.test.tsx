import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import {
  getPostLoginDestination,
  LoginRoute,
} from "@/features/auth/routes/LoginRoute";

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginRoute", () => {
  it("routes lecturers to their dashboard and preserves other role flows", () => {
    expect(getPostLoginDestination("LECTURER")).toBe("/lecturer/dashboard");
    expect(getPostLoginDestination("Examiner")).toBe("/examiner/dashboard");
    expect(getPostLoginDestination("Student")).toBe("/home");
    expect(getPostLoginDestination("Lecturer", "/lecturer/dashboard")).toBe(
      "/lecturer/dashboard",
    );
    expect(getPostLoginDestination("Lecturer", "/practice")).toBe(
      "/lecturer/dashboard",
    );
    expect(getPostLoginDestination("Examiner", "/lecturer/dashboard")).toBe(
      "/examiner/dashboard",
    );
    expect(getPostLoginDestination("Student", "/examiner/dashboard")).toBe(
      "/home",
    );
    expect(getPostLoginDestination("Admin")).toBe("/admin/dashboard");
    expect(getPostLoginDestination("Admin", "/admin/users")).toBe(
      "/admin/users",
    );
    expect(getPostLoginDestination("Admin", "/lecturer/dashboard")).toBe(
      "/admin/dashboard",
    );
    expect(getPostLoginDestination("Student", "/admin/users")).toBe("/home");
    expect(getPostLoginDestination("Registrar")).toBeNull();
  });
  it("validates required fields and toggles password visibility", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(
      await screen.findByText("Enter your email or username."),
    ).toBeInTheDocument();
    const password = screen.getByLabelText(/^Password/);
    await user.type(password, "secret");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("points students to the accessible sign-in right after the heading and marks fields required", () => {
    renderLogin();
    const studentLink = screen.getByRole("link", { name: "Student? Use the accessible sign-in" });
    expect(studentLink).toHaveAttribute("href", "/student/login");
    // It comes before the first field in reading and Tab order.
    const identifier = screen.getByLabelText(/^Email or username/);
    expect(studentLink.compareDocumentPosition(identifier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(identifier).toBeRequired();
    expect(screen.getByLabelText(/^Password/)).toBeRequired();
  });

  it("has one heading, a named password toggle, a brand panel after the form and no axe violations", async () => {
    const { container } = renderLogin();
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    const panel = screen.getByRole("complementary", { name: "Run accessible courses and exams from one workspace." });
    // The form is read first; the panel follows it.
    expect(main.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
    await expectNoAxeViolations(container);
  });

  it("does not insert a Google SSO demo alert into the form", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(
      screen.getByRole("button", {
        name: "Continue with university Google account",
      }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

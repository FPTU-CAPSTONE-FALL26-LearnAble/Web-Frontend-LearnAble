import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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
    expect(getPostLoginDestination("Student")).toBe("/practice");
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
      "/practice",
    );
    expect(getPostLoginDestination("Admin")).toBeNull();
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

  it("does not insert a Google SSO demo alert into the form", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

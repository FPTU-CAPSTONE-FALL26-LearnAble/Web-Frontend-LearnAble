import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ForgotPasswordRoute } from "@/features/auth/routes/ForgotPasswordRoute";

describe("ForgotPasswordRoute", () => {
  it("validates the FPT email and never sends a network request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<MemoryRouter><ForgotPasswordRoute /></MemoryRouter>);

    await user.type(screen.getByLabelText(/FPT account email/i), "student@gmail.com");
    await user.click(screen.getByRole("button", { name: /request password recovery/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("@fpt.edu.vn");

    await user.clear(screen.getByLabelText(/FPT account email/i));
    await user.type(screen.getByLabelText(/FPT account email/i), "student@fpt.edu.vn");
    await user.click(screen.getByRole("button", { name: /request password recovery/i }));
    expect(await screen.findByText(/No email was sent/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("changes role and labels Google sign-in as a preview", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ForgotPasswordRoute /></MemoryRouter>);
    await user.click(screen.getByText("Staff or other"));
    expect(screen.getByRole("radio", { name: "Staff or other" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: /Google FPT Mail/i }));
    expect(screen.getByText(/design preview/i)).toBeInTheDocument();
  });
});

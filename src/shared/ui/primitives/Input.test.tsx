import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Input primitive", () => {
  it("associates label, hint, and error with input", () => {
    render(
      <Input
        id="test-input"
        label="Full Name"
        hint="Enter your legal name"
        error="Name is required"
      />,
    );
    const input = screen.getByLabelText("Full Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "test-input-hint test-input-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
  });

  it("renders as standalone input when no label/hint/error provided", () => {
    render(<Input aria-label="Search" placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveAttribute("aria-label", "Search");
  });

  it("passes accessibility checks", async () => {
    const { container } = render(
      <Input
        id="email"
        label="Email Address"
        hint="Use school email"
        error="Invalid email"
      />,
    );
    await expectNoAxeViolations(container);
  });
});

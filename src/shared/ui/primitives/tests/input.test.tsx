import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "../input";
import { Label } from "../label";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Input primitive", () => {
  it("renders with associated label and attributes", () => {
    render(
      <div>
        <Label htmlFor="test-input">Full Name</Label>
        <Input
          id="test-input"
          aria-invalid="true"
          placeholder="Enter legal name"
        />
      </div>,
    );
    const input = screen.getByLabelText("Full Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("placeholder", "Enter legal name");
  });

  it("renders as standalone input when no label provided", () => {
    render(<Input aria-label="Search" placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveAttribute("aria-label", "Search");
  });

  it("passes accessibility checks", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" placeholder="user@example.edu.vn" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

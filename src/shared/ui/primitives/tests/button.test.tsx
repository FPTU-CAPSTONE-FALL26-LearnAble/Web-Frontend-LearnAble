import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Button primitive", () => {
  it("renders a button with text content", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
  });

  it("honors explicit type='submit'", () => {
    render(<Button type="submit">Submit form</Button>);
    const btn = screen.getByRole("button", { name: /submit form/i });
    expect(btn).toHaveAttribute("type", "submit");
  });

  it("renders default and lg sizes", () => {
    const { rerender } = render(<Button size="default">Default Button</Button>);
    let btn = screen.getByRole("button", { name: /default button/i });
    expect(btn).toBeInTheDocument();

    rerender(<Button size="lg">Large Button</Button>);
    btn = screen.getByRole("button", { name: /large button/i });
    expect(btn).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

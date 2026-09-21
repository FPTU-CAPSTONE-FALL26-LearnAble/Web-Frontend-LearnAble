import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Button primitive", () => {
  it("defaults to type='button' to prevent accidental form submission", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("honors explicit type='submit'", () => {
    render(<Button type="submit">Submit form</Button>);
    const btn = screen.getByRole("button", { name: /submit form/i });
    expect(btn).toHaveAttribute("type", "submit");
  });

  it("applies min 44x44px target on default size", () => {
    render(<Button size="default">Default Button</Button>);
    const btn = screen.getByRole("button", { name: /default button/i });
    expect(btn.className).toContain("min-h-[var(--target-min)]");
    expect(btn.className).toContain("min-w-[var(--target-min)]");
  });

  it("applies exam size classes when specified", () => {
    render(<Button size="exam">Exam Action</Button>);
    const btn = screen.getByRole("button", { name: /exam action/i });
    expect(btn.className).toContain("min-h-[3.25rem]");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Kbd } from "../kbd";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Kbd primitive", () => {
  it("renders a kbd element with its keys", () => {
    render(<Kbd>Ctrl + Enter</Kbd>);
    const kbd = screen.getByText("Ctrl + Enter");
    expect(kbd.tagName).toBe("KBD");
    expect(kbd).toHaveAttribute("data-slot", "kbd");
  });

  it("renders default and exam sizes", () => {
    const { rerender } = render(<Kbd>Ctrl + 5</Kbd>);
    expect(screen.getByText("Ctrl + 5")).toHaveAttribute("data-size", "default");

    rerender(<Kbd size="exam">Ctrl + 5</Kbd>);
    expect(screen.getByText("Ctrl + 5")).toHaveAttribute("data-size", "exam");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <p>
        Press <Kbd>Ctrl + Enter</Kbd> or <Kbd size="exam">Ctrl + 5</Kbd>
      </p>,
    );
    await expectNoAxeViolations(container);
  });
});

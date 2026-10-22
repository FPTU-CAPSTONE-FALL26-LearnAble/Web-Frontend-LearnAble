import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineChoiceQuestion } from "@/shared/ui/patterns/exam/InlineChoiceQuestion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

const slots = [
  {
    id: "subject",
    label: "First blank",
    placeholder: "Select alternative",
    options: [
      { value: "teams", label: "Teams" },
      { value: "systems", label: "Systems" },
    ],
  },
];

describe("InlineChoiceQuestion", () => {
  it("renders controlled inline choices and reports selections", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <InlineChoiceQuestion
        questionNumber={4}
        stem="Fill out the blanks."
        segments={[{ slotId: "subject" }, " work together."]}
        slots={slots}
        values={{ subject: "teams" }}
        onValueChange={onValueChange}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "First blank" })).toHaveTextContent("Teams");
    fireEvent.click(screen.getByRole("combobox", { name: "First blank" }));
    fireEvent.click(screen.getByRole("option", { name: "Systems" }));
    expect(onValueChange).toHaveBeenCalledWith("subject", "systems");

    await expectNoAxeViolations(container);
  });

  it("supports reset, flagging, image layouts, and disabled choices", () => {
    const onReset = vi.fn();
    const onToggleFlag = vi.fn();
    render(
      <InlineChoiceQuestion
        questionNumber={4}
        stem="Fill out the blanks."
        image={{ src: "/example.png", alt: "Supporting diagram" }}
        imageLayout="above"
        segments={[{ slotId: "subject" }]}
        slots={slots}
        values={{ subject: "teams" }}
        onValueChange={vi.fn()}
        onReset={onReset}
        onToggleFlag={onToggleFlag}
        disabled
      />,
    );

    expect(screen.getByRole("img", { name: "Supporting diagram" })).toHaveClass("w-full");
    expect(screen.getByRole("combobox", { name: "First blank" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset answer" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
    expect(onToggleFlag).toHaveBeenCalledOnce();
    expect(onReset).not.toHaveBeenCalled();
  });
});

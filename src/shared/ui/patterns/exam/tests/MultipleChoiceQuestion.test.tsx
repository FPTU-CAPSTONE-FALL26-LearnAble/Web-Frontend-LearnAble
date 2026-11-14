import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MultipleChoiceQuestion } from "@/shared/ui/patterns/exam/MultipleChoiceQuestion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

const options = [
  { id: "a", text: "First alternative" },
  { id: "b", text: "Second alternative" },
];

describe("MultipleChoiceQuestion", () => {
  it("renders a controlled radio group and reports one selection", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <MultipleChoiceQuestion
        questionNumber={1}
        stem="Which statement is correct?"
        options={options}
        value="a"
        onValueChange={onValueChange}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "First alternative" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "First alternative" }).parentElement).toHaveClass("bg-primary/15");
    fireEvent.click(screen.getByRole("radio", { name: "Second alternative" }));
    expect(onValueChange).toHaveBeenCalledWith("b");

    await expectNoAxeViolations(container);
  });

  it("supports an above image, reset, and flag control", () => {
    const onReset = vi.fn();
    const onToggleFlag = vi.fn();
    render(
      <MultipleChoiceQuestion
        questionNumber={2}
        stem="Choose one answer."
        image={{ src: "/example.png", alt: "A supporting diagram" }}
        imageLayout="above"
        options={options}
        value="a"
        onValueChange={vi.fn()}
        onReset={onReset}
        onToggleFlag={onToggleFlag}
      />,
    );

    expect(screen.getByRole("img", { name: "A supporting diagram" })).toHaveClass("w-full");
    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset answer" }));
    expect(onToggleFlag).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("disables the choices and reset action", () => {
    render(
      <MultipleChoiceQuestion
        questionNumber={3}
        stem="Choose one answer."
        options={options}
        value={null}
        onValueChange={vi.fn()}
        onReset={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("radio", { name: "First alternative" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset answer" })).toBeDisabled();
  });
});

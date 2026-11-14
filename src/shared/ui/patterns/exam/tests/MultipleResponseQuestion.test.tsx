import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MultipleResponseQuestion } from "@/shared/ui/patterns/exam/MultipleResponseQuestion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

const options = [
  { id: "a", text: "First alternative" },
  { id: "b", text: "Second alternative" },
  { id: "c", text: "Third alternative" },
];

describe("MultipleResponseQuestion", () => {
  it("renders a labelled checkbox group and reports selection changes", async () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <MultipleResponseQuestion
        questionNumber={6}
        stem="Which statements are correct?"
        options={options}
        selectedOptionIds={["a"]}
        onSelectionChange={onSelectionChange}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Select one or more alternatives" })).toBeInTheDocument();
    const selectedCheckbox = screen.getByRole("checkbox", { name: "First alternative" });
    expect(selectedCheckbox).toBeChecked();
    expect(selectedCheckbox.parentElement).toHaveClass("bg-primary/15");
    expect(screen.getByRole("checkbox", { name: "Second alternative" }).parentElement).toHaveClass("hover:bg-muted");
    expect(screen.getByText("First alternative")).toHaveClass("select-text");

    fireEvent.click(screen.getByRole("checkbox", { name: "Second alternative" }));
    expect(onSelectionChange).toHaveBeenCalledWith("b", true);

    await expectNoAxeViolations(container);
  });

  it("renders an optional full-width image above the stem and resets the current response", () => {
    const onReset = vi.fn();
    render(
      <MultipleResponseQuestion
        questionNumber={2}
        stem="Choose all applicable answers."
        image={{ src: "/example.png", alt: "A supporting diagram" }}
        imageLayout="above"
        options={options}
        selectedOptionIds={["a", "c"]}
        onSelectionChange={vi.fn()}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole("img", { name: "A supporting diagram" })).toHaveClass("w-full");
    fireEvent.click(screen.getByRole("button", { name: "Reset answer" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("exposes an optional bookmark control for flagging", () => {
    const onToggleFlag = vi.fn();
    render(
      <MultipleResponseQuestion
        questionNumber={4}
        stem="Choose all applicable answers."
        options={options}
        selectedOptionIds={[]}
        onSelectionChange={vi.fn()}
        onReset={vi.fn()}
        onToggleFlag={onToggleFlag}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
    expect(onToggleFlag).toHaveBeenCalledOnce();
  });

  it("disables choices and reset when the question is unavailable", () => {
    render(
      <MultipleResponseQuestion
        questionNumber={3}
        stem="Choose all applicable answers."
        options={options}
        selectedOptionIds={[]}
        onSelectionChange={vi.fn()}
        onReset={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("checkbox", { name: "First alternative" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset answer" })).toBeDisabled();
  });
});

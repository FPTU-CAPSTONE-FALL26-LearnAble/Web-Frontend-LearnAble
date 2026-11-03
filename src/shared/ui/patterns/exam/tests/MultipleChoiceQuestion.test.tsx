import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MultipleChoiceQuestion } from "@/shared/ui/patterns/exam/MultipleChoiceQuestion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

const options = [
  { id: "a", text: "First alternative" },
  { id: "b", text: "Second alternative" },
];

describe("MultipleChoiceQuestion", () => {
  it("selects the stable ID once on a short arrow press while moving focus", async () => {
    const user = userEvent.setup(); const changed = vi.fn();
    function Question() {
      const [answer, setAnswer] = useState("first");
      return <MultipleChoiceQuestion questionNumber={1} stem="Duplicate labels" value={answer}
        options={[{ id: "first", text: "Same label" }, { id: "second", text: "Same label" }]}
        onValueChange={(id) => { changed(id); setAnswer(id); }} />;
    }
    render(<Question />);
    await user.click(screen.getAllByRole("radio", { name: "Same label" })[0]);
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("radio", { name: "Same label" })[1]).toBeChecked();
    await waitFor(() => expect(screen.getAllByRole("radio", { name: "Same label" })[1]).toHaveFocus());
    expect(changed).toHaveBeenCalledExactlyOnceWith("second");
  });

  it("supports Home/End and wraps past disabled alternatives", async () => {
    const user = userEvent.setup();
    function Question() {
      const [answer, setAnswer] = useState("a");
      return <MultipleChoiceQuestion questionNumber={1} stem="Keyboard options" value={answer}
        options={[options[0], { id: "disabled", text: "Unavailable", disabled: true }, options[1]]}
        onValueChange={setAnswer} />;
    }
    render(<Question />);
    await user.click(screen.getByRole("radio", { name: "First alternative" }));
    await user.keyboard("{Control>}{ArrowDown}{/Control}");
    expect(screen.getByRole("radio", { name: "First alternative" })).toBeChecked();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Second alternative" })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("radio", { name: "Second alternative" })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "First alternative" })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("radio", { name: "First alternative" })).toHaveFocus());
    await user.keyboard("{End}{Home}");
    expect(screen.getByRole("radio", { name: "First alternative" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Unavailable" })).not.toBeChecked();
  });

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

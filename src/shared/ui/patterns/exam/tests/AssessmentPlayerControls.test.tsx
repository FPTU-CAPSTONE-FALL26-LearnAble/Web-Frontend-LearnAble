import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentPlayerContrastOptions, type ContrastOption } from "../AssessmentPlayerContrastOptions";
import { AssessmentPlayerTextSizeOptions, type TextScaleOption } from "../AssessmentPlayerTextSizeOptions";
import { AssessmentPlayerOptions } from "../AssessmentPlayerOptions";
import { QuestionPager } from "../QuestionPager";

function Contrast() {
  const [value, setValue] = useState<ContrastOption>("default");
  return <AssessmentPlayerContrastOptions value={value} onChange={setValue} />;
}

function TextSize() {
  const [value, setValue] = useState<TextScaleOption>(100);
  return <AssessmentPlayerTextSizeOptions value={value} onChange={setValue} />;
}

describe("player option radio groups", () => {
  it("make only the checked contrast option a Tab stop, and arrows move and select with wrapping", async () => {
    const user = userEvent.setup();
    render(<Contrast />);
    const group = screen.getByRole("radiogroup", { name: "Contrast" });
    expect(group).toBeInTheDocument();
    const [first, second, third] = screen.getAllByRole("radio");
    expect([first, second, third].map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);

    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    expect(second).toBeChecked();
    expect([first, second, third].map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(first).toHaveFocus();
    expect(first).toBeChecked();
    await user.keyboard("{ArrowUp}");
    expect(third).toHaveFocus();
    expect(third).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(second).toBeChecked();
  });

  it("go to the first and last text size with Home and End", async () => {
    const user = userEvent.setup();
    render(<TextSize />);
    const radios = screen.getAllByRole("radio");
    await user.tab();
    expect(radios[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(radios.at(-1)).toHaveFocus();
    expect(radios.at(-1)).toBeChecked();
    await user.keyboard("{Home}");
    expect(radios[0]).toHaveFocus();
    expect(radios[0]).toBeChecked();
  });
});

describe("remaining-time toggle", () => {
  it.each([[undefined, "false"], ["remainingTime", "true"]] as const)("says whether the remaining time is hidden (%s)", (selectedSetting, pressed) => {
    render(<AssessmentPlayerOptions open onOpenChange={() => {}} onSelectSetting={vi.fn()} selectedSetting={selectedSetting} />);
    expect(screen.getByRole("button", { name: "Hide or show remaining time" })).toHaveAttribute("aria-pressed", pressed);
  });
});

describe("question pager", () => {
  it("adds no empty Tab stop before Previous and Next, and renders no footer", async () => {
    const user = userEvent.setup();
    render(<QuestionPager currentIndex={0} questionCount={1} view="question" onGoTo={() => {}} onViewChange={() => {}} />);
    const navigation = screen.getByRole("navigation", { name: "Previous / next question" });
    expect(navigation).not.toHaveAttribute("tabindex");
    await user.tab();
    expect(screen.getByRole("button", { name: "Previous" })).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Question navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

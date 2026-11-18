import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionNavigatorPanel, type QuestionNavigatorItem } from "../QuestionNavigatorPanel";

const questions = (n: number, overrides: Record<number, Partial<QuestionNavigatorItem>> = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, answered: false, flagged: false, ...overrides[i + 1] }));

function setup(currentIndex: number | null = 0, items = questions(18, { 1: { answered: true }, 2: { answered: true }, 5: { flagged: true } })) {
  const onNavigate = vi.fn();
  const onReview = vi.fn();
  render(<QuestionNavigatorPanel questions={items} currentIndex={currentIndex} onNavigate={onNavigate} onReview={onReview} />);
  return { onNavigate, onReview };
}

describe("QuestionNavigatorPanel", () => {
  it("is a named complementary landmark with a progress summary and no visible heading", () => {
    setup();
    const panel = screen.getByRole("complementary", { name: "All questions" });
    expect(within(panel).queryByRole("heading")).not.toBeInTheDocument();
    expect(within(panel).getByText("2 of 18 questions answered · 1 flagged")).toBeVisible();
  });

  it("names every question with its status so state is never colour-only", () => {
    setup(0);
    const grid = screen.getByRole("list", { name: "Go to question" });
    const buttons = within(grid).getAllByRole("button");
    expect(buttons).toHaveLength(18);
    expect(buttons[0]).toHaveAccessibleName("Question 1, answered, current");
    expect(buttons[0]).toHaveAttribute("aria-current", "step");
    expect(buttons[1]).toHaveAccessibleName("Question 2, answered");
    expect(buttons[1]).not.toHaveAttribute("aria-current");
    expect(buttons[3]).toHaveAccessibleName("Question 4, not answered");
    expect(buttons[4]).toHaveAccessibleName("Question 5, not answered, flagged");
  });

  it("marks no question current while the contents or review view is open", () => {
    setup(null);
    expect(screen.queryByRole("button", { current: "step" })).not.toBeInTheDocument();
  });

  it("goes to a question and to review from the keyboard, in reading order", async () => {
    const user = userEvent.setup();
    const { onNavigate, onReview } = setup();
    await user.tab();
    expect(screen.getByRole("button", { name: /^Question 1,/ })).toHaveFocus();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledWith(1);

    screen.getByRole("button", { name: "Review and submit" }).focus();
    await user.keyboard(" ");
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("lays 50 questions out in five columns without dropping any", () => {
    setup(31, questions(50));
    const grid = screen.getByRole("list", { name: "Go to question" });
    expect(grid).toHaveClass("grid-cols-5");
    expect(within(grid).getAllByRole("button")).toHaveLength(50);
    expect(screen.getByRole("button", { name: "Question 32, not answered, current" })).toBeVisible();
  });

  it("explains the colours with a visible key", () => {
    setup();
    const key = screen.getByRole("list", { name: "Key" });
    expect(within(key).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Current",
      "Answered",
      "Not answered",
      "Flagged",
    ]);
  });

  it("shows the host's timer in its own card, before the question list", () => {
    render(
      <QuestionNavigatorPanel
        questions={questions(3)}
        currentIndex={0}
        onNavigate={() => {}}
        onReview={() => {}}
        timer={<span>35 minutes left</span>}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "All questions" });
    const timer = screen.getByText("35 minutes left");
    expect(panel).not.toContainElement(timer);
    expect(timer.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

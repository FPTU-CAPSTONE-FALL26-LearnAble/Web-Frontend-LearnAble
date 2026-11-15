import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentPlayer, type AssessmentPlayerProps } from "../AssessmentPlayer";
import type { PlayerQuestion } from "../assessment-player-types";

const questions: PlayerQuestion[] = [
  { id: "one", kind: "single", title: "Multiple choice", prompt: "First stem", options: ["A", "B"] },
  { id: "two", kind: "text", title: "Text entry", prompt: "Second stem" },
];

function renderPlayer(props: Partial<AssessmentPlayerProps> = {}) {
  const handlers = {
    onAnswerChange: vi.fn(),
    onToggleFlag: vi.fn(),
    onStartOver: vi.fn(),
    onGoToSubmission: vi.fn(),
  };
  render(
    <AssessmentPlayer
      title="Demo assessment"
      candidate={{ id: "C1", name: "Candidate" }}
      questions={questions}
      answers={{}}
      flagged={[]}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

describe("AssessmentPlayer", () => {
  it("opens on the contents table with the candidate and title", () => {
    renderPlayer();
    expect(screen.getByText("C1 - Candidate")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demo assessment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Unattempted Multiple choice" })).toBeInTheDocument();
  });

  it("reports answers and flags for the current question", async () => {
    const { onAnswerChange, onToggleFlag, user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("radio", { name: "A" }));
    expect(onAnswerChange).toHaveBeenCalledWith("one", "A");
    await user.click(screen.getByRole("button", { name: "Flag" }));
    expect(onToggleFlag).toHaveBeenCalledWith("one");
  });

  it("filters the contents to unanswered questions", async () => {
    const { user } = renderPlayer({ answers: { one: "A" } });
    await user.click(screen.getByRole("tab", { name: /Not attempted \(1\)/ }));
    expect(screen.queryByRole("button", { name: /^1 Answered/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 Unattempted Text entry" })).toBeInTheDocument();
  });

  it("submits from review and shows answered, flagged, and unattempted status badges", async () => {
    const { onGoToSubmission, user } = renderPlayer({
      answers: { one: "A" },
      flagged: ["two"],
    });
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(
      screen.getByRole("heading", { name: "Review your answers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 answered · 1 flagged · 1 unattempted out of 2 questions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Answered")).toBeInTheDocument();
    expect(screen.getByText("Flagged ⚑")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Finish & submit" }));
    expect(onGoToSubmission).toHaveBeenCalled();
  });

  it("forwards the submission action from the options overlay", async () => {
    const { onGoToSubmission, user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "Open options" }));
    await user.click(screen.getByRole("button", { name: /Go to submission page/ }));
    expect(onGoToSubmission).toHaveBeenCalled();
  });

  it("lets the candidate choose a contrast option from the options overlay", async () => {
    const onContrastChange = vi.fn();
    const { user } = renderPlayer({ contrast: "default", onContrastChange });

    await user.click(screen.getByRole("button", { name: "Open options" }));
    await user.click(screen.getByRole("button", { name: "Contrast" }));

    expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Inverted" }));
    expect(onContrastChange).toHaveBeenCalledWith("inverted");

    await user.click(screen.getByRole("radio", { name: "Yellow on black" }));
    expect(onContrastChange).toHaveBeenCalledWith("yellowOnBlack");
  });
});

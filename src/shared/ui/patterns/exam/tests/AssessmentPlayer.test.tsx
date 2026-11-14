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
    await user.click(screen.getByRole("button", { name: "Flag for review" }));
    expect(onToggleFlag).toHaveBeenCalledWith("one");
  });

  it("filters the contents to unanswered questions", async () => {
    const { user } = renderPlayer({ answers: { one: "A" } });
    await user.click(screen.getByRole("tab", { name: /Not attempted \(1\)/ }));
    expect(screen.queryByRole("button", { name: /^1 Answered/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 Unattempted Text entry" })).toBeInTheDocument();
  });

  it("starts over from review and opens the first question", async () => {
    const { onStartOver, user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: /Start over/ }));
    expect(onStartOver).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "First stem" })).toBeInTheDocument();
  });

  it("forwards the submission action from the options overlay", async () => {
    const { onGoToSubmission, user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "Open options" }));
    await user.click(screen.getByRole("button", { name: /Go to submission page/ }));
    expect(onGoToSubmission).toHaveBeenCalled();
  });
});

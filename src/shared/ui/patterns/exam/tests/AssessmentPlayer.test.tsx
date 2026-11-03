import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentPlayer, type AssessmentPlayerProps } from "../AssessmentPlayer";
import type { PlayerQuestion } from "../assessment-player-types";

const questions: PlayerQuestion[] = [
  { id: "one", kind: "single", title: "Multiple choice", prompt: "First stem", options: ["A", "B"] },
  { id: "two", kind: "text", title: "Text entry", prompt: "Second stem" },
];

it("lets full-page hosts focus a restored question on mount", () => {
  renderPlayer({ focusOnMount: true, navigation: { questionId: "two", view: "question", filter: "all" } });
  expect(screen.getByRole("heading", { name: "Second stem" })).toHaveFocus();
});

it("does not steal initial focus from an embedding host by default", () => {
  const input = document.createElement("input");
  document.body.append(input); input.focus();
  renderPlayer();
  expect(input).toHaveFocus();
  input.remove();
});

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
  it("reports controlled Options state and disables unsupported host settings", async () => {
    const onOptionsOpenChange = vi.fn();
    const { user } = renderPlayer({ optionsOpen: true, onOptionsOpenChange, onSelectSetting: vi.fn(), enabledSettings: ["contrast"] });
    expect(screen.getByRole("dialog", { name: "Options" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Language" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Contrast" }));
    expect(onOptionsOpenChange).toHaveBeenCalledWith(false);
  });
  it("moves keyboard focus to the new question heading", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "First stem" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Second stem" })).toHaveFocus();
  });
  it("disables reset when the host cannot clear an answer", async () => {
    const { user, onAnswerChange } = renderPlayer({ answers: { one: "A" }, canClearAnswer: false });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Reset answer" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reset answer" }));
    expect(onAnswerChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
  });

  it("keeps reset available for existing demos", async () => {
    const { user, onAnswerChange } = renderPlayer({ answers: { one: "A" } });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Reset answer" }));
    expect(onAnswerChange).toHaveBeenCalledWith("one", undefined);
  });

  it("also prevents implicit clearing by unchecking the last selected option", async () => {
    const { user, onAnswerChange } = renderPlayer({
      questions: [{ ...questions[0], kind: "multi" }], answers: { one: ["A"] }, canClearAnswer: false,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    expect(onAnswerChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
  });

  it("disables the advanced question reset when clearing is unavailable", async () => {
    const { user } = renderPlayer({
      questions: [{ ...questions[1], id: "one" }], answers: { one: "Existing text" }, canClearAnswer: false,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Reset response" })).toBeDisabled();
    expect(screen.getByLabelText("Enter your answer")).toHaveValue("Existing text");
  });

  it("counts only this session's answers and flags", () => {
    renderPlayer({ answers: { one: "A", previousExam: "B" }, flagged: ["two", "two", "previousExam"] });
    expect(screen.getByRole("tab", { name: "Not attempted (1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Flagged (1)" })).toBeInTheDocument();
  });

  it("opens on the contents table with the candidate and title", () => {
    renderPlayer();
    expect(screen.getByText("C1 - Candidate")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demo assessment", level: 1 })).toBeInTheDocument();
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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides restart in a live attempt and exposes review submission", async () => {
    const { user, onGoToSubmission } = renderPlayer({ onStartOver: undefined });
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByRole("button", { name: /Start over/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Go to submission page/ }));
    expect(onGoToSubmission).toHaveBeenCalledOnce();
  });

  it("renders supplied live status slots without inventing a connection", () => {
    renderPlayer({ status: "Offline", timer: <span>12:34</span>, saveStatus: <span>Saving</span>, inputModeIndicator: <span>Keyboard</span> });
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(screen.getByText("Saving")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("reports controlled navigation without mutating the host position", async () => {
    const onNavigationChange = vi.fn();
    const { user } = renderPlayer({ navigation: { questionId: "two", view: "question", filter: "all" }, onNavigationChange });
    expect(screen.getByRole("heading", { name: "Second stem" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onNavigationChange).toHaveBeenCalledWith({ questionId: "one", view: "question", filter: "all" });
    expect(screen.getByRole("heading", { name: "Second stem" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(onNavigationChange).toHaveBeenLastCalledWith({ questionId: "two", view: "review", filter: "all" });
  });

  it("restores by question id when question order changes", () => {
    renderPlayer({ questions: [...questions].reverse(), navigation: { questionId: "one", view: "question", filter: "flagged" } });
    expect(screen.getByRole("heading", { name: "First stem" })).toBeInTheDocument();
  });

  it("locks answer, reset and flag changes while retaining navigation", async () => {
    const { user, onAnswerChange, onToggleFlag } = renderPlayer({ interactionLocked: true, answers: { one: "A" } });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("radio", { name: "B" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "B" }));
    await user.click(screen.getByRole("button", { name: "Flag for review" }));
    expect(onAnswerChange).not.toHaveBeenCalled();
    expect(onToggleFlag).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("button", { name: /Start over/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Go to submission page/ })).toBeDisabled();
  });

  it("disables options that have no host handlers", async () => {
    const { user } = renderPlayer({ onGoToSubmission: undefined, onSelectSetting: undefined });
    await user.click(screen.getByRole("button", { name: "Open options" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Go to submission page/ })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: /Contrast/ })).toBeDisabled();
  });

  it("preserves the question language in the live player", async () => {
    const { user } = renderPlayer({ questions: [{ ...questions[0], stemLang: "vi" }] });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "First stem" })).toHaveAttribute("lang", "vi");
  });
});

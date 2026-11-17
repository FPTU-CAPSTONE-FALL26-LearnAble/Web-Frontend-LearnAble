import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerQuestion } from "../PlayerQuestion";
import type {
  Answer,
  PlayerQuestion as PlayerQuestionData,
} from "../assessment-player-types";

function renderQuestion(question: PlayerQuestionData, answer?: Answer) {
  const onAnswerChange = vi.fn();
  render(
    <PlayerQuestion
      question={question}
      questionNumber={1}
      questionCount={1}
      answer={answer}
      flagged={false}
      onAnswerChange={onAnswerChange}
      onReset={vi.fn()}
      onToggleFlag={vi.fn()}
    />,
  );
  return { onAnswerChange, user: userEvent.setup() };
}

const base = { id: "q", title: "Type", prompt: "Stem text" };

describe("PlayerQuestion", () => {
  it("restores and selects stable IDs even when two choices have the same label", async () => {
    const { user, onAnswerChange } = renderQuestion({
      ...base, kind: "single", options: [{ id: "srv-a", text: "Same label" }, { id: "srv-b", text: "Same label" }],
    }, "srv-a");
    const radios = screen.getAllByRole("radio", { name: "Same label" });
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    await user.click(radios[1]);
    expect(onAnswerChange).toHaveBeenCalledWith("srv-b");
  });

  it("uses stable IDs for multiple response without changing string demos", async () => {
    const { user, onAnswerChange } = renderQuestion({
      ...base, kind: "multi", options: [{ id: "srv-a", text: "Alpha" }, { id: "srv-b", text: "Beta" }],
    }, ["srv-a"]);
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Beta" }));
    expect(onAnswerChange).toHaveBeenCalledWith(["srv-a", "srv-b"]);
  });

  it.each<[PlayerQuestionData, () => HTMLElement]>([
    [{ ...base, kind: "single", options: ["A", "B"] }, () => screen.getByRole("radio", { name: "A" })],
    [{ ...base, kind: "multi", options: ["A", "B"] }, () => screen.getByRole("checkbox", { name: "A" })],
    [{ ...base, kind: "boolean" }, () => screen.getByRole("radio", { name: "True" })],
    [{ ...base, kind: "text" }, () => screen.getByLabelText("Enter your answer")],
    [{ ...base, kind: "numeric", suffix: "bits" }, () => screen.getByText("bits")],
    [{ ...base, kind: "essay" }, () => screen.getByLabelText("Write your essay")],
    [{ ...base, kind: "textarea" }, () => screen.getByLabelText("Write your response")],
    [{ ...base, kind: "upload" }, () => screen.getByText("Choose a file to upload")],
    [
      { ...base, kind: "hotspot", hotspots: [{ id: "A", label: "Boundary", x: 1, y: 1 }] },
      () => screen.getByRole("radio", { name: /Boundary/ }),
    ],
    [
      { ...base, kind: "graphic-text", fields: [{ id: "f", label: "Service" }] },
      () => screen.getByLabelText("Service"),
    ],
    [
      {
        ...base,
        kind: "composite",
        composite: {
          variant: "numeric-multiple-choice",
          partOneLabel: "Part one",
          partTwoLabel: "Part two",
          choices: ["Valid"],
        },
      },
      () => screen.getByLabelText("Part one"),
    ],
  ])("renders the %#th kind with its response control", (question, control) => {
    renderQuestion(question);
    expect(screen.getByText("Stem text")).toBeInTheDocument();
    expect(control()).toBeInTheDocument();
  });

  it("adds a multiple-response option to the existing selection", async () => {
    const { onAnswerChange, user } = renderQuestion(
      { ...base, kind: "multi", options: ["A", "B"] },
      ["A"],
    );
    await user.click(screen.getByRole("checkbox", { name: "B" }));
    expect(onAnswerChange).toHaveBeenCalledWith(["A", "B"]);
  });

  it("encodes the two parts of a composite answer", async () => {
    const { onAnswerChange, user } = renderQuestion({
      ...base,
      kind: "composite",
      composite: {
        variant: "true-false-multiple-response",
        partOneLabel: "Part one",
        partTwoLabel: "Part two",
        choices: ["Least privilege"],
      },
    }, "|Least privilege");
    await user.click(screen.getByRole("radio", { name: "True" }));
    expect(onAnswerChange).toHaveBeenCalledWith("true|Least privilege");
  });

  it("renders nothing for a composite question without configuration", () => {
    const { container } = render(
      <PlayerQuestion
        question={{ ...base, kind: "composite" }}
        questionNumber={1}
        questionCount={1}
        answer={undefined}
        flagged={false}
        onAnswerChange={vi.fn()}
        onReset={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

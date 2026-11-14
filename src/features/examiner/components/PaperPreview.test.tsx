import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { examPaperPreviewSchema } from "@/api/exams";
import { PaperPreview } from "./PaperPreview";

const preview = examPaperPreviewSchema.parse({
  examPaperId: "paper-1",
  version: 1,
  durationMinutes: 90,
  totalScore: 3,
  instructions: "No materials are allowed.",
  questions: [
    {
      examQuestionId: "eq-1", displayOrder: 1, maxScore: 1,
      snapshot: { questionId: "q-1", content: "Which structure is last in, first out?", questionType: "Single", difficulty: "Easy" },
      audio: { url: "https://audio.test/q1.mp3" },
      options: [
        { optionId: "o1", label: "A", content: "Stack", isCorrect: true },
        { optionId: "o2", label: "B", content: "Queue", isCorrect: false },
      ],
    },
    {
      examQuestionId: "eq-2", displayOrder: 2, maxScore: 2,
      snapshot: { questionId: "q-2", content: "Explain amortized cost.", questionType: "Essay", difficulty: "Hard", referenceAnswer: "Average over a sequence.", gradingCriteria: "Mentions the sequence." },
      options: [],
    },
  ],
});

describe("PaperPreview", () => {
  it("shows the paper facts, one question at a time, and a map to move between them", () => {
    render(<PaperPreview preview={preview} paperName="CSD201 Final" paperCode="CSD201-FINAL-01" />);
    expect(screen.getByRole("heading", { name: "CSD201 Final" })).toBeInTheDocument();
    expect(screen.getByText("90 minutes")).toBeInTheDocument();
    expect(screen.getByText("No materials are allowed.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Which structure is last in, first out?")).toBeInTheDocument();
    expect(screen.getByLabelText("Audio for question 1")).toHaveAttribute("src", "https://audio.test/q1.mp3");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Question 1 of 2/ }));
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("marks the correct answers, and hides them when asked", () => {
    render(<PaperPreview preview={preview} paperName="CSD201 Final" paperCode="" />);
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Show correct answers/ }));
    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
  });

  it("keeps an answer given in the preview and shows it as answered on the map", () => {
    render(<PaperPreview preview={preview} paperName="CSD201 Final" paperCode="" />);
    fireEvent.click(screen.getByRole("radio", { name: /Queue/ }));
    expect(screen.getByRole("button", { name: /^Question 1 of 2.*answered/ })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 answered in this preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("radio", { name: /Queue/ })).toBeChecked();
  });

  it("shows the reference answer for an essay while correct answers are shown", () => {
    render(<PaperPreview preview={preview} paperName="CSD201 Final" paperCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /^Question 2 of 2/ }));
    const essay = screen.getByRole("article", { name: "Question 2" });
    expect(within(essay).getByLabelText("Your response")).toBeInTheDocument();
    expect(within(essay).getByText(/Average over a sequence/)).toBeInTheDocument();
  });

  it("says so when the paper has no questions", () => {
    render(<PaperPreview preview={{ ...preview, questions: [] }} paperName="Empty" paperCode="" />);
    expect(screen.getByText("This paper has no questions yet.")).toBeInTheDocument();
  });
});

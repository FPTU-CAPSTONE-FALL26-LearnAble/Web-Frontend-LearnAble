import { ExamShell } from "../ExamShell";
import { QuestionCard } from "../QuestionCard";
import { AnswerOptionList } from "../AnswerOptionList";
import { it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { AssessmentPlayer } from "../AssessmentPlayer";
import { LiveRegion } from "@/shared/a11y/LiveRegion";

it("reads question position and stem from focused heading without a named region or selection announcement", async () => {
  function Attempt() {
    const [answer, setAnswer] = useState<string>();
    return <><LiveRegion /><AssessmentPlayer title="Exam" candidate={{ id: "1", name: "Student" }}
      questions={[{ id: "q1", kind: "single", title: "Choice", prompt: "Which collection?", options: ["HashSet", "List"] }]}
      answers={{ q1: answer }} flagged={[]} onAnswerChange={(_, next) => setAnswer(typeof next === "string" ? next : undefined)} onToggleFlag={() => {}} /></>;
  }
  const { container } = render(<Attempt />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: /Question 1 of 1\. Which collection\?/i })).toHaveFocus();
  expect(screen.queryByRole("region", { name: /Which collection/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "HashSet" }));
  expect(screen.getByRole("radio", { name: "HashSet" })).toBeChecked();
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
});


it.each([
  { id: "q", kind: "text" as const, title: "Text", prompt: "Enter the number" },
  { id: "q", kind: "boolean" as const, title: "True or false", prompt: "The claim holds" },
])("focuses position and actual stem for $kind questions", ({ id, kind, title, prompt }) => {
  render(<AssessmentPlayer title="Exam" candidate={{ id: "1", name: "Student" }}
    questions={[{ id, kind, title, prompt }]} answers={{}} flagged={[]}
    navigation={{ view: "question", questionId: id, filter: "all" }} focusOnMount
    onAnswerChange={() => {}} onToggleFlag={() => {}} />);
  expect(screen.getByRole("heading", { name: new RegExp(`Question 1 of 1\\. ${prompt}`, "i") })).toHaveFocus();
  expect(screen.queryByRole("region", { name: new RegExp(prompt) })).not.toBeInTheDocument();
});

it("focuses the new question in the compact exam shell and keeps native answer feedback quiet", async () => {
  function CompactAttempt() {
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState<string | null>(null);
    return <><LiveRegion /><ExamShell title="Practice" questions={[{ id: "a", answered: false, flagged: false }, { id: "b", answered: false, flagged: false }]} currentIndex={index} onNavigate={setIndex} submitAction={<button>Finish</button>}>
      <QuestionCard index={index + 1} total={2} stem={index ? "Second prompt" : "First prompt"}><AnswerOptionList options={[{ id: "a", letter: "A", text: "Answer" }]} value={answer} onChange={setAnswer} /></QuestionCard>
    </ExamShell></>;
  }
  const { container } = render(<CompactAttempt />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Question 2 of 2. Second prompt" })).toHaveFocus();
  expect(screen.queryByRole("group", { name: /Question 2/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "A. Answer" }));
  expect(screen.getByRole("radio", { name: "A. Answer" })).toBeChecked();
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
});

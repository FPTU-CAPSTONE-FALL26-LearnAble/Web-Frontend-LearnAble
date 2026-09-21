import { describe, it, expect, vi as vitest } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamShell } from "@/shared/ui/patterns/exam/ExamShell";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("ExamShell pattern", () => {
  const questions = [
    { id: "q1", answered: true, flagged: false },
    { id: "q2", answered: false, flagged: true },
    { id: "q3", answered: false, flagged: false },
  ];

  it("renders landmarks and question navigation with exam sizing", async () => {
    const onNavigate = vitest.fn();
    const { container } = render(
      <ExamShell
        title="Bài thi thử"
        questions={questions}
        currentIndex={0}
        onNavigate={onNavigate}
        submitAction={<button type="button">Nộp bài</button>}
      >
        <div>Nội dung câu hỏi</div>
      </ExamShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const qButtons = screen.getAllByRole("button", { name: /Question/i });
    expect(qButtons).toHaveLength(3);
    expect(qButtons[0]).toHaveClass("min-h-[52px]");

    fireEvent.click(qButtons[1]);
    expect(onNavigate).toHaveBeenCalledWith(1);

    await expectNoAxeViolations(container);
  });

  it("disables previous on first question and next on last question", () => {
    const onNavigate = vitest.fn();
    const { rerender } = render(
      <ExamShell
        title="Bài thi thử"
        questions={questions}
        currentIndex={0}
        onNavigate={onNavigate}
        submitAction={<button type="button">Nộp bài</button>}
      >
        <div>Nội dung</div>
      </ExamShell>,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();

    rerender(
      <ExamShell
        title="Bài thi thử"
        questions={questions}
        currentIndex={2}
        onNavigate={onNavigate}
        submitAction={<button type="button">Nộp bài</button>}
      >
        <div>Nội dung</div>
      </ExamShell>,
    );

    expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

import { type ReactNode } from "react";
import { Check, Flag } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  SaveStatus,
  type SaveState,
} from "@/shared/ui/patterns/exam/SaveStatus";
import { announce } from "@/shared/a11y/announcer";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface ExamShellQuestionState {
  id: string;
  answered: boolean;
  flagged: boolean;
}

export interface ExamShellProps {
  /** Tên bài thi / bộ đề — <h1> của màn hình */
  title: string;
  questions: ExamShellQuestionState[];
  currentIndex: number; // 0-based
  onNavigate: (index: number) => void;
  /** Slot của desktop: đồng hồ đếm ngược (SCR-03). Luyện tập không truyền. */
  timer?: ReactNode;
  /** Slot của desktop: chỉ báo chế độ nhập / trạng thái camera (FR-05, RULE-08) */
  inputModeIndicator?: ReactNode;
  /** FR-06 — luyện tập (local) có thể không truyền */
  saveState?: SaveState;
  /** Nút nộp bài do feature compose (kèm Dialog xác nhận) — mức độ "chung cuộc" là việc của feature */
  submitAction: ReactNode;
  /** Câu hỏi hiện tại (QuestionCard + AnswerOptionList) */
  children: ReactNode;
}

/**
 * SCR-03 (thi) và SCR-04 (luyện tập) là MỘT màn hình theo FR-07 — khác nhau
 * bằng props, không fork. Landmark đầy đủ: banner / navigation / main / contentinfo.
 */
export function ExamShell({
  title,
  questions,
  currentIndex,
  onNavigate,
  timer,
  inputModeIndicator,
  saveState,
  submitAction,
  children,
}: ExamShellProps) {
  const total = questions.length;

  const goTo = (index: number) => {
    if (index < 0 || index >= total) return;
    onNavigate(index);
    announce(vi.announce.questionChanged(index + 1, total));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        role="banner"
        className="flex flex-wrap items-center gap-4 border-b-2 border-border px-6 py-3"
      >
        <h1
          tabIndex={-1}
          className="text-xl font-bold text-foreground"
        >
          {title}
        </h1>
        <div className="ms-auto flex items-center gap-4">
          {saveState ? <SaveStatus state={saveState} /> : null}
          {inputModeIndicator}
          {timer}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
        <nav
          aria-label={vi.exam.questionListLabel}
          className="md:w-64 shrink-0"
        >
          <ul className="grid grid-cols-5 gap-2 md:grid-cols-4">
            {questions.map((q, i) => {
              const stateText = q.answered
                ? vi.exam.answered
                : vi.exam.unanswered;
              const flagText = q.flagged ? `, ${vi.exam.flagged}` : "";
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    aria-label={`${vi.exam.question(i + 1, total)}: ${stateText}${flagText}`}
                    aria-current={i === currentIndex ? "true" : undefined}
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative flex min-h-[52px] w-full min-w-[52px] items-center justify-center rounded-md border-2 border-border text-lg font-bold transition-colors focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2",
                      q.answered &&
                        "border-primary bg-primary/10 text-primary",
                      i === currentIndex &&
                        "outline-3 outline-primary outline-offset-2",
                    )}
                  >
                    {i + 1}
                    {q.answered ? (
                      <Check
                        aria-hidden
                        className="absolute right-1 top-1 size-4"
                        strokeWidth={3}
                      />
                    ) : null}
                    {q.flagged ? (
                      <Flag
                        aria-hidden
                        className="absolute left-1 top-1 size-4 fill-current"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" className="flex-1">
          {children}
        </main>
      </div>

      <footer
        role="contentinfo"
        className="flex flex-wrap items-center gap-4 border-t-2 border-border px-6 py-3"
      >
        <Button
          size="lg"
          variant="secondary"
          className="min-h-[3.25rem] px-6 text-base font-semibold"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
        >
          {vi.common.previous}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="min-h-[3.25rem] px-6 text-base font-semibold"
          disabled={currentIndex === total - 1}
          onClick={() => goTo(currentIndex + 1)}
        >
          {vi.common.next}
        </Button>
        <div className="ms-auto">{submitAction}</div>
      </footer>
    </div>
  );
}

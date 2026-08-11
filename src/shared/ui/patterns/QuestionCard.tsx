import { type ReactNode } from "react";
import { Flag } from "lucide-react";
import { Card } from "@/shared/ui/primitives/Card";
import { Button } from "@/shared/ui/primitives/Button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface QuestionCardProps {
  index: number; // 1-based
  total: number;
  stem: string;
  /** Nội dung tiếng Anh thật (đề tiếng Anh, code) truyền lang="en" để NVDA đổi giọng */
  stemLang?: string;
  flagged?: boolean;
  onToggleFlag?: () => void;
  /** AnswerOptionList (hoặc dạng câu hỏi khác sau này) */
  children: ReactNode;
}

/**
 * Khung một câu hỏi — SCR-03/SCR-04 dùng chung. Khác biệt (timer, nộp bài)
 * nằm ở ExamShell, không nằm ở đây.
 */
export function QuestionCard({
  index,
  total,
  stem,
  stemLang,
  flagged,
  onToggleFlag,
  children,
}: QuestionCardProps) {
  return (
    <Card aria-labelledby="question-heading" role="group" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h2 id="question-heading" tabIndex={-1} className="text-[length:var(--text-xl)] font-bold">
          {vi.exam.question(index, total)}
        </h2>
        {onToggleFlag ? (
          <Button
            variant={flagged ? "secondary" : "ghost"}
            aria-pressed={flagged}
            onClick={onToggleFlag}
          >
            <Flag aria-hidden className={cn("size-5", flagged && "fill-current")} />
            {flagged ? vi.exam.flagged : vi.exam.flagQuestion}
          </Button>
        ) : null}
      </div>
      <p lang={stemLang} className="text-[length:var(--text-lg)]">
        {stem}
      </p>
      {children}
    </Card>
  );
}

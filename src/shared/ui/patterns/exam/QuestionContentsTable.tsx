import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import {
  answerState,
  type Answers,
  type PlayerQuestion,
} from "./assessment-player-types";

export interface QuestionContentsTableProps {
  /** All questions, used to number the visible rows. */
  questions: PlayerQuestion[];
  visibleQuestions: PlayerQuestion[];
  answers: Answers;
  flagged: string[];
  /** Kept for compatibility with callers; status badge surfaces flag state. */
  showFlagColumn?: boolean;
  onOpenQuestion: (index: number) => void;
}

export function QuestionContentsTable({
  questions,
  visibleQuestions,
  answers,
  flagged,
  onOpenQuestion,
}: QuestionContentsTableProps) {
  const strings = vi.exam.player;
  return (
    <section
      aria-labelledby="section-one-heading"
      className="overflow-hidden rounded border border-border bg-background"
    >
      <h3 id="section-one-heading" className="sr-only">
        {strings.section(1)}
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="h-10 border-b border-border bg-player-table-header hover:bg-player-table-header">
            <TableHead className="w-16 pl-5 text-[13px] font-semibold text-muted-foreground">
              {strings.columnNumber}
            </TableHead>
            <TableHead className="w-44 text-[13px] font-semibold text-muted-foreground">
              {strings.columnStatus}
            </TableHead>
            <TableHead className="text-[13px] font-semibold text-muted-foreground">
              {strings.columnType}
            </TableHead>
            <TableHead className="w-24 pr-5 text-right text-[13px] font-semibold text-muted-foreground">
              {strings.columnAction}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleQuestions.map((question) => {
            const number = questions.indexOf(question);
            const answered = answerState(answers[question.id]);
            const isFlagged = flagged.includes(question.id);
            const badgeStyle = isFlagged
              ? "border-player-flag-border bg-player-flag text-player-flag-foreground"
              : answered
                ? "border-player-accent-soft-border bg-player-accent-soft text-player-accent-soft-foreground"
                : "border-player-neutral-badge-border bg-player-neutral-badge text-player-neutral-badge-foreground";
            const badgeLabel = isFlagged
              ? strings.flaggedBadge
              : answered
                ? strings.answered
                : strings.unattempted;

            return (
              <TableRow
                key={question.id}
                role="button"
                tabIndex={0}
                className="h-[46px] cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30"
                aria-label={strings.contentsRowLabel(
                  number + 1,
                  answered,
                  question.title,
                  isFlagged,
                )}
                onClick={() => onOpenQuestion(number)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenQuestion(number);
                  }
                }}
              >
                <TableCell className="pl-5 text-base font-semibold text-foreground">
                  {number + 1}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-2.5 py-0.5 text-sm font-semibold",
                      badgeStyle,
                    )}
                  >
                    {badgeLabel}
                  </span>
                </TableCell>
                <TableCell className="text-base text-foreground">
                  {question.title}
                </TableCell>
                <TableCell className="pr-5 text-right text-base text-muted-foreground">
                  {strings.viewAction}
                </TableCell>
              </TableRow>
            );
          })}
          {visibleQuestions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {strings.noMatches}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </section>
  );
}

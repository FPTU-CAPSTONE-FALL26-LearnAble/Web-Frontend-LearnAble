import { Bookmark } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
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
  /** The review table omits the flag column. */
  showFlagColumn: boolean;
  onOpenQuestion: (index: number) => void;
}

export function QuestionContentsTable({
  questions,
  visibleQuestions,
  answers,
  flagged,
  showFlagColumn,
  onOpenQuestion,
}: QuestionContentsTableProps) {
  const strings = vi.exam.player;
  return (
    <section aria-labelledby="section-one-heading">
      <h3
        id="section-one-heading"
        className="border-b border-border bg-secondary px-5 py-4 text-base font-semibold text-foreground"
      >
        {strings.section(1)}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{strings.columnQuestion}</TableHead>
            <TableHead>{strings.columnType}</TableHead>
            {showFlagColumn ? <TableHead>{strings.columnFlag}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleQuestions.map((question) => {
            const number = questions.indexOf(question);
            const answered = answerState(answers[question.id]);
            const isFlagged = flagged.includes(question.id);
            return (
              <TableRow
                key={question.id}
                role="button"
                tabIndex={0}
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
                <TableCell>
                  <span>
                    <span>{number + 1}</span>
                    <span>
                      {answered ? strings.answered : strings.unattempted}
                    </span>
                  </span>
                </TableCell>
                <TableCell>{question.title}</TableCell>
                {showFlagColumn ? (
                  <TableCell>
                    {isFlagged ? (
                      <Bookmark aria-label={strings.filterFlagged} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
          {visibleQuestions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showFlagColumn ? 3 : 2}>
                {strings.noMatches}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </section>
  );
}

import { Check, X } from "lucide-react";
import { Link, useParams } from "react-router";
import { describeError } from "@/app/providers";
import type { QuestionGrade } from "@/api/assessmentAttempt";
import { usePracticeResult } from "@/features/practice/api/usePracticeSessions";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.practice;

const backLink =
  "inline-flex min-h-14 w-fit items-center rounded-md border-4 border-foreground px-6 text-xl font-extrabold underline-offset-4 hover:underline";

/**
 * SCR-06 (practice) — the score and the question-by-question review of a
 * submitted practice attempt, in the same grading shape as an exam result.
 * Before the lecturer releases results the Backend refuses, and the page says
 * why in its own words.
 */
export function PracticeResultRoute() {
  const { sessionId = "" } = useParams<"sessionId">();
  useRouteAnnouncer(vi.exam.pageTitle(t.resultHeading), t.resultHeading);
  const result = usePracticeResult(sessionId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 text-lg">
      <header className="flex flex-col gap-3 border-b-4 border-foreground pb-6">
        <h1 tabIndex={-1} className="text-5xl font-extrabold tracking-tight">
          {t.resultHeading}
        </h1>
      </header>

      {result.isPending ? <p role="status">{vi.common.loading}</p> : null}
      {result.isError ? (
        <div className="flex flex-col gap-3 rounded-lg border-4 border-foreground p-6">
          <p className="text-xl font-bold">{t.resultPending}</p>
          <p>{describeError(result.error)}</p>
        </div>
      ) : null}

      {result.data ? (
        <>
          <section aria-label={t.resultHeading} className="flex flex-col gap-3 rounded-lg border-4 border-foreground bg-card p-6">
            {result.data.result.totalScore != null ? (
              <p className="text-4xl font-extrabold">
                {t.totalScore(result.data.result.totalScore, result.data.result.maxScore)}
              </p>
            ) : null}
            {result.data.result.scoreOnTen != null ? (
              <p className="text-2xl font-bold">{t.scoreOnTen(result.data.result.scoreOnTen)}</p>
            ) : null}
            {result.data.result.passed != null ? (
              <p className="w-fit rounded-md border-2 border-foreground px-3 py-1 text-xl font-extrabold uppercase">
                {result.data.result.passed ? t.passed : t.notPassed}
              </p>
            ) : null}
            {result.data.result.gradingStatus ? <p>{t.grading(result.data.result.gradingStatus)}</p> : null}
          </section>

          {result.data.review.length ? (
            <ol aria-label={t.reviewLabel} className="flex flex-col gap-5">
              {[...result.data.review]
                .sort((a, b) => a.position - b.position)
                .map((grade, index) => (
                  <li key={grade.attemptQuestionId}>
                    <ReviewItem grade={grade} number={index + 1} />
                  </li>
                ))}
            </ol>
          ) : null}
        </>
      ) : null}

      <Link to="/practice" className={backLink}>
        {t.backToList}
      </Link>
    </div>
  );
}

function ReviewItem({ grade, number }: { grade: QuestionGrade; number: number }) {
  const headingId = `review-${grade.attemptQuestionId}`;
  const options = [...grade.options].sort((a, b) => a.position - b.position);
  const choice = grade.questionType === "Single" || grade.questionType === "Multiple";
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-2xl font-extrabold">
          {t.questionHeading(number)} · {t.questionTypes[grade.questionType]}
        </h2>
        <p className="text-xl font-bold">{t.points(grade.score, grade.maxScore)}</p>
      </div>
      {grade.content ? <p className="whitespace-pre-line">{grade.content}</p> : null}

      {choice ? (
        <ul className="flex flex-col gap-2">
          {options.map((option) => {
            const chosen = grade.selectedOptionIds.includes(option.optionId);
            return (
              <li
                key={option.optionId}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-md border-2 p-3",
                  option.isCorrect ? "border-foreground" : "border-border",
                )}
              >
                {option.isCorrect ? (
                  <Check aria-hidden className="size-6 shrink-0" strokeWidth={3} />
                ) : chosen ? (
                  <X aria-hidden className="size-6 shrink-0" strokeWidth={3} />
                ) : (
                  <span aria-hidden className="size-6 shrink-0" />
                )}
                <span className="flex-1">{option.content}</span>
                {/* The state is written out, never shown by colour or icon alone. */}
                {chosen ? <span className="font-extrabold">{t.chosen}</span> : null}
                {option.isCorrect ? <span className="font-extrabold">{t.correctOption}</span> : null}
              </li>
            );
          })}
          {grade.selectedOptionIds.length === 0 ? <li className="font-bold">{t.noAnswer}</li> : null}
        </ul>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-extrabold">{t.yourAnswer}</p>
          <p className="whitespace-pre-line rounded-md border-2 border-border p-3">{grade.answerText?.trim() || t.noAnswer}</p>
        </div>
      )}

      {grade.referenceAnswer ? (
        <div className="flex flex-col gap-2">
          <p className="font-extrabold">{t.referenceAnswer}</p>
          <p className="whitespace-pre-line">{grade.referenceAnswer}</p>
        </div>
      ) : null}
      {grade.feedback ? (
        <div className="flex flex-col gap-2">
          <p className="font-extrabold">{t.feedback}</p>
          <p className="whitespace-pre-line">{grade.feedback}</p>
        </div>
      ) : null}
    </article>
  );
}

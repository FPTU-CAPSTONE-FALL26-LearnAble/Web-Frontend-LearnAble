import { CalendarClock, Check, X } from "lucide-react";
import { Link } from "react-router";
import type { ExamResult } from "@/api/results";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResults } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";
import { formatExamDate } from "@/features/schedule/scheduleView";

const t = vi.results;

export const resultButton =
  "inline-flex min-h-14 w-fit items-center justify-center rounded-md border-4 border-foreground px-6 text-xl font-extrabold underline-offset-4 hover:underline";

/** The score line of a released result: points, out of ten, passed. */
export function ScoreLine({ result, large = false }: { result: ExamResult; large?: boolean }) {
  return (
    <>
      {result.score !== null ? (
        <p className={large ? "text-5xl font-extrabold tracking-tight" : "text-3xl font-extrabold tracking-tight"}>
          {result.maxScore !== null ? t.score(result.score, result.maxScore) : t.scoreOnly(result.score)}
        </p>
      ) : null}
      {result.scoreOnTen !== null || result.passed !== null ? (
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xl font-bold">
          {result.scoreOnTen !== null ? <span>{t.scoreOnTen(result.scoreOnTen)}</span> : null}
          {result.passed !== null ? (
            <span className="flex items-center gap-2 font-extrabold uppercase">
              {result.passed ? <Check aria-hidden className="size-6" strokeWidth={3} /> : <X aria-hidden className="size-6" strokeWidth={3} />}
              {result.passed ? t.status.passed : t.status.failed}
            </span>
          ) : null}
        </p>
      ) : null}
    </>
  );
}

/** SCR-07 (list) — FR-10: one card per finished exam, with its score once released. */
export function ResultsListRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const { schedules, rows } = useExamResults();

  return (
    <div className="flex flex-col gap-8 text-lg">
      <header className="flex flex-col gap-3 border-b-4 border-foreground pb-6">
        <h1 tabIndex={-1} className="text-5xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="max-w-prose text-xl">{t.intro}</p>
      </header>

      {schedules.isPending ? <p role="status">{vi.common.loading}</p> : null}
      {schedules.isError ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border-4 border-destructive p-5">
          <p className="font-bold text-destructive">{t.loadError}</p>
          <button type="button" onClick={() => void schedules.refetch()} className={resultButton}>
            {vi.common.retry}
          </button>
        </div>
      ) : null}

      {schedules.data && rows.length === 0 ? (
        <p className="rounded-lg border-4 border-foreground p-6 text-xl">{t.noResults}</p>
      ) : null}

      {rows.length > 0 ? (
        <ul aria-label={t.listLabel} className="flex flex-col gap-5">
          {rows.map(({ exam, result, isError }) => {
            const { schedule } = exam;
            const name = schedule.examName?.trim() || vi.schedule.untitledExam;
            return (
              <li key={schedule.examScheduleId}>
                <article
                  aria-label={name}
                  className="flex flex-col gap-5 rounded-lg border-4 border-foreground bg-card p-6 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <h2 className="text-3xl font-extrabold tracking-tight">{name}</h2>
                    <p className="flex items-center gap-2">
                      <CalendarClock aria-hidden className="size-5 shrink-0" />
                      <time dateTime={schedule.startsAt}>{formatExamDate(schedule.startsAt)}</time>
                    </p>
                    {isError ? (
                      <p className="font-bold text-destructive">{t.resultError}</p>
                    ) : result === undefined ? (
                      <p role="status">{vi.common.loading}</p>
                    ) : result === null ? (
                      <ResultStatus status="notReleased" />
                    ) : (
                      <>
                        <ScoreLine result={result} />
                        <ResultStatus status={result.status} />
                      </>
                    )}
                  </div>
                  {result ? (
                    <Link
                      to={`/results/${schedule.examScheduleId}`}
                      aria-label={t.detailFor(name)}
                      className={resultButton}
                    >
                      {t.detail}
                    </Link>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

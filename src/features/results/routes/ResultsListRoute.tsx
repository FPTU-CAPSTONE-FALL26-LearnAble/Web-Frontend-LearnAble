import { Link } from "react-router";
import { Button } from "@/shared/ui/primitives/button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResults } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";
import { formatExamDate } from "@/features/schedule/scheduleView";

const t = vi.results;

/** SCR-07 (list) — FR-10: one row per finished exam, with its result once released. */
export function ResultsListRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const { schedules, rows } = useExamResults();

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-2xl font-bold">
        {t.title}
      </h1>

      {schedules.isPending ? <p role="status">{vi.common.loading}</p> : null}
      {schedules.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-destructive p-6"
        >
          <p className="font-semibold text-destructive">{t.loadError}</p>
          <Button variant="secondary" onClick={() => schedules.refetch()}>
            {vi.common.retry}
          </Button>
        </div>
      ) : null}

      {schedules.data && rows.length === 0 ? <p>{t.noResults}</p> : null}

      {rows.length > 0 ? (
        <ul aria-label={t.listLabel} className="flex flex-col gap-4">
          {rows.map(({ exam, result, isError }) => {
            const { schedule } = exam;
            const name = schedule.examName?.trim() || vi.schedule.untitledExam;
            return (
              <li key={schedule.examScheduleId}>
                <article
                  aria-label={name}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{name}</h2>
                    <p className="mt-1 text-muted-foreground">
                      <time dateTime={schedule.startsAt}>{formatExamDate(schedule.startsAt)}</time>
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-4">
                      {isError ? (
                        <span className="font-semibold text-destructive">{t.resultError}</span>
                      ) : result === undefined ? (
                        <span role="status">{vi.common.loading}</span>
                      ) : result === null ? (
                        <ResultStatus status="notReleased" />
                      ) : (
                        <>
                          {result.score !== null ? (
                            <span className="font-semibold">
                              {result.maxScore !== null
                                ? t.score(result.score, result.maxScore)
                                : t.scoreOnly(result.score)}
                            </span>
                          ) : null}
                          <ResultStatus status={result.status} />
                        </>
                      )}
                    </p>
                  </div>
                  {result ? (
                    <Button asChild variant="secondary">
                      <Link
                        to={`/results/${schedule.examScheduleId}`}
                        aria-label={t.detailFor(name)}
                      >
                        {t.detail}
                      </Link>
                    </Button>
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

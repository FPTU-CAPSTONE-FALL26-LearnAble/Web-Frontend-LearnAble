import { Link, useParams } from "react-router";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResult } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";
import { ScoreLine, resultButton } from "@/features/results/routes/ResultsListRoute";
import { useMyExamSchedules } from "@/features/schedule/api/useMyExamSchedules";
import { formatExamDate, formatExamTime } from "@/features/schedule/scheduleView";

const t = vi.results;
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
});

function BackLink() {
  return (
    <Link to="/results" className={resultButton}>
      {t.backToList}
    </Link>
  );
}

/** SCR-07 (detail) — FR-10: the released score of one exam schedule. */
export function ResultDetailRoute() {
  const { scheduleId } = useParams<"scheduleId">();
  const resultQuery = useExamResult(scheduleId!);
  const schedules = useMyExamSchedules();
  const schedule = schedules.data?.find(
    (item) => item.schedule.examScheduleId === scheduleId,
  )?.schedule;
  const name = schedule?.examName?.trim() || t.title;

  useRouteAnnouncer(t.pageTitle, name);

  const heading = (
    <header className="border-b-4 border-foreground pb-6">
      <h1 tabIndex={-1} className="text-5xl font-extrabold tracking-tight">
        {name}
      </h1>
    </header>
  );

  if (resultQuery.isPending) return <p role="status">{vi.common.loading}</p>;
  if (resultQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 text-lg">
        {heading}
        <div className="flex flex-col items-start gap-4 rounded-lg border-4 border-destructive p-5">
          <p role="alert" className="font-bold text-destructive">
            {t.resultError}
          </p>
          <button type="button" onClick={() => void resultQuery.refetch()} className={resultButton}>
            {vi.common.retry}
          </button>
        </div>
        <BackLink />
      </div>
    );
  }

  const result = resultQuery.data;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-lg">
      {heading}

      <section aria-label={t.title} className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6">
        {result ? (
          <>
            <ScoreLine result={result} large />
            <ResultStatus status={result.status} />
            {result.status === "pending" ? <p className="font-semibold">{t.pendingNote}</p> : null}
          </>
        ) : (
          <>
            <ResultStatus status="notReleased" />
            <p className="font-semibold">{t.notReleasedNote}</p>
          </>
        )}
        <div className="flex flex-col gap-1 border-t-2 border-border pt-4">
          {schedule ? (
            <p>
              {t.examDate(
                formatExamDate(schedule.startsAt),
                formatExamTime(schedule.startsAt),
                formatExamTime(schedule.endsAt),
              )}
            </p>
          ) : null}
          {result?.submittedAt ? (
            <p>{t.submittedAt(dateTimeFormat.format(new Date(result.submittedAt)))}</p>
          ) : null}
          {result?.releasedAt ? (
            <p>{t.releasedAt(dateTimeFormat.format(new Date(result.releasedAt)))}</p>
          ) : null}
        </div>
      </section>

      <BackLink />
    </div>
  );
}

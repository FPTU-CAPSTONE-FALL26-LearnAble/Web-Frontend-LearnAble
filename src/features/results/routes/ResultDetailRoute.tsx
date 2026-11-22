import { Link, useParams } from "react-router";
import { Button } from "@/shared/ui/primitives/button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResult } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";
import { useMyExamSchedules } from "@/features/schedule/api/useMyExamSchedules";
import { formatExamDate, formatExamTime } from "@/features/schedule/scheduleView";

const t = vi.results;
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
});

function BackLink() {
  return (
    <Button asChild variant="secondary" className="self-start">
      <Link to="/results">{t.backToList}</Link>
    </Button>
  );
}

/** SCR-07 (detail) — FR-10: the result of one exam schedule. */
export function ResultDetailRoute() {
  const { scheduleId } = useParams<"scheduleId">();
  const resultQuery = useExamResult(scheduleId!);
  const schedules = useMyExamSchedules();
  const schedule = schedules.data?.find(
    (item) => item.schedule.examScheduleId === scheduleId,
  )?.schedule;
  const name = schedule?.examName?.trim() || t.title;

  useRouteAnnouncer(t.pageTitle, name);

  if (resultQuery.isPending) return <p role="status">{vi.common.loading}</p>;
  if (resultQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 tabIndex={-1} className="text-2xl font-bold">
          {name}
        </h1>
        <p role="alert" className="font-semibold text-destructive">
          {t.resultError}
        </p>
        <Button variant="secondary" onClick={() => resultQuery.refetch()}>
          {vi.common.retry}
        </Button>
        <BackLink />
      </div>
    );
  }

  const result = resultQuery.data;
  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-2xl font-bold">
        {name}
      </h1>

      <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-card p-6">
        {result ? (
          <>
            {result.score !== null ? (
              <p className="text-xl font-bold">
                {result.maxScore !== null
                  ? t.score(result.score, result.maxScore)
                  : t.scoreOnly(result.score)}
              </p>
            ) : null}
            <p>
              <ResultStatus status={result.status} />
            </p>
            {result.status === "pending" ? <p>{t.pendingNote}</p> : null}
          </>
        ) : (
          <>
            <p>
              <ResultStatus status="notReleased" />
            </p>
            <p>{t.notReleasedNote}</p>
          </>
        )}
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

      <BackLink />
    </div>
  );
}

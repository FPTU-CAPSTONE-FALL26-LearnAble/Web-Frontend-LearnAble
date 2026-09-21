import { Card, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { usePracticeProgress } from "@/features/progress/api/usePracticeProgress";

const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" });

/** SCR-06 — FR-09 */
export function ProgressRoute() {
  useRouteAnnouncer(vi.progress.pageTitle, vi.progress.title);
  const progressQuery = usePracticeProgress();

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
        {vi.progress.title}
      </h1>

      {progressQuery.isPending ? <p>{vi.common.loading}</p> : null}
      {progressQuery.isError ? (
        <Button variant="secondary" onClick={() => progressQuery.refetch()}>
          {vi.common.retry}
        </Button>
      ) : null}

      {progressQuery.data ? (
        <>
          <Card aria-label={vi.progress.summaryLabel} className="flex flex-wrap gap-8">
            <p className="text-[length:var(--text-lg)] font-bold">
              {vi.progress.attempts(progressQuery.data.attempts)}
            </p>
            <p className="text-[length:var(--text-lg)] font-bold">
              {vi.progress.avgScore(progressQuery.data.avgScorePct)}
            </p>
          </Card>

          <Card>
            <CardTitle>{vi.progress.weakTopics}</CardTitle>
            {progressQuery.data.weakTopics.length === 0 ? (
              <p className="mt-3">{vi.progress.noWeakTopics}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {progressQuery.data.weakTopics.map((t) => (
                  <li key={t.topic} className="flex justify-between gap-4">
                    <span>{t.topic}</span>
                    {/* Độ chính xác kèm chữ, không chỉ thanh màu */}
                    <span className="font-medium">{t.accuracyPct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle>{vi.progress.historyLabel}</CardTitle>
            {progressQuery.data.history.length === 0 ? (
              <p className="mt-3">{vi.progress.noHistory}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {progressQuery.data.history.map((h) => (
                  <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] pb-3 last:border-none">
                    <span>{h.setTitle}</span>
                    <span className="font-medium">
                      {vi.practice.score(h.correct, h.total)} —{" "}
                      {dateFormat.format(new Date(h.completedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

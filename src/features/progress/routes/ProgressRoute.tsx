import { Check, X } from "lucide-react";
import { Link } from "react-router";
import { describeError } from "@/app/providers";
import { usePracticeProgress } from "@/features/progress/api/usePracticeProgress";
import type { HistoryItem, ProgressSummary } from "@/features/progress/progressSummary";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";

const t = vi.progress;

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const button =
  "inline-flex min-h-14 w-fit items-center justify-center rounded-md border-4 border-foreground px-6 text-xl font-extrabold underline-offset-4 hover:underline";

/**
 * SCR-06 — FR-09. Practice progress worked out from the released practice
 * results (see `progressSummary.ts`). Every figure is written as text; bars
 * only repeat what the text already says.
 */
export function ProgressRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const progress = usePracticeProgress();

  return (
    <div className="flex flex-col gap-8 text-lg">
      <header className="flex flex-col gap-3 border-b-4 border-foreground pb-6">
        <h1 tabIndex={-1} className="text-5xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="max-w-prose text-xl">{t.intro}</p>
      </header>

      {progress.isPending ? <p role="status">{vi.common.loading}</p> : null}
      {progress.error ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border-4 border-destructive p-5">
          <p className="font-bold text-destructive">{describeError(progress.error)}</p>
          <button type="button" onClick={() => void progress.refetch()} className={button}>
            {vi.common.retry}
          </button>
        </div>
      ) : null}

      {progress.summary && !progress.isPending ? (
        <Summary summary={progress.summary} failedResults={progress.failedResults} />
      ) : null}
    </div>
  );
}

function Summary({ summary, failedResults }: { summary: ProgressSummary; failedResults: number }) {
  return (
    <>
      <section aria-label={t.summaryLabel}>
        <dl className="grid gap-5 sm:grid-cols-3">
          <Stat label={t.attemptsLabel} value={String(summary.attempts)} />
          <Stat
            label={t.averageLabel}
            value={summary.averagePercent == null ? t.noScore : t.averagePercent(summary.averagePercent)}
            detail={summary.averageOnTen == null ? undefined : t.averageOnTen(summary.averageOnTen)}
          />
          <Stat
            label={t.passedLabel}
            value={summary.attempts ? t.passedCount(summary.passed, summary.attempts) : t.noScore}
          />
        </dl>
      </section>

      {summary.awaitingResults > 0 ? (
        <p className="rounded-lg border-4 border-foreground p-5 font-semibold">{t.awaiting(summary.awaitingResults)}</p>
      ) : null}
      {failedResults > 0 ? (
        <p role="alert" className="rounded-lg border-4 border-destructive p-5 font-semibold text-destructive">
          {t.incomplete(failedResults)}
        </p>
      ) : null}

      {summary.byType.length ? (
        <section aria-labelledby="progress-by-type" className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6">
          <h2 id="progress-by-type" className="text-3xl font-extrabold tracking-tight">
            {t.byTypeLabel}
          </h2>
          <p>{t.byTypeHint}</p>
          <ul className="flex flex-col gap-5">
            {summary.byType.map((type) => (
              <li key={type.questionType} className="flex flex-col gap-2">
                <p className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span className="text-xl font-extrabold">{vi.practice.questionTypes[type.questionType]}</span>
                  <span className="font-bold">
                    {t.typeAccuracy(type.percent, type.score, type.maxScore, type.questions)}
                  </span>
                </p>
                {/* The bar repeats the percentage above, so it is hidden from screen readers. */}
                <div aria-hidden className="h-4 overflow-hidden rounded-full border-2 border-foreground">
                  <div className="h-full bg-foreground" style={{ width: `${type.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="progress-history" className="flex flex-col gap-4">
        <h2 id="progress-history" className="text-3xl font-extrabold tracking-tight">
          {t.historyLabel}
        </h2>
        {summary.history.length === 0 ? (
          <p className="rounded-lg border-4 border-foreground p-6 text-xl">{t.noHistory}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {summary.history.map((item) => (
              <li key={item.sessionId}>
                <HistoryCard item={item} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border-4 border-foreground bg-card p-6">
      <dt className="text-lg font-extrabold tracking-wide uppercase">{label}</dt>
      <dd className="text-5xl font-extrabold tracking-tight">{value}</dd>
      {detail ? <dd className="font-semibold">{detail}</dd> : null}
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const headingId = `history-${item.sessionId}`;
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 id={headingId} className="text-2xl font-extrabold tracking-tight">
          {item.name ?? vi.practice.untitled}
        </h3>
        <p className="text-xl font-bold">{t.historyScore(item.totalScore, item.maxScore, item.percent)}</p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {item.scoreOnTen != null ? <span>{vi.practice.scoreOnTen(item.scoreOnTen)}</span> : null}
          {item.passed != null ? (
            <span className="flex items-center gap-2 font-extrabold uppercase">
              {item.passed ? <Check aria-hidden className="size-5" strokeWidth={3} /> : <X aria-hidden className="size-5" strokeWidth={3} />}
              {item.passed ? vi.practice.passed : vi.practice.notPassed}
            </span>
          ) : null}
          {item.submittedAt ? <span>{t.submittedOn(formatDate(item.submittedAt))}</span> : null}
        </p>
      </div>
      <Link
        to={`/practice/${encodeURIComponent(item.sessionId)}/result`}
        aria-describedby={headingId}
        className={button}
      >
        {t.review}
      </Link>
    </article>
  );
}

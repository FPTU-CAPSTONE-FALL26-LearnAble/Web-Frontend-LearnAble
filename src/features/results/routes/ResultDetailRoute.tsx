import { Link, useParams } from "react-router";
import { Card } from "@/shared/ui/primitives/Card";
import { Button } from "@/shared/ui/primitives/Button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResult } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";

const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" });

/** SCR-07 (chi tiết) — FR-10 */
export function ResultDetailRoute() {
  const { sessionId } = useParams<"sessionId">();
  const resultQuery = useExamResult(sessionId!);

  useRouteAnnouncer(
    vi.results.pageTitle,
    resultQuery.data?.examName ?? vi.results.title,
  );

  if (resultQuery.isPending) return <p>{vi.common.loading}</p>;
  if (resultQuery.isError || !resultQuery.data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert">{vi.errors.notFound}</p>
        <Button asChild variant="secondary">
          <Link to="/ket-qua">{vi.common.back}</Link>
        </Button>
      </div>
    );
  }

  const r = resultQuery.data;
  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
        {r.examName}
      </h1>

      <Card className="flex max-w-xl flex-col gap-4">
        <p className="text-[length:var(--text-xl)] font-bold">
          {vi.results.score(r.score, r.maxScore)}
        </p>
        <ResultStatus status={r.status} />
        {r.status === "flagged" ? (
          <p className="rounded-[var(--radius)] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
            {vi.results.flaggedNote}
          </p>
        ) : null}
        <p>{vi.results.submittedAt(dateFormat.format(new Date(r.submittedAt)))}</p>
        <p>{vi.results.duration(r.durationMinutes)}</p>
      </Card>

      <Button asChild variant="secondary" className="self-start">
        <Link to="/ket-qua">{vi.common.back}</Link>
      </Button>
    </div>
  );
}

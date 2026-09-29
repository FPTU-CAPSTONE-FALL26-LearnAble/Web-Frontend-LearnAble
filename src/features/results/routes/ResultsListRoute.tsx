import { Link } from "react-router";
import { Card, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { useExamResults } from "@/features/results/api/useExamResults";
import { ResultStatus } from "@/features/results/components/ResultStatus";

/** SCR-07 (danh sách) — FR-10 */
export function ResultsListRoute() {
  useRouteAnnouncer(vi.results.pageTitle, vi.results.title);
  const resultsQuery = useExamResults();

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-2xl font-bold">
        {vi.results.title}
      </h1>

      {resultsQuery.isPending ? <p>{vi.common.loading}</p> : null}
      {resultsQuery.isError ? (
        <Button variant="secondary" onClick={() => resultsQuery.refetch()}>
          {vi.common.retry}
        </Button>
      ) : null}

      {resultsQuery.data?.length === 0 ? <p>{vi.results.noResults}</p> : null}

      {resultsQuery.data && resultsQuery.data.length > 0 ? (
        <ul aria-label={vi.results.listLabel} className="flex flex-col gap-4">
          {resultsQuery.data.map((r) => (
            <li key={r.sessionId}>
              <Card className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <CardTitle>{r.examName}</CardTitle>
                  <p className="mt-1 flex flex-wrap items-center gap-4">
                    <span className="font-medium">{vi.results.score(r.score, r.maxScore)}</span>
                    <ResultStatus status={r.status} />
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <Link to={`/results/${r.sessionId}`}>{vi.results.detail}</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

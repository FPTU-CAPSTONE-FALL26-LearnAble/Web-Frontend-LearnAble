import { Link } from "react-router";
import { Card, CardTitle } from "@/shared/ui/primitives/Card";
import { Button } from "@/shared/ui/primitives/Button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { usePracticeSets } from "@/features/practice/api/usePracticeSets";

/** SCR-04 (danh sách) — FR-07 */
export function PracticeListRoute() {
  useRouteAnnouncer(vi.practice.pageTitle, vi.practice.title);
  const setsQuery = usePracticeSets();

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
        {vi.practice.title}
      </h1>
      <p className="max-w-prose text-[var(--color-text-muted)]">{vi.practice.localOnlyNote}</p>

      {setsQuery.isPending ? <p>{vi.common.loading}</p> : null}
      {setsQuery.isError ? (
        <Button variant="secondary" onClick={() => setsQuery.refetch()}>
          {vi.common.retry}
        </Button>
      ) : null}

      {setsQuery.data ? (
        <ul aria-label={vi.practice.listLabel} className="flex flex-col gap-4">
          {setsQuery.data.map((set) => (
            <li key={set.id}>
              <Card className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <CardTitle>{set.title}</CardTitle>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    {set.subject} — {vi.practice.questionsCount(set.questionCount)}
                  </p>
                </div>
                <Button asChild>
                  <Link to={`/luyen-tap/${set.id}`}>{vi.practice.start}</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

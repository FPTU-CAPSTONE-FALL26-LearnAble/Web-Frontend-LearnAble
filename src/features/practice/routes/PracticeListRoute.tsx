import { ArrowRight, CalendarClock, Clock } from "lucide-react";
import { Link } from "react-router";
import { describeError } from "@/app/providers";
import type { PracticeSession } from "@/api/studentPractice";
import { useMyPracticeSessions } from "@/features/practice/api/usePracticeSessions";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.practice;

type SessionState = "open" | "upcoming" | "closed";

/** Where a session stands for the student, from its status and its window. */
export function sessionState(session: PracticeSession, now = Date.now()): SessionState {
  const status = session.status ?? "Draft";
  if (status === "Open") return now > Date.parse(session.closesAt) ? "closed" : "open";
  if (status === "Draft" || status === "Scheduled") return "upcoming";
  return "closed";
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Open sessions first, then those about to open, then the closed ones. */
const ORDER: Record<SessionState, number> = { open: 0, upcoming: 1, closed: 2 };

const action =
  "inline-flex min-h-14 items-center justify-center gap-3 rounded-md border-4 border-foreground px-6 text-xl font-extrabold underline-offset-4 hover:underline";

/** SCR-04 (list) — FR-07: the practice sessions this student is registered for. */
export function PracticeListRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const sessions = useMyPracticeSessions();
  const sorted = [...(sessions.data ?? [])].sort(
    (a, b) => ORDER[sessionState(a)] - ORDER[sessionState(b)] || Date.parse(a.opensAt) - Date.parse(b.opensAt),
  );

  return (
    <div className="flex flex-col gap-8 text-lg">
      <header className="flex flex-col gap-3 border-b-4 border-foreground pb-6">
        <h1 tabIndex={-1} className="text-5xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="max-w-prose text-xl">{t.intro}</p>
      </header>

      {sessions.isPending ? <p role="status">{vi.common.loading}</p> : null}
      {sessions.isError ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border-4 border-destructive p-5">
          <p className="font-bold text-destructive">{describeError(sessions.error)}</p>
          <button type="button" onClick={() => void sessions.refetch()} className={action}>
            {vi.common.retry}
          </button>
        </div>
      ) : null}
      {sessions.data && sessions.data.length === 0 ? (
        <p className="rounded-lg border-4 border-foreground p-6 text-xl">{t.empty}</p>
      ) : null}

      {sorted.length ? (
        <ul aria-label={t.sessionsLabel} className="flex flex-col gap-5">
          {sorted.map((session) => (
            <li key={session.sessionId}>
              <SessionCard session={session} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SessionCard({ session }: { session: PracticeSession }) {
  const state = sessionState(session);
  const name = session.name?.trim() || t.untitled;
  const headingId = `practice-${session.sessionId}`;
  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-5 rounded-lg border-4 p-6 md:flex-row md:items-center",
        state === "open" ? "border-foreground bg-card" : "border-border bg-card",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="w-fit rounded-md border-2 border-foreground px-3 py-1 text-base font-extrabold tracking-wide uppercase">
          {t.status[state]}
        </p>
        <h2 id={headingId} className="text-3xl font-extrabold tracking-tight">
          {name}
        </h2>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2">
            <Clock aria-hidden className="size-5 shrink-0" />
            {t.duration(session.durationMinutes)}
          </span>
          <span className="flex items-center gap-2">
            <CalendarClock aria-hidden className="size-5 shrink-0" />
            {t.window(formatDate(session.opensAt), formatDate(session.closesAt))}
          </span>
        </p>
      </div>
      <div className="shrink-0">
        {state === "open" ? (
          <Link
            to={`/practice/${encodeURIComponent(session.sessionId)}`}
            aria-describedby={headingId}
            className={cn(action, "bg-primary text-primary-foreground")}
          >
            {t.startOrContinue}
            <ArrowRight aria-hidden className="size-6" strokeWidth={3} />
          </Link>
        ) : state === "upcoming" ? (
          <p className="text-xl font-bold">{t.opensLater(formatDate(session.opensAt))}</p>
        ) : session.releasedAt ? (
          <Link
            to={`/practice/${encodeURIComponent(session.sessionId)}/result`}
            aria-describedby={headingId}
            className={cn(action, "bg-background text-foreground")}
          >
            {t.viewResult}
          </Link>
        ) : (
          <p className="text-xl font-bold">{t.resultPending}</p>
        )}
      </div>
    </article>
  );
}

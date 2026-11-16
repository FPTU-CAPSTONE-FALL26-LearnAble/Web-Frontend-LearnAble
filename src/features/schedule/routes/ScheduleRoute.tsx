import { useEffect } from "react";
import type { MyExamSchedule } from "@/api/exams";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { Button } from "@/shared/ui/primitives/button";
import { useMyExamSchedules } from "@/features/schedule/api/useMyExamSchedules";
import { ScheduleStatus } from "@/features/schedule/components/ScheduleStatus";
import {
  formatExamDate,
  formatExamTime,
  groupSchedules,
} from "@/features/schedule/scheduleView";

const t = vi.schedule;

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{term}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function ExamCard({ item, isNext }: { item: MyExamSchedule; isNext: boolean }) {
  const { schedule, seatCode } = item;
  const headingId = `exam-${schedule.examScheduleId}`;
  return (
    <article
      aria-labelledby={headingId}
      className="rounded-xl border border-border bg-card p-6 text-card-foreground"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          {isNext ? (
            <p className="text-sm font-semibold uppercase tracking-wide">{t.nextExam}</p>
          ) : null}
          <h3 id={headingId} className="text-xl font-semibold">
            {schedule.examName?.trim() || t.untitledExam}
          </h3>
        </div>
        <p>
          <span className="sr-only">{t.statusLabel}: </span>
          <ScheduleStatus status={schedule.status} />
        </p>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Detail term={t.date}>
          <time dateTime={schedule.startsAt}>{formatExamDate(schedule.startsAt)}</time>
        </Detail>
        <Detail term={t.time}>
          <span className="font-mono tabular-nums">
            {t.timeRange(formatExamTime(schedule.startsAt), formatExamTime(schedule.endsAt))}
          </span>
        </Detail>
        <Detail term={t.checkIn}>
          <span className="font-mono tabular-nums">
            {t.timeRange(
              formatExamTime(schedule.entryOpensAt),
              formatExamTime(schedule.entryClosesAt),
            )}
          </span>
        </Detail>
        <Detail term={t.room}>
          {schedule.roomName?.trim() ? (
            <span className="font-mono font-semibold">{schedule.roomName}</span>
          ) : (
            t.roomPending
          )}
        </Detail>
        <Detail term={t.seat}>
          {seatCode?.trim() ? (
            <span className="font-mono font-semibold">{seatCode}</span>
          ) : (
            t.seatPending
          )}
        </Detail>
      </dl>
    </article>
  );
}

function ExamList({ items, markNext }: { items: MyExamSchedule[]; markNext?: boolean }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={item.schedule.examScheduleId}>
          <ExamCard item={item} isNext={!!markNext && index === 0} />
        </li>
      ))}
    </ul>
  );
}

/** FFCB-106 — the student's published exam schedule: when, where, and which seat. */
export function ScheduleRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const query = useMyExamSchedules();
  const groups = query.data ? groupSchedules(query.data) : null;
  const upcomingCount = groups?.upcoming.length;
  const pastCount = groups?.past.length;
  const hasExams = !!groups && groups.upcoming.length + groups.past.length > 0;

  useEffect(() => {
    if (upcomingCount === undefined || pastCount === undefined) return;
    announce(t.announceLoaded(upcomingCount, pastCount));
  }, [upcomingCount, pastCount]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 tabIndex={-1} className="text-2xl font-bold">
          {t.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{t.intro}</p>
      </header>

      {query.isPending ? <p role="status">{t.loading}</p> : null}

      {query.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-destructive p-6"
        >
          <p className="font-semibold text-destructive">{t.loadError}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            {vi.common.retry}
          </Button>
        </div>
      ) : null}

      {groups && !hasExams ? (
        <div className="rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold">{t.empty}</h2>
          <p className="mt-2 text-muted-foreground">{t.emptyHint}</p>
        </div>
      ) : null}

      {groups && hasExams ? (
        <>
          <section aria-labelledby="schedule-upcoming" className="flex flex-col gap-4">
            <h2 id="schedule-upcoming" className="text-xl font-semibold">
              {t.upcoming}
            </h2>
            {groups.upcoming.length ? (
              <>
                <p className="text-muted-foreground">{t.upcomingCount(groups.upcoming.length)}</p>
                <ExamList items={groups.upcoming} markNext />
              </>
            ) : (
              <p>{t.noUpcoming}</p>
            )}
          </section>
          {groups.past.length ? (
            <section aria-labelledby="schedule-past" className="flex flex-col gap-4">
              <h2 id="schedule-past" className="text-xl font-semibold">
                {t.past}
              </h2>
              <ExamList items={groups.past} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, MapPin } from "lucide-react";
import { getSemesters } from "@/api/catalog";
import { getExamSchedules, type ExamSchedule } from "@/api/exams";
import { getExamGradebook, type ExamGradebook } from "@/api/grading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";

const time = (value: string) => new Date(value).getTime();

export function currentSemester<
  T extends { startDate: string; endDate: string; status: string },
>(semesters: T[], now: Date) {
  const instant = now.getTime();
  return (
    semesters.find((semester) =>
      /active|current|started/i.test(semester.status),
    ) ??
    semesters.find(
      (semester) =>
        time(semester.startDate) <= instant &&
        time(semester.endDate) >= instant,
    )
  );
}

export function needsGrading(data: ExamGradebook | undefined) {
  return Boolean(
    data &&
    !data.releasedAt &&
    data.submitted > 0,
  );
}

export function isScheduleEligible(
  schedule: ExamSchedule,
  semester: { startDate: string; endDate: string },
  now: Date,
) {
  return (
    time(schedule.startsAt) >= time(semester.startDate) &&
    time(schedule.startsAt) <= time(semester.endDate) &&
    time(schedule.endsAt) <= now.getTime() &&
    !["Draft", "Cancelled"].includes(schedule.status)
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function GradingScheduleQueue({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (scheduleId: string) => void;
}) {
  const now = new Date();
  const semesters = useQuery({
    queryKey: ["catalog", "semesters", "grading-queue"],
    queryFn: () => getSemesters({ PageSize: 100, SortBy: "-startDate" }),
  });
  const semester = currentSemester(semesters.data?.items ?? [], now);
  const schedules = useQuery({
    queryKey: ["examiner", "grading-schedules", semester?.semesterId],
    queryFn: () => getExamSchedules({ PageSize: 100 }),
    enabled: Boolean(semester),
  });
  const eligible = (schedules.data?.items ?? [])
    .filter(
      (schedule) => semester && isScheduleEligible(schedule, semester, now),
    )
    .sort((a, b) => time(b.startsAt) - time(a.startsAt));
  const gradebooks = useQueries({
    queries: eligible.map((schedule) => ({
      queryKey: ["examiner", "gradebook-summary", schedule.examScheduleId],
      queryFn: () => getExamGradebook(schedule.examScheduleId, 1, 1),
      staleTime: 30_000,
    })),
  });
  const queue = eligible
    .map((schedule, index) => ({ schedule, result: gradebooks[index] }))
    .filter(({ result }) => needsGrading(result.data));
  const pending =
    semesters.isPending ||
    schedules.isPending ||
    gradebooks.some((result) => result.isPending);
  const error =
    semesters.error ||
    schedules.error ||
    gradebooks.find((result) => result.error)?.error;

  return (
    <section aria-labelledby="grading-queue-title" className="overflow-hidden rounded-xl border-2 border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2
            id="grading-queue-title"
            className="text-base font-semibold"
          >
            Grading queue
          </h2>
        </div>
        {semester ? (
          <Badge variant="outline">
            {semester.semesterName} · {semester.academicYear}
          </Badge>
        ) : null}
      </div>

      {pending ? (
        <div role="status" className="grid gap-4 lg:grid-cols-2">
          <span className="sr-only">Loading grading queue…</span>
          {[0, 1].map((item) => (
            <div
              key={item}
              aria-hidden
              className="h-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive p-5 text-destructive"
        >
          The current-semester grading queue could not be loaded. Refresh the
          page and try again.
        </div>
      ) : !semester ? (
        <div className="rounded-xl border border-warning bg-warning p-5 text-warning-foreground">
          No active semester was found for today.
        </div>
      ) : queue.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-success-border bg-success p-5 text-success-foreground">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">No grading is waiting</p>
            <p className="mt-1 text-sm">
              Every completed exam with submissions in this semester has been
              graded or released.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {queue.map(({ schedule, result }) => (
            <ScheduleCard
              key={schedule.examScheduleId}
              schedule={schedule}
              gradebook={result.data!}
              selected={selectedId === schedule.examScheduleId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleCard({
  schedule,
  gradebook,
  selected,
  onSelect,
}: {
  schedule: ExamSchedule;
  gradebook: ExamGradebook;
  selected: boolean;
  onSelect: (scheduleId: string) => void;
}) {
  return (
    <article className={`grid items-center gap-4 border-b border-border p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto_auto] ${selected ? "bg-primary/5" : "bg-card"}`}>
      <div className="min-w-0"><h3 className="break-words text-base font-semibold">{schedule.examName ?? "Unnamed exam"}</h3>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0" aria-hidden />{formatDate(schedule.startsAt)} · {formatTime(schedule.startsAt)}–{formatTime(schedule.endsAt)}</p>
          <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0" aria-hidden />{schedule.roomName ?? "Room not reported"}</p>
        </div>
      </div>
      <dl className="flex gap-6 text-sm">{[["Submitted", gradebook.submitted], ["Ungraded", gradebook.ungraded], ["Manual", gradebook.needsManual]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold tabular-nums">{value}</dd></div>)}</dl>
      <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">{gradebook.needsManual > 0 ? "Needs grading" : gradebook.canRelease ? "Ready to release" : "Needs review"}</Badge><Button variant={selected ? "outline" : "default"} aria-pressed={selected} onClick={() => onSelect(schedule.examScheduleId)}>{selected ? "Gradebook open" : "Open gradebook"}</Button></div>
    </article>
  );
}

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
    data.submitted > 0 &&
    (data.ungraded > 0 ||
      data.needsManual > 0 ||
      data.unreviewed > 0 ||
      data.unconfirmedMarking > 0 ||
      data.pendingIntegrityReviews > 0 ||
      !data.canRelease),
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
    <section aria-labelledby="grading-queue-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2
            id="grading-queue-title"
            className="text-xl font-bold text-primary"
          >
            Current semester grading queue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed exam shifts with submitted work that still needs grading,
            review or release.
          </p>
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
              className="h-52 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
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
        <div className="grid gap-4 lg:grid-cols-2">
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
    <article
      className={`flex min-h-52 flex-col rounded-2xl border p-5 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold wrap-anywhere">
            {schedule.examName ?? "Unnamed exam"}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            {formatDate(schedule.startsAt)} · {formatTime(schedule.startsAt)}–
            {formatTime(schedule.endsAt)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {schedule.roomName ?? "Room not reported"}
          </p>
        </div>
        <Badge variant="outline">
          {gradebook.needsManual > 0 ? "Needs grading" : "Needs review"}
        </Badge>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border py-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Submitted</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {gradebook.submitted}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ungraded</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {gradebook.ungraded}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Manual</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {gradebook.needsManual}
          </dd>
        </div>
      </dl>

      <Button
        className="mt-4 w-full"
        onClick={() => onSelect(schedule.examScheduleId)}
      >
        {selected ? "Gradebook open" : "Open gradebook"}
      </Button>
    </article>
  );
}

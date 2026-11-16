import { Link } from "react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Trash2, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cancelExamSchedule, deleteExamSchedule, getExamInvigilators, getExamRooms, getExamSchedules, type ExamSchedule } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { toast } from "@/shared/ui/primitives/toast";

function ApiState({
  pending,
  error,
  empty,
  onRetry,
}: {
  pending: boolean;
  error: unknown;
  empty?: boolean;
  onRetry: () => void;
}) {
  if (pending)
    return (
      <p role="status" className="p-4 text-sm">
        Loading data…
      </p>
    );
  if (error) {
    return (
      <div
        role="alert"
        className="m-4 rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive"
      >
        <p className="font-bold">We couldn’t load the exam schedules.</p>
        <p className="mt-1 text-sm">Check your connection and try again.</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (empty)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        No matching data is available.
      </p>
    );
  return null;
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <span className="sr-only">{eyebrow}</span> : null}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

const statusToneClasses: Record<string, { badge: string; dot: string }> = {
  success: {
    badge: "border-success-foreground/30 bg-success text-success-foreground",
    dot: "bg-success-foreground",
  },
  warning: {
    badge: "border-warning-foreground/30 bg-warning text-warning-foreground",
    dot: "bg-warning-foreground",
  },
  danger: {
    badge: "border-destructive/30 bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
  info: {
    badge: "border-secondary-foreground/30 bg-secondary text-secondary-foreground",
    dot: "bg-secondary-foreground",
  },
};

function Status({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const config = statusToneClasses[tone] ?? statusToneClasses.info;
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-extrabold",
        config.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {children}
    </span>
  );
}

export function ExamScheduleDashboardRoute() {
  const [range, setRange] = useState<"day" | "week" | "month">("day");
  const [pendingAction, setPendingAction] = useState<{ kind: "cancel" | "delete"; schedule: ExamSchedule } | null>(null);
  const queryClient = useQueryClient();
  useRouteAnnouncer("Exam Schedule", "Exam Schedule and Shift Cockpit");
  const schedules = useQuery({
    queryKey: ["examiner", "exam-schedules"],
    queryFn: () => getExamSchedules(),
  });
  const roomData = useQuery({
    queryKey: ["examiner", "exam-rooms"],
    queryFn: () => getExamRooms(),
  });
  useExpiredSession(schedules.error || roomData.error);
  const scheduleRows = schedules.data?.items ?? [];
  const now = new Date();
  const rangeEnd = new Date(now);
  if (range === "day") rangeEnd.setHours(23, 59, 59, 999);
  if (range === "week") rangeEnd.setDate(rangeEnd.getDate() + 7);
  if (range === "month") rangeEnd.setMonth(rangeEnd.getMonth() + 1);
  const visibleSchedules = scheduleRows.filter((schedule) => {
    const start = new Date(schedule.startsAt);
    if (range === "day") return start.toDateString() === now.toDateString();
    return start >= now && start <= rangeEnd;
  });
  const invigilatorQueries = useQueries({ queries: scheduleRows.map((schedule) => ({ queryKey: ["examiner", "schedule-invigilators", schedule.examScheduleId], queryFn: () => getExamInvigilators(schedule.examScheduleId) })) });
  const staffedSchedules = invigilatorQueries.filter((query) => (query.data?.length ?? 0) > 0).length;
  const roomRows = roomData.data?.items ?? [];
  const lifecycle = useMutation({
    mutationFn: async (action: { kind: "cancel" | "delete"; schedule: ExamSchedule }) => {
      if (action.kind === "delete") return deleteExamSchedule(action.schedule.examScheduleId);
      return cancelExamSchedule(action.schedule.examScheduleId);
    },
    onSuccess: async (_, action) => {
      setPendingAction(null);
      await queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedules"] });
      toast({
        title: action.kind === "delete" ? "Draft schedule deleted" : "Exam schedule cancelled",
        description: action.kind === "delete" ? "The unused draft and its assignments were removed." : "Assigned students and lecturers were cancelled with the schedule.",
      });
    },
    onError: (error) => toast({
      title: "Schedule could not be updated",
      description: error instanceof Error ? error.message : "Refresh the schedule and try again.",
    }),
  });
  return (
    <div>
      <PageHeading
        eyebrow="Exam Operations"
        title="Exam Schedule & Shift Cockpit"
        description="Coordinate rooms, staffing, candidates, and readiness across the examination day."
        actions={
          <Button asChild>
            <Link to="/examiner/schedule/new/details">
              <CalendarDays />
              Create exam schedule
            </Link>
          </Button>
        }
      />
      <ApiState
        pending={schedules.isPending || roomData.isPending}
        error={schedules.error || roomData.error}
        empty={!schedules.isPending && scheduleRows.length === 0}
        onRetry={() => {
          void schedules.refetch();
          void roomData.refetch();
        }}
      />
      <section className="examiner-command rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-white/60">
              Live schedule data
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              Published and operational exam shifts
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={range === "day" ? "default" : "secondary"}
              onClick={() => setRange("day")}
            >
              Day
            </Button>
            <Button
              variant={range === "week" ? "default" : "secondary"}
              onClick={() => setRange("week")}
            >
              Week
            </Button>
            <Button
              variant={range === "month" ? "default" : "secondary"}
              onClick={() => setRange("month")}
            >
              Month
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {visibleSchedules.slice(0, 4).map((schedule) => (
            <div
              key={schedule.examScheduleId}
              className="rounded-xl border border-white/20 bg-white/5 p-4"
            >
              <p className="text-2xl font-extrabold">
                {new Date(schedule.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </p>
              <p className="mt-2 font-bold">{schedule.examName ?? "Scheduled exam"}</p>
              <p className="text-xs text-white/60">{schedule.status}</p>
            </div>
          ))}
          {!visibleSchedules.length ? <p className="col-span-full rounded-xl border border-white/20 p-5 text-sm text-white/70">No schedules in this {range}.</p> : null}
        </div>
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className="examiner-major overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-extrabold">Scheduled shifts</h2>
          </div>
          {scheduleRows.map((schedule) => (
            <article
              key={schedule.examScheduleId}
              className="grid gap-4 border-b border-border p-5 last:border-0 lg:grid-cols-[100px_1fr_auto] lg:items-center"
            >
              <div>
                <p className="text-xl font-extrabold text-primary">
                  {new Date(schedule.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((new Date(schedule.endsAt).getTime() - new Date(schedule.startsAt).getTime()) / 60_000)} minutes
                </p>
              </div>
              <div>
                <strong>{schedule.examName ?? "Scheduled exam"}</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  {schedule.roomName ?? "Room pending"} · {new Date(schedule.startsAt).toLocaleDateString("en-US")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Status tone={schedule.status === "Open" || schedule.status === "Closed" ? "success" : schedule.status === "Cancelled" ? "danger" : "info"}>
                  {schedule.status}
                </Status>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/examiner/schedule/${schedule.examScheduleId}`}>View details</Link>
                </Button>
                {schedule.status === "Draft" ? (
                  <Button variant="outline" size="sm" onClick={() => setPendingAction({ kind: "delete", schedule })}>
                    <Trash2 /> Delete draft
                  </Button>
                ) : null}
                {(schedule.status === "Draft" || schedule.status === "Published") && new Date(schedule.startsAt) > now ? (
                  <Button variant="outline" size="sm" onClick={() => setPendingAction({ kind: "cancel", schedule })}>
                    <XCircle /> Cancel
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <aside className="space-y-5">
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Room readiness</h2>
            <div className="mt-4 space-y-3">
              {roomRows.map((room) => (
                <div
                  key={room.examRoomId}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <strong className="text-sm">{room.name ?? room.roomCode}</strong>
                    <p className="text-xs text-muted-foreground">
                      {room.building ?? "Building not specified"}{room.capacity ? ` · ${room.capacity} stations` : ""}
                    </p>
                  </div>
                  <Status tone={room.isActive ? "success" : "info"}>
                    {room.isActive ? "Active" : "Inactive"}
                  </Status>
                </div>
              ))}
            </div>
          </div>
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Staffing coverage</h2>
            <p className="mt-3 text-3xl font-extrabold">{invigilatorQueries.some((query) => query.isPending) ? "…" : `${staffedSchedules}/${scheduleRows.length}`}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedules with at least one assigned Lecturer.
            </p>
            {invigilatorQueries.some((query) => query.isError) ? <p role="alert" className="mt-3 text-sm text-destructive">Some staffing assignments could not be loaded.</p> : null}
          </div>
        </aside>
      </section>
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !lifecycle.isPending) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.kind === "delete" ? "Delete this draft schedule?" : "Cancel this exam schedule?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "delete"
                ? "This permanently removes the Draft schedule, its enrollments, lecturer assignments, and generated seating."
                : "The schedule will remain in history, but its student enrollments and lecturer assignments will be cancelled. This is only allowed before the shift starts."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lifecycle.isPending}>Keep schedule</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!pendingAction || lifecycle.isPending}
              onClick={() => { if (pendingAction) lifecycle.mutate(pendingAction); }}
            >
              {lifecycle.isPending ? "Updating…" : pendingAction?.kind === "delete" ? "Delete draft" : "Cancel schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


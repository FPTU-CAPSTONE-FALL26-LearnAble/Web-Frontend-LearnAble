import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  MapPin,
  Users,
} from "lucide-react";
import { getExamRooms, getExamSchedules } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { isScheduleLive } from "@/features/examiner/monitoring/liveSchedule";

export function LiveMonitoringRoute() {
  useRouteAnnouncer("Live Exam Monitoring", "Live Exam Monitoring");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const schedules = useQuery({
    queryKey: ["examiner", "monitoring", "schedules"],
    queryFn: () => getExamSchedules({ Status: "Open" }),
  });
  const rooms = useQuery({
    queryKey: ["examiner", "monitoring", "rooms"],
    queryFn: () => getExamRooms(),
  });
  useExpiredSession(schedules.error || rooms.error);
  const active = (schedules.data?.items ?? []).filter((item) =>
    isScheduleLive(item, now),
  );
  const roomById = new Map(
    (rooms.data?.items ?? []).map((room) => [room.examRoomId, room]),
  );
  if (schedules.isPending || rooms.isPending)
    return (
      <p role="status" className="rounded-xl border border-border p-6">
        Loading live schedules…
      </p>
    );
  if (schedules.error || rooms.error)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive p-6 text-destructive"
      >
        <p className="font-bold">Unable to load live exam data.</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() =>
            void Promise.all([schedules.refetch(), rooms.refetch()])
          }
        >
          Retry
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Live Exam Monitoring
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Track active rooms, candidate connectivity and exam progress from
            one operational view.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-success px-4 py-3 font-semibold text-success-foreground">
          <Activity className="size-5" aria-hidden />
          <span>
            {active.length} live {active.length === 1 ? "room" : "rooms"}
          </span>
        </div>
      </header>
      {active.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-bold">No live exams</h2>
            <p className="mt-2 text-muted-foreground">
              No open schedule is currently within its exam time window.
            </p>
            <Button className="mt-5" variant="outline" asChild>
              <Link to="/examiner/schedule">View exam schedules</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section
          aria-label="Live exam rooms"
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          {active.map((schedule) => {
            const room = roomById.get(schedule.examRoomId);
            return (
              <article
                key={schedule.examScheduleId}
                className="grid gap-5 border-b border-border p-5 last:border-b-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold wrap-anywhere">
                      {schedule.examName ?? "Unnamed examination"}
                    </h2>
                    <Badge>Live now</Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {schedule.roomName ??
                      room?.name ??
                      room?.roomCode ??
                      "Room not assigned"}
                  </p>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="size-4" aria-hidden /> Exam
                      window
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {new Date(schedule.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      –
                      {new Date(schedule.endsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                    <dd className="text-sm text-muted-foreground">
                      {new Date(schedule.startsAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-4" aria-hidden /> Room capacity
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {room?.capacity == null
                        ? "Not provided"
                        : `${room.capacity} seats`}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-2 lg:min-w-44">
                  <Button asChild>
                    <Link to={`/examiner/monitoring/${schedule.examRoomId}`}>
                      Monitor room <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/examiner/schedule/${schedule.examScheduleId}`}>
                      Schedule details
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

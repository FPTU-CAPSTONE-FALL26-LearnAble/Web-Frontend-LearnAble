import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import { getMyExamSchedules, type MyExamSchedule } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { getScheduleTiming, scheduleTimingStyle, type ScheduleTiming } from "@/features/lecturer/exams/scheduleTiming";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";

const sectionDetails: Record<ScheduleTiming, { title: string; description: string }> = {
  today: { title: "Today and in progress", description: "Assignments taking place today or currently running." },
  upcoming: { title: "Upcoming exams", description: "Your next published invigilation assignments." },
  past: { title: "Past exams", description: "Completed assignments, newest first." },
};

export function groupLecturerSchedules(items: MyExamSchedule[], now = new Date()) {
  const groups: Record<ScheduleTiming, MyExamSchedule[]> = { today: [], upcoming: [], past: [] };
  for (const item of items) groups[getScheduleTiming(item.schedule.startsAt, item.schedule.endsAt, now)].push(item);
  groups.today.sort((a, b) => a.schedule.startsAt.localeCompare(b.schedule.startsAt));
  groups.upcoming.sort((a, b) => a.schedule.startsAt.localeCompare(b.schedule.startsAt));
  groups.past.sort((a, b) => b.schedule.startsAt.localeCompare(a.schedule.startsAt));
  return groups;
}

export function canTakeAttendance(item: MyExamSchedule, now = new Date()) {
  const { schedule } = item;
  const activeStatus = schedule.status === "Published" || schedule.status === "Open";
  return activeStatus
    && now.getTime() >= new Date(schedule.entryOpensAt).getTime()
    && now.getTime() <= new Date(schedule.endsAt).getTime();
}

function ScheduleCard({ item, timing }: { item: MyExamSchedule; timing: ScheduleTiming }) {
  const { schedule, invigilatorRole } = item;
  const start = new Date(schedule.startsAt);
  const end = new Date(schedule.endsAt);
  const canOpen = canTakeAttendance(item);
  const style = scheduleTimingStyle[timing];
  return (
    <article aria-label={`${schedule.examName ?? "Unnamed examination"}, ${style.label}`} className={`rounded-xl border-2 ${style.card}`}>
      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{style.label}</Badge>
            <Badge variant={canOpen ? "default" : "outline"}>{schedule.status}</Badge>
            {invigilatorRole ? <Badge variant="outline">{invigilatorRole} invigilator</Badge> : null}
          </div>
          <h3 className="mt-3 text-xl font-extrabold">{schedule.examName ?? "Unnamed examination"}</h3>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" aria-hidden />
              {start.toLocaleDateString("en-GB")} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden />{schedule.roomName ?? "Room pending"}</span>
          </div>
        </div>
        <div>
          {canOpen ? (
            <Button asChild><Link to={`/lecturer/exams/${schedule.examScheduleId}/attendance`}><Users />Take attendance</Link></Button>
          ) : (
            <p className="max-w-xs text-sm text-muted-foreground">Attendance opens at the student entry time and closes when the shift ends.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function ExamScheduleRoute() {
  useRouteAnnouncer("Exam Schedule", "Exam Schedule");
  const schedules = useQuery({ queryKey: ["lecturer", "exam-schedules"], queryFn: () => getMyExamSchedules() });
  useExpiredSession(schedules.error);
  if (schedules.isPending) return <p role="status" className="rounded-xl border border-border p-6">Loading assigned exam schedules…</p>;
  if (schedules.error) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">Unable to load your exam schedules.</p><Button className="mt-3" variant="outline" onClick={() => void schedules.refetch()}>Retry</Button></div>;

  const items = schedules.data?.items ?? [];
  const groups = groupLecturerSchedules(items);
  const order: ScheduleTiming[] = ["today", "upcoming", "past"];
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <CalendarDays className="size-7 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Exam Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your current, upcoming and previous invigilation assignments.</p>
        </div>
      </header>
      {order.map((timing) => groups[timing].length ? (
        <section key={timing} aria-labelledby={`${timing}-schedule-heading`} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 id={`${timing}-schedule-heading`} className="text-xl font-bold">{sectionDetails[timing].title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{sectionDetails[timing].description}</p>
            </div>
            <Badge variant="outline">{groups[timing].length} {groups[timing].length === 1 ? "shift" : "shifts"}</Badge>
          </div>
          <div className="space-y-3">
            {groups[timing].map((item) => <ScheduleCard key={item.schedule.examScheduleId} item={item} timing={timing} />)}
          </div>
        </section>
      ) : null)}
      {!items.length ? (
        <div className="rounded-xl border border-border p-10 text-center">
          <CalendarDays className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-bold">No exam schedule is assigned to this account.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">A schedule appears here after an examiner assigns you as an invigilator. Publishing a shift alone is not enough if this lecturer account was not included in that shift.</p>
        </div>
      ) : null}
    </div>
  );
}

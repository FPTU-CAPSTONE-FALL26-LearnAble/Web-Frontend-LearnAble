import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import { getMyExamSchedules } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { getScheduleTiming, scheduleTimingStyle } from "@/features/lecturer/exams/scheduleTiming";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";

export function ExamScheduleRoute() {
  useRouteAnnouncer("Exam Schedule", "Exam Schedule");
  const schedules = useQuery({ queryKey: ["lecturer", "exam-schedules"], queryFn: () => getMyExamSchedules() });
  useExpiredSession(schedules.error);
  if (schedules.isPending) return <p role="status" className="rounded-xl border border-border p-6">Loading assigned exam schedules…</p>;
  if (schedules.error) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">Unable to load your exam schedules.</p><Button className="mt-3" variant="outline" onClick={() => void schedules.refetch()}>Retry</Button></div>;
  const items = [...(schedules.data?.items ?? [])].sort((a, b) => a.schedule.startsAt.localeCompare(b.schedule.startsAt));
  return <div className="space-y-6"><header className="flex items-center gap-3 border-b border-border pb-5"><CalendarDays className="size-7 text-primary" /><div><h1 className="text-3xl font-extrabold tracking-tight">Exam Schedule</h1><p className="mt-1 text-sm text-muted-foreground">Your invigilation assignments from LearnAble Backend.</p></div></header>{items.map(({ schedule, invigilatorRole }) => { const start = new Date(schedule.startsAt); const end = new Date(schedule.endsAt); const canOpen = schedule.status === "Open"; const timing = getScheduleTiming(schedule.startsAt, schedule.endsAt); const style = scheduleTimingStyle[timing]; return <article key={schedule.examScheduleId} aria-label={`${schedule.examName ?? "Unnamed examination"}, ${style.label}`} className={`rounded-xl border-2 ${style.card}`}><div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{style.label}</Badge><Badge variant={canOpen ? "default" : "outline"}>{schedule.status}</Badge>{invigilatorRole ? <Badge variant="outline">{invigilatorRole} invigilator</Badge> : null}</div><h2 className="mt-3 text-xl font-extrabold">{schedule.examName ?? "Unnamed examination"}</h2><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="flex items-center gap-2"><Clock3 className="size-4 text-primary" />{start.toLocaleString()} – {end.toLocaleTimeString()}</span><span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{schedule.roomName ?? "Room pending"}</span></div></div><div>{canOpen ? <Button asChild><Link to={`/lecturer/exams/${schedule.examScheduleId}/attendance`}><Users />Open attendance</Link></Button> : <p className="text-sm text-muted-foreground">Attendance is available when this schedule is open.</p>}</div></div></article>; })}{items.length === 0 ? <p className="rounded-xl border border-border p-12 text-center text-muted-foreground">No exam schedule is assigned to this account.</p> : null}</div>;
}

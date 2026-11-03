import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FilePlus2, FileQuestion, Library, Upload } from "lucide-react";
import { Link } from "react-router";
import { getMaterials, getQuestions } from "@/api/lecturer";
import { getMyExamSchedules } from "@/api/exams";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

export function LecturerDashboardRoute() {
  useRouteAnnouncer("Lecturer dashboard", "Lecturer dashboard");
  const user = useAuthStore((state) => state.user)!;
  const questions = useQuery({ queryKey: ["lecturer", "dashboard", "questions"], queryFn: () => getQuestions({ PageNumber: 1, PageSize: 1 }) });
  const materials = useQuery({ queryKey: ["lecturer", "dashboard", "materials", user.universityId], queryFn: () => getMaterials({ UploadedBy: user.universityId, PageNumber: 1, PageSize: 1 }) });
  const schedules = useQuery({ queryKey: ["lecturer", "dashboard", "schedules"], queryFn: () => getMyExamSchedules() });
  useExpiredSession(questions.error || materials.error || schedules.error);
  const pending = questions.isPending || materials.isPending;
  const error = questions.error || materials.error;
  const upcoming = (schedules.data?.items ?? []).filter((item) => new Date(item.schedule.endsAt).getTime() >= Date.now()).sort((a, b) => a.schedule.startsAt.localeCompare(b.schedule.startsAt));
  const open = upcoming.find((item) => item.schedule.status === "Open");
  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 xl:flex-row xl:items-center"><div><h1 className="text-3xl font-extrabold tracking-tight">Welcome, <span className="text-primary">{user.fullName}</span>.</h1><p className="mt-2 text-sm text-muted-foreground">Manage your questions, learning materials, and invigilation shifts.</p></div><div className="flex flex-wrap gap-3"><Button asChild><Link to="/lecturer/questions/new?purpose=exam"><FilePlus2 />Create question</Link></Button><Button variant="outline" asChild><Link to="/lecturer/materials/new"><Upload />Upload material</Link></Button></div></header>
    {pending ? <p role="status" className="rounded-xl border border-border p-6">Loading lecturer data…</p> : null}
    {error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">We couldn’t load your lecturer workspace.</p><p className="mt-1 text-sm">Check your connection and try again.</p><Button className="mt-3" variant="outline" onClick={() => void Promise.all([questions.refetch(), materials.refetch()])}>Try again</Button></div> : null}
    {!pending && !error ? <>
      <section aria-label="Lecturer summary" className="grid gap-4 sm:grid-cols-3">
        {[["Questions", questions.data?.totalCount ?? 0, FileQuestion], ["Learning materials", materials.data?.totalCount ?? 0, Library], ["Assigned schedules", schedules.error ? "—" : schedules.data?.totalCount ?? 0, CalendarClock]].map(([label, value, Icon]) => { const SummaryIcon = Icon as typeof FileQuestion; return <Card key={String(label)} className="shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="font-bold">{String(label)}</p><SummaryIcon className="size-5 text-primary" /></div><p className="mt-3 text-3xl font-extrabold">{String(value)}</p></CardContent></Card>; })}
      </section>
      {open ? <Card className="border-success-border shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{open.schedule.examName ?? "Open exam schedule"}</CardTitle><Badge>{open.schedule.status}</Badge></div></CardHeader><CardContent><p className="text-muted-foreground">{open.schedule.roomName ?? "Room pending"} · {new Date(open.schedule.startsAt).toLocaleString()} – {new Date(open.schedule.endsAt).toLocaleTimeString()}</p><Button className="mt-5" asChild><Link to={`/lecturer/exams/${open.schedule.examScheduleId}/attendance`}>Open attendance</Link></Button></CardContent></Card> : null}
      <Card className="shadow-none"><CardHeader><CardTitle>Upcoming invigilation</CardTitle></CardHeader><CardContent className="space-y-3">{schedules.error ? <div role="alert" className="rounded-xl border border-warning bg-warning p-4 text-warning-foreground"><p className="font-semibold">Exam schedules are temporarily unavailable.</p><Button className="mt-3" variant="outline" onClick={() => void schedules.refetch()}>Try again</Button></div> : schedules.isPending ? <p role="status" className="py-10 text-center text-muted-foreground">Loading exam schedules…</p> : <>{upcoming.slice(0, 6).map((item) => <article key={item.schedule.examScheduleId} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4"><div><strong>{item.schedule.examName ?? "Unnamed examination"}</strong><p className="mt-1 text-sm text-muted-foreground">{item.schedule.roomName ?? "Room pending"} · {new Date(item.schedule.startsAt).toLocaleString()}</p></div><Button variant="outline" asChild><Link to={`/lecturer/exams/${item.schedule.examScheduleId}/attendance`}>View shift</Link></Button></article>)}{upcoming.length === 0 ? <p className="py-10 text-center text-muted-foreground">You have no upcoming invigilation shifts.</p> : null}</>}</CardContent></Card>
    </> : null}
  </div>;
}

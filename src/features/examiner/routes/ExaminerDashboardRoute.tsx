import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileCheck2, FilePlus2, LayoutGrid, Users } from "lucide-react";
import { Link } from "react-router";
import { getExamPaperBank, getExamRooms, getExamSchedules } from "@/api/exams";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ExaminerDashboardRoute() {
  const user = useAuthStore((state) => state.user)!;
  useRouteAnnouncer("Examiner dashboard", "Examiner operations dashboard");
  const schedules = useQuery({ queryKey: ["examiner", "dashboard", "schedules"], queryFn: () => getExamSchedules() });
  const rooms = useQuery({ queryKey: ["examiner", "dashboard", "rooms"], queryFn: () => getExamRooms() });
  const papers = useQuery({ queryKey: ["examiner", "dashboard", "papers"], queryFn: getExamPaperBank });
  useExpiredSession(schedules.error || rooms.error || papers.error);
  const pending = rooms.isPending || papers.isPending;
  const error = rooms.error || papers.error;
  const scheduleItems = schedules.data?.items ?? [];
  const roomItems = rooms.data?.items ?? [];
  const paperItems = papers.data ?? [];
  const now = Date.now();
  const active = scheduleItems.filter((item) => item.status === "Open");
  const upcoming = scheduleItems.filter((item) => new Date(item.startsAt).getTime() > now && !["Cancelled", "Closed"].includes(item.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Good day, {user.fullName}.</h1><p className="mt-2 text-sm text-muted-foreground">Review exam papers, schedules, and room readiness.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/examiner/schedule/new/details"><CalendarDays />Create schedule</Link></Button><Button asChild><Link to="/examiner/exams/new/setup"><FilePlus2 />Create exam paper</Link></Button></div>
      </header>
      {pending ? <p role="status" className="rounded-xl border border-border p-6">Loading examiner data…</p> : null}
      {error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">We couldn’t load your examiner workspace.</p><p className="mt-1 text-sm">Check your connection and try again.</p><Button className="mt-3" variant="outline" onClick={() => void Promise.all([rooms.refetch(), papers.refetch()])}>Try again</Button></div> : null}
      {!pending && !error ? <>
        <section aria-label="Examiner summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Exam papers", String(paperItems.length), `${paperItems.filter((item) => item.status === "Published").length} published`, FileCheck2],
            ["Schedules", schedules.error ? "—" : String(scheduleItems.length), schedules.error ? "Temporarily unavailable" : `${active.length} currently open`, CalendarDays],
            ["Active rooms", String(roomItems.filter((item) => item.isActive).length), `${roomItems.length} rooms returned`, LayoutGrid],
            ["Candidates", "—", "Open a schedule to view its enrollment", Users],
          ].map(([label, value, detail, Icon]) => { const SummaryIcon = Icon as typeof FileCheck2; return <Card key={String(label)} className="shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="text-sm font-bold">{String(label)}</p><SummaryIcon className="size-5 text-primary" /></div><p className="mt-3 text-3xl font-extrabold tabular-nums">{String(value)}</p><p className="mt-1 text-xs text-muted-foreground">{String(detail)}</p></CardContent></Card>; })}
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="shadow-none"><CardHeader><CardTitle>Open schedules</CardTitle></CardHeader><CardContent className="space-y-3">{schedules.error ? <ScheduleUnavailable onRetry={() => void schedules.refetch()} /> : schedules.isPending ? <p role="status" className="py-8 text-center text-muted-foreground">Loading exam schedules…</p> : <>{active.map((item) => <article key={item.examScheduleId} className="rounded-xl border border-success-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.examName ?? "Unnamed examination"}</strong><Badge>{item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.roomName ?? "Room pending"} · {formatDate(item.startsAt)}–{new Date(item.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p></article>)}{active.length === 0 ? <p className="py-8 text-center text-muted-foreground">No exam schedule is currently open.</p> : null}</>}</CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle>Upcoming schedules</CardTitle></CardHeader><CardContent className="space-y-3">{schedules.error ? <ScheduleUnavailable onRetry={() => void schedules.refetch()} /> : schedules.isPending ? <p role="status" className="py-8 text-center text-muted-foreground">Loading exam schedules…</p> : <>{upcoming.slice(0, 5).map((item) => <article key={item.examScheduleId} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.examName ?? "Unnamed examination"}</strong><Badge variant="outline">{item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.roomName ?? "Room pending"} · {formatDate(item.startsAt)}</p></article>)}{upcoming.length === 0 ? <p className="py-8 text-center text-muted-foreground">No upcoming exam schedules.</p> : null}</>}</CardContent></Card>
        </section>
      </> : null}
    </div>
  );
}

function ScheduleUnavailable({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-warning bg-warning p-4 text-warning-foreground"><p className="font-semibold">Exam schedules are temporarily unavailable.</p><Button className="mt-3" variant="outline" onClick={onRetry}>Try again</Button></div>;
}

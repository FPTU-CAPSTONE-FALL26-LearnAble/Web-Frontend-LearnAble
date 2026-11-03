import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getExamRooms, getExamSchedules } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

export function LiveMonitoringRoute() {
  useRouteAnnouncer("Live Exam Monitoring", "Live Exam Monitoring");
  const schedules = useQuery({ queryKey: ["examiner", "monitoring", "schedules"], queryFn: () => getExamSchedules({ Status: "Open" }) });
  const rooms = useQuery({ queryKey: ["examiner", "monitoring", "rooms"], queryFn: () => getExamRooms() });
  useExpiredSession(schedules.error || rooms.error);
  const active = (schedules.data?.items ?? []).filter((item) => item.status === "Open");
  const roomById = new Map((rooms.data?.items ?? []).map((room) => [room.examRoomId, room]));
  if (schedules.isPending || rooms.isPending) return <p role="status" className="rounded-xl border border-border p-6">Loading live schedules…</p>;
  if (schedules.error || rooms.error) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">Unable to load live exam data.</p><Button className="mt-3" variant="outline" onClick={() => void Promise.all([schedules.refetch(), rooms.refetch()])}>Retry</Button></div>;
  return <div className="space-y-6">
    <header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight">Live Exam Monitoring</h1><p className="mt-2 text-sm text-muted-foreground">Review exam schedules that are currently open.</p></header>
    {active.length === 0 ? <Card className="shadow-none"><CardContent className="py-16 text-center"><h2 className="text-xl font-bold">No live exams</h2><p className="mt-2 text-muted-foreground">There are no schedules with Open status.</p><Button className="mt-5" variant="outline" asChild><Link to="/examiner/schedule">View exam schedules</Link></Button></CardContent></Card> : <section className="grid gap-5 xl:grid-cols-3">{active.map((schedule) => { const room = roomById.get(schedule.examRoomId); return <Card key={schedule.examScheduleId} className="border-success-border shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{schedule.examName ?? "Unnamed examination"}</CardTitle><Badge>{schedule.status}</Badge></div></CardHeader><CardContent><dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Room</dt><dd className="font-bold">{schedule.roomName ?? room?.name ?? room?.roomCode ?? "Not assigned"}</dd></div><div><dt className="text-muted-foreground">Time</dt><dd className="font-bold">{new Date(schedule.startsAt).toLocaleString()} – {new Date(schedule.endsAt).toLocaleTimeString()}</dd></div><div><dt className="text-muted-foreground">Capacity</dt><dd className="font-bold">{room?.capacity ?? "Not available"}</dd></div></dl><Button className="mt-5 w-full" asChild><Link to={`/examiner/schedule/${schedule.examScheduleId}`}>Open schedule</Link></Button></CardContent></Card>; })}</section>}
    <Card className="shadow-none"><CardHeader><CardTitle>Live activity</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Detailed kiosk, incident, and submission activity will appear here when live monitoring is available.</p></CardContent></Card>
  </div>;
}

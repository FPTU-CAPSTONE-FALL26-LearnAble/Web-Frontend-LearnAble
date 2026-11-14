import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getExamRooms, getExamSchedules } from "@/api/exams";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

export function RoomMonitoringRoute() {
  const { roomId } = useParams();
  const rooms = useQuery({ queryKey: ["examiner", "rooms"], queryFn: () => getExamRooms() });
  const schedules = useQuery({ queryKey: ["examiner", "schedules"], queryFn: () => getExamSchedules() });
  if (rooms.isPending || schedules.isPending) return <p role="status">Loading room data…</p>;
  if (rooms.error || schedules.error) return <p role="alert" className="text-destructive">We couldn’t load this room. Check your connection and try again.</p>;
  const room = rooms.data?.items.find((item) => item.examRoomId === roomId);
  const active = schedules.data?.items.filter((item) => item.examRoomId === roomId && item.status === "Open") ?? [];
  if (!room) return <div className="space-y-4"><h1 className="text-3xl font-bold">Room not found</h1><p className="text-muted-foreground">This exam room may have been removed or you may not have access to it.</p><Button asChild variant="outline"><Link to="/examiner/monitoring">Back to monitoring</Link></Button></div>;
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">{room.name ?? room.roomCode ?? "Exam room"}</h1><p className="mt-2 text-muted-foreground">{room.building ?? "Building not provided"} · Capacity {room.capacity ?? "not provided"}</p></header><Card className="shadow-none"><CardHeader><CardTitle>Open schedules in this room</CardTitle></CardHeader><CardContent className="space-y-3">{active.map((item) => <article key={item.examScheduleId} className="rounded-xl border border-success-border p-4"><strong>{item.examName ?? "Unnamed examination"}</strong><p className="mt-1 text-sm text-muted-foreground">{new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}</p></article>)}{active.length === 0 ? <p className="py-8 text-center text-muted-foreground">No open schedule was returned for this room.</p> : null}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle>Live candidate telemetry</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Candidate progress and kiosk telemetry are not available from the current Backend API.</p></CardContent></Card></div>;
}

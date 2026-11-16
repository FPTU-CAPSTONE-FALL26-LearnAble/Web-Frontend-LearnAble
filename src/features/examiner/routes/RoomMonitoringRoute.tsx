import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getExamRooms, getExamSchedules } from "@/api/exams";
import { getExamMonitoring } from "@/api/examOperations";
import { Badge } from "@/shared/ui/primitives/badge";
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
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">{room.name ?? room.roomCode ?? "Exam room"}</h1><p className="mt-2 text-muted-foreground">{room.building ?? "Building not provided"} · Capacity {room.capacity ?? "not provided"}</p></header>{active.map((item) => <ScheduleTelemetry key={item.examScheduleId} scheduleId={item.examScheduleId} title={item.examName ?? "Unnamed examination"} startsAt={item.startsAt} endsAt={item.endsAt} />)}{active.length === 0 ? <Card className="shadow-none"><CardContent><p className="py-12 text-center text-muted-foreground">No open schedule was returned for this room.</p></CardContent></Card> : null}</div>;
}

function ScheduleTelemetry({ scheduleId, title, startsAt, endsAt }: { scheduleId: string; title: string; startsAt: string; endsAt: string }) {
  const monitoring = useQuery({ queryKey: ["examiner", "monitoring", scheduleId], queryFn: () => getExamMonitoring(scheduleId), refetchInterval: 10_000 });
  const students = monitoring.data?.students ?? [];
  const connected = students.filter((student) => student.connectionStatus?.toLowerCase() === "connected" || student.connectionStatus?.toLowerCase() === "online").length;
  return <Card className="shadow-none"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{new Date(startsAt).toLocaleString()} – {new Date(endsAt).toLocaleTimeString()}</p></div><Badge variant="outline">{connected}/{students.length} online</Badge></div></CardHeader><CardContent>{monitoring.isPending ? <p role="status">Loading live candidate telemetry…</p> : monitoring.error ? <div role="alert" className="text-destructive">Live monitoring could not be loaded. <Button className="ml-2" variant="outline" onClick={() => monitoring.refetch()}>Retry</Button></div> : students.length === 0 ? <p className="py-8 text-center text-muted-foreground">No enrolled candidates were returned by monitoring.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-secondary"><tr><th className="p-3">Candidate</th><th className="p-3">Seat</th><th className="p-3">Connection</th><th className="p-3">Camera</th><th className="p-3">Progress</th><th className="p-3">Last seen</th></tr></thead><tbody>{students.map((student) => <tr key={student.enrollmentId} className="border-t border-border"><td className="p-3"><strong className="block">{student.studentName ?? "Unknown student"}</strong><span className="font-mono text-sm text-muted-foreground">{student.studentCode ?? student.studentId}</span></td><td className="p-3 font-mono">{student.seatCode ?? "—"}</td><td className="p-3"><Badge variant="outline">{student.connectionStatus ?? "Unknown"}</Badge></td><td className="p-3">{student.cameraStatus ?? "Unknown"}</td><td className="p-3">{student.answeredQuestionCount}/{student.totalQuestionCount}</td><td className="p-3 text-sm">{student.lastSeenAt ? new Date(student.lastSeenAt).toLocaleTimeString() : "Never"}</td></tr>)}</tbody></table></div>}</CardContent></Card>;
}

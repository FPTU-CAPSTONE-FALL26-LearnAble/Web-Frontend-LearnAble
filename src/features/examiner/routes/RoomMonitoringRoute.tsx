import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CircleCheck,
  Clock3,
  LayoutGrid,
  List,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getRoomSeats, type RoomSeat } from "@/api/admin";
import { getExamRooms, getExamSchedules } from "@/api/exams";
import { getExamMonitoring } from "@/api/examOperations";
import { ExtendTimeDialog } from "@/features/examiner/components/ExtendTimeDialog";
import { isScheduleLive } from "@/features/examiner/monitoring/liveSchedule";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";

export function RoomMonitoringRoute() {
  const { roomId } = useParams();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const rooms = useQuery({
    queryKey: ["examiner", "rooms"],
    queryFn: () => getExamRooms(),
  });
  const schedules = useQuery({
    queryKey: ["examiner", "schedules"],
    queryFn: () => getExamSchedules({ Status: "Open" }),
  });
  const roomSeats = useQuery({
    queryKey: ["exam-room-seats", roomId],
    queryFn: () => getRoomSeats(roomId!),
    enabled: Boolean(roomId),
    staleTime: 60_000,
    retry: false,
    meta: { silent: true },
  });
  if (rooms.isPending || schedules.isPending)
    return <p role="status">Loading room data…</p>;
  if (rooms.error || schedules.error)
    return (
      <p role="alert" className="text-destructive">
        We couldn’t load this room. Check your connection and try again.
      </p>
    );
  const room = rooms.data?.items.find((item) => item.examRoomId === roomId);
  const active =
    schedules.data?.items.filter(
      (item) => item.examRoomId === roomId && isScheduleLive(item, now),
    ) ?? [];
  if (!room)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <p className="text-muted-foreground">
          This exam room may have been removed or you may not have access to it.
        </p>
        <Button asChild variant="outline">
          <Link to="/examiner/monitoring">Back to monitoring</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <Link
          to="/examiner/monitoring"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground underline decoration-primary underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to live monitoring
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              {room.name ?? room.roomCode ?? "Exam room"}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
              <Building2 className="size-4" aria-hidden />
              <span>{room.building ?? "Building not provided"}</span>
              <span aria-hidden>·</span>
              <span>
                {room.capacity == null
                  ? "Capacity not provided"
                  : `${room.capacity} seats`}
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-success px-4 py-3 font-semibold text-success-foreground">
            {active.length
              ? `${active.length} live ${active.length === 1 ? "exam" : "exams"}`
              : "No live exam"}
          </div>
        </div>
      </header>
      {active.map((item) => (
        <ScheduleTelemetry
          key={item.examScheduleId}
          roomId={room.examRoomId}
          scheduleId={item.examScheduleId}
          title={item.examName ?? "Unnamed examination"}
          startsAt={item.startsAt}
          endsAt={item.endsAt}
          seats={roomSeats.data ?? []}
        />
      ))}
      {active.length === 0 ? (
        <Card className="shadow-none">
          <CardContent>
            <p className="py-12 text-center text-muted-foreground">
              This room has no exam currently within its live time window.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ScheduleTelemetry({
  roomId,
  scheduleId,
  title,
  startsAt,
  endsAt,
  seats,
}: {
  roomId: string;
  scheduleId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  seats: RoomSeat[];
}) {
  const [view, setView] = useState<"list" | "seats">("list");
  const monitoring = useQuery({
    queryKey: ["examiner", "monitoring", scheduleId],
    queryFn: () => getExamMonitoring(scheduleId),
    refetchInterval: 10_000,
  });
  const students = monitoring.data?.students ?? [];
  const connected = students.filter((student) =>
    /connected|online/i.test(student.connectionStatus ?? ""),
  ).length;
  const disconnected = students.length - connected;
  const cameraIssues = students.filter((student) =>
    /off|denied|unavailable|blocked|failed/i.test(student.cameraStatus ?? ""),
  ).length;
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-extrabold text-primary">
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(startsAt).toLocaleString()} –{" "}
              {new Date(endsAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Monitoring view"
              className="flex rounded-lg border border-border bg-background p-1"
            >
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <List className="size-4" aria-hidden /> List
              </button>
              <button
                type="button"
                aria-pressed={view === "seats"}
                onClick={() => setView("seats")}
                className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${view === "seats" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <LayoutGrid className="size-4" aria-hidden /> Seating map
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monitoring.isPending ? (
          <p role="status">Loading live candidate telemetry…</p>
        ) : monitoring.error ? (
          <div role="alert" className="text-destructive">
            <p className="font-bold">Live monitoring could not be loaded.</p>
            <p className="mt-1 text-sm">
              The latest candidate status is unavailable. Existing exam attempts
              are not affected.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => monitoring.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : students.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No enrolled candidates were returned by monitoring.
          </p>
        ) : (
          <>
            <dl
              aria-label="Live monitoring summary"
              className="mb-5 grid gap-3 sm:grid-cols-3"
            >
              <div className="flex items-center gap-3 rounded-xl bg-success p-4 text-success-foreground">
                <Wifi className="size-5" aria-hidden />
                <div>
                  <dt className="text-sm font-semibold">Online</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {connected}
                  </dd>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 rounded-xl p-4 ${disconnected ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                <WifiOff className="size-5" aria-hidden />
                <div>
                  <dt className="text-sm font-semibold">Offline or unknown</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {disconnected}
                  </dd>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 rounded-xl p-4 ${cameraIssues ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                <Camera className="size-5" aria-hidden />
                <div>
                  <dt className="text-sm font-semibold">Camera issues</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {cameraIssues}
                  </dd>
                </div>
              </div>
            </dl>
            {view === "seats" ? (
              <MonitoringSeatMap
                roomId={roomId}
                seats={seats}
                students={students}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Seat</th>
                      <th className="p-3">Connection</th>
                      <th className="p-3">Camera</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Last seen</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const online = /connected|online/i.test(
                        student.connectionStatus ?? "",
                      );
                      const cameraIssue =
                        /off|denied|unavailable|blocked|failed/i.test(
                          student.cameraStatus ?? "",
                        );
                      return (
                        <tr
                          key={student.enrollmentId}
                          className={`border-t border-border ${!online || cameraIssue ? "bg-warning/30" : ""}`}
                        >
                          <td className="p-3">
                            <strong className="block">
                              {student.studentName ?? "Unknown student"}
                            </strong>
                            <span className="font-mono text-sm text-muted-foreground">
                              {student.studentCode ?? student.studentId}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            {student.seatCode ?? "—"}
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              {online ? (
                                <CircleCheck
                                  className="size-4 text-success-foreground"
                                  aria-hidden
                                />
                              ) : (
                                <AlertTriangle
                                  className="size-4 text-warning-foreground"
                                  aria-hidden
                                />
                              )}
                              <Badge variant="outline">
                                {student.connectionStatus ?? "Unknown"}
                              </Badge>
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              {cameraIssue ? (
                                <AlertTriangle
                                  className="size-4 text-warning-foreground"
                                  aria-hidden
                                />
                              ) : null}
                              {student.cameraStatus ?? "Unknown"}
                            </span>
                          </td>
                          <td className="p-3 font-semibold tabular-nums">
                            {student.answeredQuestionCount}/
                            {student.totalQuestionCount}
                          </td>
                          <td className="p-3 text-sm">
                            <span className="flex items-center gap-2">
                              <Clock3
                                className="size-4 text-muted-foreground"
                                aria-hidden
                              />
                              {student.lastSeenAt
                                ? new Date(
                                    student.lastSeenAt,
                                  ).toLocaleTimeString()
                                : "Never"}
                            </span>
                          </td>
                          <td className="p-3">
                            {student.attemptId ? (
                              <div className="flex flex-wrap gap-2">
                                <ExtendTimeDialog
                                  attemptId={student.attemptId}
                                  studentName={
                                    student.studentName ?? "This candidate"
                                  }
                                />
                                <Button size="sm" variant="outline" asChild>
                                  <Link
                                    to={`/examiner/monitoring/${roomId}/candidates/${student.attemptId}`}
                                  >
                                    View attempt
                                  </Link>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Attempt not started
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type MonitoringStudent = Awaited<
  ReturnType<typeof getExamMonitoring>
>["students"][number];

function MonitoringSeatMap({
  roomId,
  seats,
  students,
}: {
  roomId: string;
  seats: RoomSeat[];
  students: MonitoringStudent[];
}) {
  const studentBySeat = new Map(
    students
      .filter((student) => student.seatCode)
      .map((student) => [student.seatCode!.trim().toLowerCase(), student]),
  );
  const knownSeats = [...seats].sort(
    (a, b) => a.rowNumber - b.rowNumber || a.columnNumber - b.columnNumber,
  );

  if (!knownSeats.length) {
    return (
      <div>
        <p className="mb-4 text-sm text-muted-foreground">
          The complete room layout is unavailable. Showing assigned seats only.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {students.map((student) => (
            <CandidateSeat
              key={student.enrollmentId}
              roomId={roomId}
              seatCode={student.seatCode ?? "Unassigned"}
              student={student}
            />
          ))}
        </div>
      </div>
    );
  }

  const firstRow = Math.min(...knownSeats.map((seat) => seat.rowNumber));
  const firstColumn = Math.min(...knownSeats.map((seat) => seat.columnNumber));
  const columnCount =
    Math.max(...knownSeats.map((seat) => seat.columnNumber)) - firstColumn + 1;

  return (
    <div>
      <ul
        aria-label="Live seating map"
        className="grid gap-3 overflow-x-auto pb-2"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(10rem, 1fr))`,
        }}
      >
        {knownSeats.map((seat) => {
          const student = seat.seatCode
            ? studentBySeat.get(seat.seatCode.trim().toLowerCase())
            : undefined;
          return (
            <li
              key={seat.seatId}
              style={{
                gridRow: seat.rowNumber - firstRow + 1,
                gridColumn: seat.columnNumber - firstColumn + 1,
              }}
            >
              <CandidateSeat
                roomId={roomId}
                seatCode={
                  seat.seatCode ?? `${seat.rowNumber}-${seat.columnNumber}`
                }
                student={student}
                unavailable={!seat.isAvailable}
              />
            </li>
          );
        })}
      </ul>
      <ul
        aria-label="Seating map legend"
        className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground"
      >
        <li className="flex items-center gap-2">
          <span
            className="size-3 rounded border border-success-border bg-success"
            aria-hidden
          />
          Online
        </li>
        <li className="flex items-center gap-2">
          <span
            className="size-3 rounded border border-warning-foreground bg-warning"
            aria-hidden
          />
          Offline or attention needed
        </li>
        <li className="flex items-center gap-2">
          <span
            className="size-3 rounded border border-border bg-background"
            aria-hidden
          />
          Free
        </li>
        <li className="flex items-center gap-2">
          <span
            className="size-3 rounded border border-dashed border-border bg-muted"
            aria-hidden
          />
          Not usable
        </li>
      </ul>
    </div>
  );
}

function CandidateSeat({
  roomId,
  seatCode,
  student,
  unavailable = false,
}: {
  roomId: string;
  seatCode: string;
  student?: MonitoringStudent;
  unavailable?: boolean;
}) {
  const online = /connected|online/i.test(student?.connectionStatus ?? "");
  const cameraIssue = /off|denied|unavailable|blocked|failed/i.test(
    student?.cameraStatus ?? "",
  );
  const stateClass = unavailable
    ? "border-dashed border-border bg-muted text-muted-foreground"
    : student && online && !cameraIssue
      ? "border-success-border bg-success text-success-foreground"
      : student
        ? "border-warning-foreground bg-warning text-warning-foreground"
        : "border-border bg-background";

  return (
    <article
      className={`flex min-h-32 flex-col rounded-xl border p-3 ${stateClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="font-mono text-sm">Seat {seatCode}</strong>
        {student ? (
          <span className="text-xs font-semibold">
            {online ? "Online" : "Offline"}
          </span>
        ) : null}
      </div>
      {unavailable ? (
        <p className="mt-auto text-sm">Not usable</p>
      ) : student ? (
        <>
          <p className="mt-3 font-bold wrap-anywhere">
            {student.studentName ?? "Unknown student"}
          </p>
          <p className="text-xs">{student.studentCode ?? student.studentId}</p>
          <p className="mt-2 text-xs font-semibold">
            {student.answeredQuestionCount}/{student.totalQuestionCount}{" "}
            answered
            {cameraIssue ? " · Camera issue" : ""}
          </p>
          {student.attemptId ? (
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <ExtendTimeDialog
                attemptId={student.attemptId}
                studentName={student.studentName ?? "This candidate"}
              />
              <Link
                to={`/examiner/monitoring/${roomId}/candidates/${student.attemptId}`}
                className="inline-flex min-h-9 items-center px-1 text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                View
              </Link>
            </div>
          ) : (
            <span className="mt-auto pt-2 text-xs">Attempt not started</span>
          )}
        </>
      ) : (
        <p className="mt-auto text-sm text-muted-foreground">Free</p>
      )}
    </article>
  );
}

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FilePlus2 } from "lucide-react";
import { Link } from "react-router";
import { getExamPaperBank, getExamRooms, getExamSchedules, type ExamSchedule } from "@/api/exams";
import { fetchAllPages } from "@/api/pagination";
import { AttentionJump, AttentionList, DashboardPanel, EmptyNote, EntityRow, FlowList, PanelState, ShiftRow, SplitBar, StatBand } from "@/components/workbench/DashboardParts";
import { dayKey, describeStart, formatClock, formatDayLabel, formatLongDate, formatShortDate, greetingFor, limitGroups, plural } from "@/components/workbench/dashboardTime";
import { useNow } from "@/components/workbench/useNow";
import { StatusBadge } from "@/components/workbench/Workbench";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import {
  buildAttention,
  buildFlow,
  buildOverview,
  countPapers,
  leadingRooms,
  nextShift,
  recentPapers,
  scheduleWindow,
  splitSchedules,
  summarizeToday,
} from "../dashboard/examinerDashboard";

const SCHEDULE_TONE = { Open: "success", Published: "info", Draft: "warning", Closed: "neutral", Cancelled: "danger" } as const;
const PAPER_TONE = { Draft: "warning", Published: "success", Archived: "neutral" } as const;
const LATER_LIMIT = 6;
const ROOM_LIMIT = 6;

function shiftTitle(schedule: ExamSchedule) {
  return schedule.examName ?? "Unnamed examination";
}

function ExamShiftRow({ schedule, now, showTiming }: { schedule: ExamSchedule; now: Date; showTiming: boolean }) {
  const timing = showTiming ? describeStart(schedule.startsAt, schedule.endsAt, now) : null;
  return (
    <ShiftRow
      start={formatClock(schedule.startsAt)}
      end={formatClock(schedule.endsAt)}
      title={shiftTitle(schedule)}
      meta={schedule.roomName ?? "Room pending"}
      status={<StatusBadge value={schedule.status} tone={SCHEDULE_TONE[schedule.status]} />}
      hint={timing?.text}
      live={timing?.state === "live"}
      action={{ label: "Details", to: `/examiner/schedule/${schedule.examScheduleId}`, description: shiftTitle(schedule) }}
    />
  );
}

export function ExaminerDashboardRoute() {
  const user = useAuthStore((state) => state.user)!;
  useRouteAnnouncer("Examiner dashboard", "Examiner operations dashboard");
  const now = useNow();
  const today = dayKey(now);

  const schedules = useQuery({
    queryKey: ["examiner", "dashboard", "schedules", today],
    queryFn: () => {
      const { from, to } = scheduleWindow(new Date());
      return fetchAllPages((Page, PageSize) => getExamSchedules({ Page, PageSize, From: from.toISOString(), To: to.toISOString() }));
    },
  });
  const rooms = useQuery({
    queryKey: ["examiner", "dashboard", "rooms"],
    queryFn: () => fetchAllPages((Page, PageSize) => getExamRooms({ Page, PageSize })),
  });
  const papers = useQuery({ queryKey: ["examiner", "dashboard", "papers"], queryFn: getExamPaperBank });
  useExpiredSession(schedules.error || rooms.error || papers.error);

  const scheduleItems = schedules.data?.items;
  const roomItems = rooms.data?.items;
  const paperItems = papers.data;
  const data = { papers: paperItems, schedules: scheduleItems, rooms: roomItems };

  const { today: todayShifts, later, laterGroups } = splitSchedules(scheduleItems ?? [], now);
  const upNext = nextShift(todayShifts, later, now);
  const shownLater = limitGroups(laterGroups, LATER_LIMIT);
  const hiddenLater = later.length - shownLater.reduce((sum, group) => sum + group.items.length, 0);
  const pendingByStat: Record<string, boolean> = { papers: papers.isPending, shifts: schedules.isPending, rooms: rooms.isPending };
  const overview = buildOverview(data, now).map((stat) => (pendingByStat[stat.key] ? { ...stat, detail: "Loading…" } : stat));
  const attentionPending = schedules.isPending || papers.isPending;
  const attentionError = schedules.error || papers.error;
  const attention = buildAttention({ papers: paperItems ?? [], schedules: scheduleItems ?? [] });
  const roomList = leadingRooms(roomItems ?? [], ROOM_LIMIT);
  const hiddenRooms = (roomItems?.length ?? 0) - roomList.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {greetingFor(now)}, {user.fullName}.
          </h1>
          <p className="mt-2 text-muted-foreground">
            {formatLongDate(now)}
            {schedules.isSuccess ? ` · ${summarizeToday(todayShifts, now)}` : ""}
          </p>
          {attentionPending || attentionError ? null : <AttentionJump count={attention.length} targetId="needs-attention" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/examiner/schedule/new/details">
              <CalendarDays />
              Create schedule
            </Link>
          </Button>
          <Button asChild>
            <Link to="/examiner/exams/new/setup">
              <FilePlus2 />
              Create exam paper
            </Link>
          </Button>
        </div>
      </header>

      <StatBand stats={overview} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <DashboardPanel title="Exam preparation">
            <PanelState
              pending={schedules.isPending || papers.isPending}
              error={null}
              errorText=""
              onRetry={() => undefined}
            >
              <FlowList steps={buildFlow(data, now)} />
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Exam shifts" action={{ label: "All schedules", to: "/examiner/schedule" }}>
            <PanelState
              pending={schedules.isPending}
              error={schedules.error}
              errorText="Exam schedules are temporarily unavailable."
              onRetry={() => void schedules.refetch()}
            >
              {!todayShifts.length && !shownLater.length ? (
                <EmptyNote
                  title="No exam shifts in the next 30 days"
                  text="Create a schedule to assign a paper, rooms, candidates and invigilators."
                  action={{ label: "Create schedule", to: "/examiner/schedule/new/details" }}
                />
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Today</h3>
                    {todayShifts.length ? (
                      <ul className="divide-y divide-border">
                        {todayShifts.map((schedule) => (
                          <ExamShiftRow key={schedule.examScheduleId} schedule={schedule} now={now} showTiming />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        No exam shifts today.
                        {upNext ? ` Next: ${formatDayLabel(dayKey(upNext.startsAt), now)}, ${formatClock(upNext.startsAt)} · ${shiftTitle(upNext)}.` : ""}
                      </p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Coming up</h3>
                    {shownLater.length ? (
                      <div className="space-y-5">
                        {shownLater.map((group) => (
                          <div key={group.key} className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground">{formatDayLabel(group.key, now)}</h4>
                            <ul className="divide-y divide-border">
                              {group.items.map((schedule) => (
                                <ExamShiftRow key={schedule.examScheduleId} schedule={schedule} now={now} showTiming={false} />
                              ))}
                            </ul>
                          </div>
                        ))}
                        {hiddenLater > 0 ? (
                          <p className="text-sm text-muted-foreground">{plural(hiddenLater, "more shift")} in the next 30 days. Open all schedules to see them.</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No more exam shifts are scheduled in the next 30 days.</p>
                    )}
                  </div>
                </div>
              )}
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Exam rooms">
            <PanelState pending={rooms.isPending} error={rooms.error} errorText="Exam rooms are temporarily unavailable." onRetry={() => void rooms.refetch()}>
              {roomList.length ? (
                <>
                  <ul className="divide-y divide-border">
                    {roomList.map((room) => (
                      <EntityRow
                        key={room.examRoomId}
                        title={[room.roomCode, room.name].filter(Boolean).join(" · ") || "Unnamed room"}
                        meta={[room.building ?? "Building not set", room.floor != null ? `Floor ${room.floor}` : null, room.capacity ? plural(room.capacity, "seat") : null].filter(Boolean).join(" · ")}
                        badge={<StatusBadge value={room.isActive ? "Active" : "Inactive"} tone={room.isActive ? "success" : "neutral"} />}
                      />
                    ))}
                  </ul>
                  {hiddenRooms > 0 ? <p className="mt-3 text-sm text-muted-foreground">{plural(hiddenRooms, "more room")} not shown.</p> : null}
                </>
              ) : (
                <EmptyNote title="No exam rooms yet" text="Staff add exam rooms and their seats before shifts can be scheduled." />
              )}
            </PanelState>
          </DashboardPanel>
        </div>

        <div className="min-w-0 space-y-6">
          <DashboardPanel title="Needs attention" id="needs-attention">
            <PanelState
              pending={attentionPending}
              error={attentionError}
              errorText="Some items could not be checked."
              onRetry={() => {
                if (schedules.error) void schedules.refetch();
                if (papers.error) void papers.refetch();
              }}
            >
              <AttentionList items={attention} emptyText="Nothing needs your attention right now." />
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Exam papers" action={{ label: "Open papers", to: "/examiner/exams" }}>
            <PanelState pending={papers.isPending} error={papers.error} errorText="Exam papers are temporarily unavailable." onRetry={() => void papers.refetch()}>
              {paperItems?.length ? (
                <div className="space-y-5">
                  <SplitBar
                    emptyText=""
                    segments={[
                      { label: "Draft", count: countPapers(paperItems, "Draft"), swatch: "bg-warning-foreground" },
                      { label: "Published", count: countPapers(paperItems, "Published"), swatch: "bg-success-foreground" },
                      { label: "Archived", count: countPapers(paperItems, "Archived"), swatch: "bg-muted-foreground" },
                    ]}
                  />
                  <ul className="divide-y divide-border">
                    {recentPapers(paperItems).map((paper) => (
                      <EntityRow
                        key={paper.examPaperId}
                        title={paper.name ?? paper.paperCode ?? "Untitled paper"}
                        meta={[paper.paperCode ?? "No code", paper.examSubject?.name ?? "Exam", formatShortDate(paper.createdAt)].join(" · ")}
                        badge={<StatusBadge value={paper.status} tone={PAPER_TONE[paper.status]} />}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyNote title="No exam papers yet" text="Lecturers write the exam papers. They appear here once a lecturer creates one." />
              )}
            </PanelState>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

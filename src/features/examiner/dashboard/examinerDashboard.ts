import type { ExamPaper, ExamRoom, ExamSchedule } from "@/api/exams";
import type { AttentionItem, FlowStep, Stat } from "@/components/workbench/DashboardParts";
import { dayKey, dayWindow, formatClock, formatDayLabel, groupByDay, plural, startOfDay } from "@/components/workbench/dashboardTime";

/** How far ahead the dashboard looks for exam shifts. */
export const SCHEDULE_WINDOW_DAYS = 30;

export const scheduleWindow = (now: Date) => dayWindow(now, SCHEDULE_WINDOW_DAYS);

const time = (value: string) => new Date(value).getTime();

/** Today's shifts and the days after, without cancelled shifts or anything that finished before today. */
export function splitSchedules(schedules: ExamSchedule[], now: Date) {
  const todayKey = dayKey(now);
  const todayStart = startOfDay(now).getTime();
  const relevant = schedules
    .filter((schedule) => schedule.status !== "Cancelled" && time(schedule.endsAt) >= todayStart)
    .sort((a, b) => time(a.startsAt) - time(b.startsAt));
  const today = relevant.filter((schedule) => dayKey(schedule.startsAt) === todayKey);
  const later = relevant.filter((schedule) => dayKey(schedule.startsAt) > todayKey);
  return { today, later, laterGroups: groupByDay(later, (schedule) => schedule.startsAt) };
}

export function summarizeToday(today: ExamSchedule[], now: Date) {
  if (!today.length) return "No exam shifts today";
  const open = today.filter((schedule) => schedule.status === "Open").length;
  const toStart = today.filter((schedule) => time(schedule.startsAt) > now.getTime()).length;
  return [
    `${plural(today.length, "exam shift")} today`,
    open ? `${open} open now` : null,
    toStart ? `${toStart} still to start` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The next shift that has not started, from today onward. */
export function nextShift(today: ExamSchedule[], later: ExamSchedule[], now: Date) {
  return today.find((schedule) => time(schedule.startsAt) > now.getTime()) ?? later[0];
}

export function buildAttention(
  data: { papers: ExamPaper[]; schedules: ExamSchedule[] },
): AttentionItem[] {
  const draftPapers = data.papers.filter((paper) => paper.status === "Draft").length;
  const draftSchedules = data.schedules.filter((schedule) => schedule.status === "Draft").length;
  const items: AttentionItem[] = [
    { key: "papers", label: "Exam papers in draft", hint: "Finish and publish them so they can be scheduled", count: draftPapers, to: "/examiner/exams" },
    { key: "schedules", label: "Schedules not published", hint: "Check readiness and publish before candidates need them", count: draftSchedules, to: "/examiner/schedule" },
  ];
  return items.filter((item) => item.count > 0);
}

export function roomStats(rooms: ExamRoom[]) {
  const active = rooms.filter((room) => room.isActive);
  return { active: active.length, total: rooms.length, seats: active.reduce((sum, room) => sum + (room.capacity ?? 0), 0) };
}

export type OverviewData = {
  papers?: ExamPaper[];
  schedules?: ExamSchedule[];
  rooms?: ExamRoom[];
};

const UNAVAILABLE = "Not available";
/** Three headline numbers. A dataset that is missing shows a dash, so one failed request never hides the rest. */
export function buildOverview(data: OverviewData, now: Date): Stat[] {
  const { papers, schedules, rooms } = data;
  const shifts = schedules ? splitSchedules(schedules, now) : null;
  const upNext = shifts ? nextShift(shifts.today, shifts.later, now) : undefined;
  const open = shifts ? shifts.today.filter((schedule) => schedule.status === "Open").length : 0;
  const roomFacts = rooms ? roomStats(rooms) : null;
  return [
    {
      key: "papers",
      label: "Exam papers",
      value: papers ? String(papers.length) : "—",
      detail: papers ? `${countPapers(papers, "Published")} published · ${countPapers(papers, "Draft")} draft` : UNAVAILABLE,
      to: "/examiner/exams",
    },
    {
      key: "shifts",
      label: "Exam shifts, next 30 days",
      value: shifts ? String(shifts.today.length + shifts.later.length) : "—",
      detail: !shifts
        ? UNAVAILABLE
        : open
          ? `${open} open now`
          : upNext
            ? `Next: ${formatDayLabel(dayKey(upNext.startsAt), now)}, ${formatClock(upNext.startsAt)}`
            : "None scheduled",
      to: "/examiner/schedule",
    },
    {
      key: "rooms",
      label: "Active exam rooms",
      value: roomFacts ? String(roomFacts.active) : "—",
      detail: roomFacts ? `of ${roomFacts.total}${roomFacts.seats ? ` · ${roomFacts.seats} seats` : ""}` : UNAVAILABLE,
    },
  ];
}

/** The path from a blank slate to a running exam, with how far each stage has got. */
export function buildFlow(data: OverviewData, now: Date): FlowStep[] {
  const { papers, schedules } = data;
  const shifts = schedules ? splitSchedules(schedules, now) : null;
  const all = shifts ? [...shifts.today, ...shifts.later] : [];
  const draftShifts = all.filter((schedule) => schedule.status === "Draft").length;
  const openNow = shifts ? shifts.today.filter((schedule) => schedule.status === "Open").length : 0;
  const draftPapers = papers ? countPapers(papers, "Draft") : 0;
  const published = papers ? countPapers(papers, "Published") : 0;

  const unavailable = { label: "Unavailable", tone: "neutral" as const };
  return [
    {
      key: "papers",
      title: "Build exam papers",
      summary: !papers
        ? "Exam papers could not be loaded."
        : !papers.length
          ? "No exam papers yet. Create one from an exam configuration and choose its questions."
          : `${plural(draftPapers, "paper")} in draft · ${published} published`,
      status: !papers ? unavailable : !papers.length ? { label: "Not started", tone: "neutral" } : draftPapers ? { label: "In progress", tone: "warning" } : { label: "Ready", tone: "success" },
      actions: [{ label: "Exam papers", to: "/examiner/exams" }],
    },
    {
      key: "schedule",
      title: "Schedule exam shifts",
      summary: !shifts
        ? "Exam schedules could not be loaded."
        : !all.length
          ? "No exam shifts planned in the next 30 days. Pick a published paper, rooms and candidates."
          : `${plural(all.length, "shift")} in the next 30 days${draftShifts ? ` · ${draftShifts} not published` : ""}`,
      status: !shifts ? unavailable : !all.length ? { label: "Not started", tone: "neutral" } : draftShifts ? { label: "In progress", tone: "warning" } : { label: "Scheduled", tone: "success" },
      actions: [{ label: "Schedule", to: "/examiner/schedule" }],
    },
    {
      key: "operate",
      title: "Run and review exams",
      summary: openNow ? `${plural(openNow, "shift")} open now. Watch candidates live, then release grades after review.` : "Watch candidates live during an exam, then release grades after review.",
      status: openNow ? { label: "Live", tone: "success" } : { label: "Standby", tone: "neutral" },
      actions: [
        { label: "Live monitoring", to: "/examiner/monitoring" },
        { label: "Grade release", to: "/examiner/results" },
      ],
    },
  ];
}

type PaperWithSubject = ExamPaper & { examSubject?: { name: string | null } | null };

/** The newest papers first, so the list shows what was worked on last. */
export function recentPapers(papers: PaperWithSubject[], limit = 4) {
  return [...papers].sort((a, b) => time(b.createdAt) - time(a.createdAt)).slice(0, limit);
}

/** Active rooms before inactive ones, then by room code. */
export function leadingRooms(rooms: ExamRoom[], limit = 6) {
  return [...rooms]
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.roomCode ?? "").localeCompare(b.roomCode ?? ""))
    .slice(0, limit);
}

export const countPapers =(papers: ExamPaper[], status: ExamPaper["status"]) => papers.filter((paper) => paper.status === status).length;

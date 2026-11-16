import type { MyExamSchedule } from "@/api/exams";
import type { AttentionItem, Shortcut, Stat } from "@/components/workbench/DashboardParts";
import { dayKey, dayWindow, formatClock, formatDayLabel, groupByDay, startOfDay } from "@/components/workbench/dashboardTime";

/** How far ahead the dashboard looks for invigilation shifts. */
export const SHIFT_WINDOW_DAYS = 30;
export const shiftWindow = (now: Date) => dayWindow(now, SHIFT_WINDOW_DAYS);

const time = (value: string) => new Date(value).getTime();

/** The lecturer's shifts from today on, in time order, grouped by day. Cancelled shifts and earlier days are dropped. */
export function splitShifts(shifts: MyExamSchedule[], now: Date) {
  const todayStart = startOfDay(now).getTime();
  const relevant = shifts
    .filter((item) => item.schedule.status !== "Cancelled" && time(item.schedule.endsAt) >= todayStart)
    .sort((a, b) => time(a.schedule.startsAt) - time(b.schedule.startsAt));
  return { relevant, groups: groupByDay(relevant, (item) => item.schedule.startsAt) };
}

/** The shift to feature: the one in progress, otherwise the soonest one still to start. */
export function featuredShift(shifts: MyExamSchedule[], now: Date) {
  return shifts.find((item) => time(item.schedule.endsAt) > now.getTime());
}

export const ROLE_LABEL = { Chief: "Chief invigilator", Assistant: "Assistant invigilator" } as const;

export function buildAttention(
  data: { draftQuestions: number; draftMaterials: number },
): AttentionItem[] {
  const items: AttentionItem[] = [
    { key: "questions", label: "Draft questions", hint: "Activate them so they can be used in exams and practice", count: data.draftQuestions, to: "/lecturer/questions" },
    { key: "materials", label: "Draft learning materials", hint: "Publish them so students can read them", count: data.draftMaterials, to: "/lecturer/materials" },
  ];
  return items.filter((item) => item.count > 0);
}

const sumOf = (counts: Record<string, number>) => Object.values(counts).reduce((sum, count) => sum + count, 0);
const UNAVAILABLE = "Not available";

/** Three headline numbers. A dataset that is missing shows a dash, so one failed request never hides the rest. */
export function buildOverview(
  data: {
    questions?: Record<string, number>;
    materials?: Record<string, number>;
    shifts?: MyExamSchedule[];
  },
  now: Date,
): Stat[] {
  const { questions, materials, shifts } = data;
  const upcoming = shifts?.filter((item) => time(item.schedule.endsAt) > now.getTime()) ?? [];
  const next = shifts ? featuredShift(shifts, now) : undefined;
  const live = next ? time(next.schedule.startsAt) <= now.getTime() : false;
  return [
    {
      key: "questions",
      label: "Questions",
      value: questions ? String(sumOf(questions)) : "—",
      detail: questions ? `${questions.Active ?? 0} active · ${questions.Draft ?? 0} draft` : UNAVAILABLE,
      to: "/lecturer/questions",
    },
    {
      key: "materials",
      label: "Learning materials",
      value: materials ? String(sumOf(materials)) : "—",
      detail: materials ? `${materials.Published ?? 0} published · ${materials.Draft ?? 0} draft` : UNAVAILABLE,
      to: "/lecturer/materials",
    },
    {
      key: "shifts",
      label: "Invigilation shifts, next 30 days",
      value: shifts ? String(upcoming.length) : "—",
      detail: !shifts ? UNAVAILABLE : !next ? "None scheduled" : live ? "One in progress now" : `Next: ${formatDayLabel(dayKey(next.schedule.startsAt), now)}, ${formatClock(next.schedule.startsAt)}`,
      to: "/lecturer/exams",
    },
  ];
}

export const SHORTCUTS: Shortcut[] = [
  { key: "question", label: "Create a question", hint: "Write one for an exam or for practice", to: "/lecturer/questions/new?purpose=exam" },
  { key: "import", label: "Import questions", hint: "Add many at once from an Excel file", to: "/lecturer/questions/import" },
  { key: "material", label: "Upload a learning material", hint: "Share a document with your students", to: "/lecturer/materials/new" },
  { key: "paper", label: "Create an exam paper", hint: "Build a paper from your question bank", to: "/lecturer/exam-papers/new/setup" },
  { key: "grading", label: "Grade essay answers", hint: "Review and score written responses", to: "/lecturer/grading" },
];

/** One cheap request per status, reading only the total each list reports. */
export async function countByStatus<S extends string>(statuses: readonly S[], read: (status: S) => Promise<{ totalCount: number }>) {
  const totals = await Promise.all(statuses.map(read));
  return Object.fromEntries(statuses.map((status, index) => [status, totals[index].totalCount])) as Record<S, number>;
}

export const QUESTION_STATUSES = ["Active", "Draft", "Archived"] as const;
export const MATERIAL_STATUSES = ["Published", "Draft", "Archived"] as const;

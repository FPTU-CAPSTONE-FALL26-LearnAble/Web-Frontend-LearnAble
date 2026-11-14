import { useQuery } from "@tanstack/react-query";
import { FilePlus2, Upload } from "lucide-react";
import { Link } from "react-router";
import { getMyExamSchedules, type MyExamSchedule } from "@/api/exams";
import { getMaterials, getQuestions } from "@/api/lecturer";
import { fetchAllPages } from "@/api/pagination";
import { AttentionJump, AttentionList, DashboardPanel, EmptyNote, EntityRow, PanelState, ShiftRow, ShortcutList, SplitBar, StatBand } from "@/components/workbench/DashboardParts";
import { dayKey, describeStart, formatClock, formatDayLabel, formatLongDate, formatShortDate, greetingFor, limitGroups, plural } from "@/components/workbench/dashboardTime";
import { useNow } from "@/components/workbench/useNow";
import { StatusBadge } from "@/components/workbench/Workbench";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import {
  buildAttention,
  buildOverview,
  countByStatus,
  featuredShift,
  MATERIAL_STATUSES,
  QUESTION_STATUSES,
  ROLE_LABEL,
  SHORTCUTS,
  shiftWindow,
  splitShifts,
} from "../lecturerDashboard";

const SCHEDULE_TONE = { Open: "success", Published: "info", Draft: "warning", Closed: "neutral", Cancelled: "danger" } as const;
const CONTENT_TONE: Record<string, "success" | "warning" | "neutral" | "info"> = { Active: "success", Published: "success", Draft: "warning", Archived: "neutral" };
const LIST_LIMIT = 6;
const RECENT_LIMIT = 5;
const attendancePath = (item: MyExamSchedule) => `/lecturer/exams/${item.schedule.examScheduleId}/attendance`;
const shiftTitle = (item: MyExamSchedule) => item.schedule.examName ?? "Unnamed examination";

function ShiftBadges({ item }: { item: MyExamSchedule }) {
  return (
    <>
      <StatusBadge value={item.schedule.status} tone={SCHEDULE_TONE[item.schedule.status]} />
      {item.invigilatorRole ? <StatusBadge value={ROLE_LABEL[item.invigilatorRole]} tone="neutral" /> : null}
    </>
  );
}

export function LecturerDashboardRoute() {
  useRouteAnnouncer("Lecturer dashboard", "Lecturer dashboard");
  const user = useAuthStore((state) => state.user)!;
  const now = useNow();
  const today = dayKey(now);

  const questions = useQuery({
    queryKey: ["lecturer", "dashboard", "questions"],
    queryFn: () => countByStatus(QUESTION_STATUSES, (Status) => getQuestions({ Status, PageNumber: 1, PageSize: 1 })),
  });
  const materials = useQuery({
    queryKey: ["lecturer", "dashboard", "materials", user.id],
    queryFn: () => countByStatus(MATERIAL_STATUSES, (Status) => getMaterials({ UploadedBy: user.id, Status, PageNumber: 1, PageSize: 1 })),
  });
  const recentQuestions = useQuery({
    queryKey: ["lecturer", "dashboard", "recent-questions"],
    queryFn: () => getQuestions({ PageNumber: 1, PageSize: RECENT_LIMIT, SortBy: "-createdAt" }),
  });
  const recentMaterials = useQuery({
    queryKey: ["lecturer", "dashboard", "recent-materials", user.id],
    queryFn: () => getMaterials({ UploadedBy: user.id, PageNumber: 1, PageSize: RECENT_LIMIT, SortBy: "-uploadedAt" }),
  });
  const shifts = useQuery({
    queryKey: ["lecturer", "dashboard", "schedules", today],
    queryFn: () => {
      const { from, to } = shiftWindow(new Date());
      return fetchAllPages((Page, PageSize) => getMyExamSchedules({ Page, PageSize, From: from.toISOString(), To: to.toISOString() }));
    },
  });
  useExpiredSession(questions.error || materials.error || recentQuestions.error || recentMaterials.error || shifts.error);

  const { relevant, groups } = splitShifts(shifts.data?.items ?? [], now);
  const featured = featuredShift(relevant, now);
  const featuredTiming = featured ? describeStart(featured.schedule.startsAt, featured.schedule.endsAt, now) : null;
  const shownGroups = limitGroups(groups, LIST_LIMIT);
  const hiddenShifts = relevant.length - shownGroups.reduce((sum, group) => sum + group.items.length, 0);
  const attentionPending = questions.isPending || materials.isPending;
  const attentionError = questions.error || materials.error;
  const attention = buildAttention({ draftQuestions: questions.data?.Draft ?? 0, draftMaterials: materials.data?.Draft ?? 0 });
  const pendingByStat: Record<string, boolean> = { questions: questions.isPending, materials: materials.isPending, shifts: shifts.isPending };
  const overview = buildOverview(
    { questions: questions.data, materials: materials.data, shifts: shifts.data ? relevant : undefined },
    now,
  ).map((stat) => (pendingByStat[stat.key] ? { ...stat, detail: "Loading…" } : stat));
  const questionTotal = Object.values(questions.data ?? {}).reduce((sum, count) => sum + count, 0);
  const materialTotal = Object.values(materials.data ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {greetingFor(now)}, {user.fullName}.
          </h1>
          <p className="mt-2 text-muted-foreground">{formatLongDate(now)}</p>
          {attentionPending || attentionError ? null : <AttentionJump count={attention.length} targetId="needs-attention" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/lecturer/materials/new">
              <Upload />
              Upload material
            </Link>
          </Button>
          <Button asChild>
            <Link to="/lecturer/questions/new?purpose=exam">
              <FilePlus2 />
              Create question
            </Link>
          </Button>
        </div>
      </header>

      <StatBand stats={overview} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <DashboardPanel title="Next invigilation shift">
            <PanelState pending={shifts.isPending} error={shifts.error} errorText="Exam schedules are temporarily unavailable." onRetry={() => void shifts.refetch()}>
              {featured && featuredTiming ? (
                <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">{formatClock(featured.schedule.startsAt)}</p>
                    <p className="tabular-nums text-muted-foreground">
                      to {formatClock(featured.schedule.endsAt)} · {formatDayLabel(dayKey(featured.schedule.startsAt), now)}
                    </p>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="text-xl font-semibold wrap-anywhere">{shiftTitle(featured)}</p>
                    <p className="text-muted-foreground wrap-anywhere">{featured.schedule.roomName ?? "Room pending"}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <ShiftBadges item={featured} />
                      <span className={featuredTiming.state === "live" ? "font-semibold text-success-foreground" : "text-muted-foreground"}>{featuredTiming.text}</span>
                    </div>
                  </div>
                  <Button size="lg" asChild>
                    <Link to={attendancePath(featured)}>{featuredTiming.state === "live" ? "Open attendance" : "View shift"}</Link>
                  </Button>
                </div>
              ) : (
                <EmptyNote
                  title="You have no upcoming invigilation shifts."
                  text="Shifts appear here once an examiner assigns you to an exam."
                />
              )}
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Your schedule" action={{ label: "All exams", to: "/lecturer/exams" }}>
            <PanelState pending={shifts.isPending} error={shifts.error} errorText="Exam schedules are temporarily unavailable." onRetry={() => void shifts.refetch()}>
              {shownGroups.length ? (
                <div className="space-y-5">
                  {shownGroups.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <h3 className="text-base font-semibold">{formatDayLabel(group.key, now)}</h3>
                      <ul className="divide-y divide-border">
                        {group.items.map((item) => {
                          const timing = group.key === today ? describeStart(item.schedule.startsAt, item.schedule.endsAt, now) : null;
                          return (
                            <ShiftRow
                              key={item.schedule.examScheduleId}
                              start={formatClock(item.schedule.startsAt)}
                              end={formatClock(item.schedule.endsAt)}
                              title={shiftTitle(item)}
                              meta={item.schedule.roomName ?? "Room pending"}
                              status={<ShiftBadges item={item} />}
                              hint={timing?.text}
                              live={timing?.state === "live"}
                              action={{ label: "View shift", to: attendancePath(item), description: shiftTitle(item) }}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {hiddenShifts > 0 ? <p className="text-sm text-muted-foreground">{plural(hiddenShifts, "more shift")} in the next 30 days. Open all exams to see them.</p> : null}
                </div>
              ) : (
                <EmptyNote title="Nothing is scheduled for you in the next 30 days." text="Exams you are assigned to invigilate will be listed here by day." />
              )}
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Question bank" action={{ label: "Open bank", to: "/lecturer/questions" }}>
            <PanelState
              pending={questions.isPending || recentQuestions.isPending}
              error={questions.error || recentQuestions.error}
              errorText="Question counts are temporarily unavailable."
              onRetry={() => {
                if (questions.error) void questions.refetch();
                if (recentQuestions.error) void recentQuestions.refetch();
              }}
            >
              {questionTotal ? (
                <div className="space-y-5">
                  <SplitBar
                    emptyText=""
                    segments={[
                      { label: "Active", count: questions.data?.Active ?? 0, swatch: "bg-success-foreground" },
                      { label: "Draft", count: questions.data?.Draft ?? 0, swatch: "bg-warning-foreground" },
                      { label: "Archived", count: questions.data?.Archived ?? 0, swatch: "bg-muted-foreground" },
                    ]}
                  />
                  <ul className="divide-y divide-border">
                    {(recentQuestions.data?.items ?? []).map((question) => (
                      <EntityRow
                        key={question.questionId}
                        title={question.content}
                        meta={[question.questionType, question.difficulty, formatShortDate(question.createdAt)].join(" · ")}
                        badge={<StatusBadge value={question.status} tone={CONTENT_TONE[question.status] ?? "info"} />}
                      />
                    ))}
                  </ul>
                  <Button variant="outline" asChild>
                    <Link to="/lecturer/questions/import">Import questions</Link>
                  </Button>
                </div>
              ) : (
                <EmptyNote
                  title="No questions yet"
                  text="Create the first one, or import a list from Excel."
                  action={{ label: "Create question", to: "/lecturer/questions/new?purpose=exam" }}
                />
              )}
            </PanelState>
          </DashboardPanel>
        </div>

        <div className="min-w-0 space-y-6">
          <DashboardPanel title="Needs your attention" id="needs-attention">
            <PanelState
              pending={attentionPending}
              error={attentionError}
              errorText="Some items could not be checked."
              onRetry={() => {
                if (questions.error) void questions.refetch();
                if (materials.error) void materials.refetch();
              }}
            >
              <AttentionList items={attention} emptyText="Nothing needs your attention right now." />
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Learning materials" action={{ label: "Open library", to: "/lecturer/materials" }}>
            <PanelState
              pending={materials.isPending || recentMaterials.isPending}
              error={materials.error || recentMaterials.error}
              errorText="Material counts are temporarily unavailable."
              onRetry={() => {
                if (materials.error) void materials.refetch();
                if (recentMaterials.error) void recentMaterials.refetch();
              }}
            >
              {materialTotal ? (
                <div className="space-y-5">
                  <SplitBar
                    emptyText=""
                    segments={[
                      { label: "Published", count: materials.data?.Published ?? 0, swatch: "bg-success-foreground" },
                      { label: "Draft", count: materials.data?.Draft ?? 0, swatch: "bg-warning-foreground" },
                      { label: "Archived", count: materials.data?.Archived ?? 0, swatch: "bg-muted-foreground" },
                    ]}
                  />
                  <ul className="divide-y divide-border">
                    {(recentMaterials.data?.items ?? []).map((material) => (
                      <EntityRow
                        key={material.materialId}
                        title={material.title}
                        meta={[material.materialType, formatShortDate(material.uploadedAt)].join(" · ")}
                        badge={<StatusBadge value={material.status} tone={CONTENT_TONE[material.status] ?? "info"} />}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyNote title="No learning materials yet" text="Upload the first one for your students." action={{ label: "Upload material", to: "/lecturer/materials/new" }} />
              )}
            </PanelState>
          </DashboardPanel>

          <DashboardPanel title="Shortcuts">
            <ShortcutList shortcuts={SHORTCUTS} />
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

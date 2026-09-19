import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  CalendarClock,
  BookOpenText,
  CircleAlert,
  Clock3,
  FilePlus2,
  FileQuestion,
  Lock,
  MapPin,
  Search,
  Upload,
  Users,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  lecturerDashboardFixture as data,
  type WorkFilter,
} from "../data/dashboardFixture";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  notConnected,
  ScrollRegion,
  StatusBadge,
} from "../components/Workbench";
import { ExamCodeCard } from "../components/ExamCodeCard";

export function LecturerDashboardRoute() {
  const navigate = useNavigate();
  useRouteAnnouncer("Lecturer dashboard", "Lecturer dashboard");
  const user = useAuthStore((state) => state.user)!;
  const [filter, setFilter] = useState<WorkFilter>("all");
  const [query, setQuery] = useState("");
  const exam = data.todayExam;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";
  const filteredWork = useMemo(
    () =>
      data.work.filter(
        (item) =>
          (filter === "all" ||
            (filter === "urgent" ? item.priority === "Urgent" : item.review)) &&
          [
            item.id,
            item.category,
            item.title,
            item.subjectCode,
            item.issue,
          ].some((value) =>
            value.toLowerCase().includes(query.trim().toLowerCase()),
          ),
      ),
    [filter, query],
  );
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-card p-6 xl:flex-row xl:items-center">
        <h1
          tabIndex={-1}
          className="text-2xl font-extrabold tracking-[-0.025em] outline-none sm:text-3xl"
        >
          <span className="font-semibold text-muted-foreground">
            {greeting},{" "}
          </span>
          <span className="text-[var(--color-action)]">{user.fullName}.</span>
        </h1>
        <div className="flex flex-wrap gap-3">
          <Button
            className="text-white"
            onClick={() => navigate("/lecturer/questions/new?purpose=exam")}
          >
            <FilePlus2 aria-hidden />
            Create question
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/lecturer/materials/new")}
          >
            <Upload aria-hidden />
            Upload learning material
          </Button>
        </div>
      </section>
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="lecturer-major-card gap-0 rounded-xl border py-0 shadow-none ring-0">
          <div className="border-b border-[var(--color-border-subtle)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="min-h-9 px-5 py-2 text-base font-extrabold bg-[var(--color-action)] text-white shadow-[var(--shadow-control)]">
                Today’s exam
              </Badge>
              <StatusBadge value="Ready for candidates" />
            </div>
            <div className="mt-5 space-y-3 rounded-xl border border-[var(--color-border)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  <Clock3 aria-hidden className="size-5 text-secondary" />
                  Attendance opens in{" "}
                  <strong className="text-base">
                    {exam.countdownMinutes} minutes
                  </strong>{" "}
                  ({exam.attendanceTime})
                </p>
                <span className="font-bold tabular-nums">
                  Exam starts at 13:30
                </span>
              </div>
              <Progress
                value={exam.progress}
                aria-label="Countdown to attendance opening"
                aria-valuetext={`${exam.countdownMinutes} minutes until attendance opens`}
                className="h-2 bg-[var(--color-border-subtle)] [&_[data-slot=progress-indicator]]:bg-[var(--color-action)]"
              />
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--color-action)_45%,white)] bg-[var(--color-selected-bg)] p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <BookOpenText
                  aria-hidden
                  className="size-4 text-[var(--color-action)]"
                />
                Subject & semester
              </p>
              <h2 className="text-xl font-extrabold leading-snug text-[var(--color-text)]">
                {exam.subjectCode} – {exam.subject}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="min-h-7 border-[var(--color-action)] bg-white px-3 font-extrabold text-[var(--color-action)]"
                >
                  Final Exam
                </Badge>
                <span className="text-muted-foreground">Fall 2026</span>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--color-secondary)_42%,white)] bg-[var(--color-info-bg)] p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Clock3
                  aria-hidden
                  className="size-4 text-[var(--color-secondary)]"
                />
                Time & room
              </p>
              <p className="text-xl font-extrabold tabular-nums text-[var(--color-secondary)]">
                {exam.time}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="min-h-7 border-[var(--color-secondary)] bg-white px-3 font-extrabold text-[var(--color-secondary)]"
                >
                  {exam.room}
                </Badge>
                <span className="flex items-center gap-1 font-semibold text-[var(--color-text)]">
                  <MapPin
                    aria-hidden
                    className="size-3.5 text-[var(--color-secondary)]"
                  />
                  {exam.location}
                </span>
              </p>
            </div>
            <div className="relative flex min-h-36 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-success)_42%,white)] bg-[var(--color-success-bg)] p-4 pt-11">
              <p className="absolute inset-x-4 top-4 flex items-center justify-between text-xs font-bold uppercase text-muted-foreground">
                Registered candidates
                <Users
                  aria-hidden
                  className="size-4 text-[var(--color-success)]"
                />
              </p>
              <p className="flex flex-wrap items-baseline justify-center gap-2 text-center">
                <strong className="text-3xl font-extrabold text-[var(--color-success)]">
                  35
                </strong>
                <span className="text-sm font-bold">Students assigned</span>
              </p>
            </div>
            <ExamCodeCard
              code={exam.examCode}
              status="opening-soon"
              detail={`Version ${exam.version} · Opens at 13:30`}
            />
          </div>
          <div className="mx-5 mb-5 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden className="size-4" />
              Exam access follows the scheduled start time.
            </p>
            <Button
              className="text-white"
              onClick={() =>
                navigate("/lecturer/exams/swe201-final/attendance")
              }
            >
              <Users aria-hidden />
              Open attendance
            </Button>
          </div>
        </Card>
        <Card className="lecturer-major-card gap-4 rounded-xl border p-5 shadow-none ring-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <CalendarClock aria-hidden className="size-5 text-secondary" />
                Upcoming invigilation
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your next assigned shifts · Fall 2026
              </p>
            </div>
            <Button asChild variant="ghost" className="px-2 text-xs">
              <Link to="/lecturer/exams">View all</Link>
            </Button>
          </div>
          <div className="space-y-2.5">
            {data.upcoming.map((shift, index) => (
              <div
                key={shift.subjectCode}
                className="space-y-2 rounded-xl border border-[var(--color-border-subtle)] p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-bold tabular-nums">
                  <Clock3 aria-hidden className="size-4 text-secondary" />
                  {shift.date} · {shift.time}
                </p>
                <p className="text-sm font-bold leading-snug">
                  {shift.subjectCode} – {shift.subject}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{shift.room}</span>
                  <Button asChild variant="outline" className="text-xs">
                    <Link
                      to={`/lecturer/exams/${index === 0 ? "swe201-final" : "prn211-midterm"}/attendance`}
                    >
                      View shift
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-auto w-full text-xs">
            <Link to="/lecturer/exams">
              <CalendarClock aria-hidden />
              View full schedule
            </Link>
          </Button>
        </Card>
      </div>
      <Card className="lecturer-major-card gap-3.5 rounded-xl border p-5 shadow-none ring-0">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-3 xl:flex-row xl:items-center">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
              <TriangleAlert
                aria-hidden
                className="size-5 text-[var(--color-error)]"
              />
              Urgent work queue
              <StatusBadge value={`${data.totals.urgent} urgent`} />
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Resolve publication blockers and pending review items first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Filter urgent work"
            >
              {(["all", "urgent", "review"] as WorkFilter[]).map((value) => (
                <Button
                  key={value}
                  variant={filter === value ? "outline" : "ghost"}
                  className="px-2.5 text-xs"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? `All (${data.totals.all})`
                    : value === "urgent"
                      ? `Urgent (${data.totals.urgent})`
                      : `Needs review (${data.totals.review})`}
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-48">
              <Search
                aria-hidden
                className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search urgent work"
                placeholder="Search item or course…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8 text-xs"
              />
            </div>
          </div>
        </div>
        <ScrollRegion label="Urgent work table" className="overflow-x-auto">
          <Table className="min-w-[980px] text-xs">
            <TableHeader>
              <TableRow>
                {[
                  "Work type",
                  "Question / material & course",
                  "Priority",
                  "Detailed status",
                  "Action",
                ].map((label) => (
                  <TableHead key={label} className="px-3 text-xs uppercase">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWork.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-44 whitespace-normal px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-selected-bg)] text-[var(--color-action)]">
                        {item.id.startsWith("DOC") ? (
                          <BookOpenText aria-hidden className="size-4" />
                        ) : (
                          <FileQuestion aria-hidden className="size-4" />
                        )}
                      </span>
                      <div>
                        <p className="font-semibold">{item.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          #{item.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal px-3 py-2.5">
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Course: {item.subjectCode}
                    </p>
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge value={item.priority} />
                  </TableCell>
                  <TableCell className="w-60 whitespace-normal px-3">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <CircleAlert
                        aria-hidden
                        className="size-4 shrink-0 text-[var(--color-error)]"
                      />
                      {item.impact}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.issue}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Button
                      variant={
                        item.priority === "Urgent" ? "default" : "outline"
                      }
                      className={
                        item.priority === "Urgent"
                          ? "text-xs text-white"
                          : "text-xs"
                      }
                      onClick={() => notConnected(item.action)}
                    >
                      {item.action}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredWork.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No matching work items. Try another search or filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollRegion>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-2 text-xs">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-muted-foreground"
          >
            <span>
              Showing {filteredWork.length} priority items of {data.totals.all}
            </span>{" "}
            · {data.totals.completedToday} completed today
          </p>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => notConnected("Triage Studio")}
          >
            Open Triage Studio
          </Button>
        </div>
      </Card>
    </div>
  );
}

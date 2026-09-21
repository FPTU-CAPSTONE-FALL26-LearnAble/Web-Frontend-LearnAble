/* eslint-disable jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-tabindex -- Radix card labels and named bounded table scrollers are intentional. */
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  FilePlus2,
  LayoutGrid,
  List,
  MonitorCheck,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Progress } from "@/shared/ui/primitives/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  getQuestion,
  getQuestions,
  getSemesters,
  getSubjects,
  getTopics,
} from "@/api/catalog";
import { useExpiredSession } from "@/features/lecturer/api/useLecturerData";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Dialog, DialogContent } from "@/shared/ui/primitives/dialog";
import { toast } from "@/shared/ui/primitives/toast";
import { candidates, examPapers, incidents, rooms } from "../data/fixtures";

const unavailable = (label: string) =>
  toast({
    title: "Feature not connected",
    description: `${label} is a UI preview and has not been connected to the backend.`,
  });

function ApiState({
  pending,
  error,
  empty,
  onRetry,
}: {
  pending: boolean;
  error: unknown;
  empty?: boolean;
  onRetry: () => void;
}) {
  if (pending)
    return (
      <p role="status" className="p-4 text-sm">
        Loading data…
      </p>
    );
  if (error) {
    return (
      <div
        role="alert"
        className="m-4 rounded-xl border border-[var(--color-error)] p-4"
      >
        <p className="font-bold">Unable to load data from LearnAble API.</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (empty)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        No matching data is available.
      </p>
    );
  return null;
}

type ExamDraft = {
  subjectId: string;
  semesterId: string;
  selectedQuestionIds: string[];
};
const examDraftKey = "learnable:examiner:exam-draft-v1";
const defaultExamDraft: ExamDraft = {
  subjectId: "",
  semesterId: "",
  selectedQuestionIds: [],
};

function readExamDraft(): ExamDraft {
  try {
    const stored = sessionStorage.getItem(examDraftKey);
    return stored
      ? { ...defaultExamDraft, ...(JSON.parse(stored) as ExamDraft) }
      : defaultExamDraft;
  } catch {
    return defaultExamDraft;
  }
}

function useExamDraft() {
  const [draft, setDraftState] = useState<ExamDraft>(readExamDraft);
  const setDraft = (next: ExamDraft) => {
    setDraftState(next);
    sessionStorage.setItem(examDraftKey, JSON.stringify(next));
  };
  return [draft, setDraft] as const;
}

function useAcademicCatalog() {
  const subjects = useQuery({
    queryKey: ["examiner", "subjects"],
    queryFn: () => getSubjects(),
  });
  const semesters = useQuery({
    queryKey: ["examiner", "semesters"],
    queryFn: () => getSemesters(),
  });
  useExpiredSession(subjects.error || semesters.error);
  return { subjects, semesters };
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <span className="sr-only">{eyebrow}</span> : null}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "blue",
  icon: Icon = CircleDot,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "orange" | "red";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const color =
    tone === "green"
      ? "var(--color-success)"
      : tone === "orange"
        ? "var(--color-action)"
        : tone === "red"
          ? "var(--color-error)"
          : "var(--color-secondary)";
  return (
    <div className="examiner-panel p-5">
      <div className="flex items-start justify-between">
        <p className="examiner-kicker">{label}</p>
        <span
          className="rounded-lg p-2"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 10%, white)`,
          }}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function Status({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const color =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : tone === "danger"
          ? "var(--color-error)"
          : "var(--color-secondary)";
  return (
    <span
      className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-extrabold"
      style={{
        color,
        borderColor: color,
        background: `color-mix(in srgb, ${color} 10%, white)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function SimulationNotice() {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-lg border border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_7%,white)] px-4 py-3 text-sm">
      <Radio className="size-4 text-[var(--color-secondary)]" />
      <span>
        <strong>Simulation data.</strong> Operational actions are not connected
        to live exam services.
      </span>
    </div>
  );
}

export function ExaminerDashboardRoute() {
  const user = useAuthStore((state) => state.user)!;
  useRouteAnnouncer("Examiner dashboard", "Examiner operations dashboard");
  return (
    <div>
      <PageHeading
        eyebrow="Exam operations command"
        title={`Good morning, ${user.fullName}.`}
        description="Monitor the current shift, resolve operational blockers, and prepare upcoming exams."
        actions={
          <>
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
          </>
        }
      />
      <SimulationNotice />
      <section className="examiner-command rounded-2xl p-5 shadow-lg sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="examiner-primary border-0 text-white">
                CURRENT SHIFT · MORNING 02
              </Badge>
              <Status tone="success">Live exam</Status>
            </div>
            <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">
              SWE201 & PRF192 · 67 candidates
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Safe Exam Browser · 65/67 kiosks online · 09:30–11:30
            </p>
          </div>
          <div className="min-w-64 rounded-xl border border-white/20 bg-white/5 p-4 text-right">
            <p className="text-xs font-bold uppercase text-white/60">
              Kiosk integrity
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[var(--color-success)]">
              97.0%
            </p>
            <Button
              variant="outline"
              className="mt-3 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => unavailable("Kiosk connection test")}
            >
              Check kiosk network
            </Button>
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Exam papers"
          value="41"
          detail="14 draft · 8 review · 19 scheduled"
          tone="orange"
          icon={FileCheck2}
        />
        <Metric
          label="Candidates"
          value="67"
          detail="65 working · 2 need attention"
          tone="green"
          icon={Users}
        />
        <Metric
          label="Submission sync"
          value="32/67"
          detail="3 submissions waiting to sync"
          icon={RefreshCw}
        />
        <Metric
          label="Active incidents"
          value="02"
          detail="Immediate intervention required"
          tone="red"
          icon={AlertTriangle}
        />
      </section>
      <section className="examiner-major mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
          <div>
            <p className="examiner-kicker text-[var(--color-error)]">
              Priority queue
            </p>
            <h2 className="mt-1 text-xl font-extrabold">
              Critical incidents requiring action
            </h2>
          </div>
          <Button
            variant="outline"
            onClick={() => unavailable("Incident creation")}
          >
            Record incident
          </Button>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {incidents.map((incident) => (
            <article
              key={incident.id}
              className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Status
                    tone={
                      incident.severity === "Critical" ? "danger" : "warning"
                    }
                  >
                    {incident.severity}
                  </Status>
                  <strong>
                    {incident.station} · {incident.room}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {incident.time}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {incident.detail}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => unavailable("Technical support call")}
                >
                  Call technician
                </Button>
                <Button onClick={() => unavailable("Incident resolution")}>
                  Resolve now
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="examiner-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Active exam rooms</h2>
            <Link
              to="/examiner/monitoring"
              className="text-sm font-bold text-[var(--color-secondary)]"
            >
              Open monitoring →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {rooms.slice(0, 2).map((room) => (
              <div
                key={room.id}
                className="rounded-xl border border-[var(--color-border-subtle)] p-4"
              >
                <div className="flex justify-between gap-3">
                  <strong>{room.name}</strong>
                  <Status tone="success">
                    {room.online}/{room.capacity} online
                  </Status>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {room.subject} · {room.invigilators}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="examiner-panel p-5">
          <h2 className="text-lg font-extrabold">Upcoming operations</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[var(--color-border-subtle)] p-4">
              <strong>13:30 · SWE201 Final Exam</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                Lab Alpha 302 · 35 candidates
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] p-4">
              <strong>15:45 · PRN211 Midterm</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                Lab Beta 204 · 30 candidates
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ExamBankRoute() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  useRouteAnnouncer("Exam Paper Management", "Exam Paper Management");
  const rows = examPapers.filter(
    (paper) =>
      `${paper.code} ${paper.title} ${paper.subject}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || paper.status === status),
  );
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management"
        title="Exam Paper Bank"
        description="Build, review, and prepare secure exam packages for upcoming sessions."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => unavailable("Exam bank import")}
            >
              Import
            </Button>
            <Button
              variant="outline"
              onClick={() => unavailable("Exam bank export")}
            >
              Export
            </Button>
            <Button asChild>
              <Link to="/examiner/exams/new/setup">
                <FilePlus2 />
                Create exam paper
              </Link>
            </Button>
          </>
        }
      />
      <SimulationNotice />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Valid exam packages"
          value="42/48"
          detail="87.5% ready for scheduling"
          tone="green"
        />
        <Metric
          label="Secure-browser ready"
          value="45"
          detail="93.7% configuration coverage"
        />
        <Metric
          label="In review"
          value="3"
          detail="Requires examiner review"
          tone="orange"
        />
        <Metric
          label="Encrypted"
          value="100%"
          detail="AES-256 package encryption"
        />
      </section>
      <section className="examiner-panel mt-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_auto]">
          <Label className="relative">
            <span className="sr-only">Search exam papers</span>
            <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, subject, or title"
            />
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Ready">Ready</SelectItem>
              <SelectItem value="Review">In review</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-[var(--color-border-subtle)] p-1">
            <Button
              size="icon"
              variant={view === "grid" ? "primary" : "ghost"}
              aria-label="Grid view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid />
            </Button>
            <Button
              size="icon"
              variant={view === "list" ? "primary" : "ghost"}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List />
            </Button>
          </div>
        </div>
      </section>
      <section
        className={
          view === "grid"
            ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            : "mt-5 space-y-3"
        }
      >
        {rows.map((paper) => (
          <article key={paper.id} className="examiner-major flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="outline">{paper.subject}</Badge>
              <Status
                tone={
                  paper.status === "Ready"
                    ? "success"
                    : paper.status === "Review"
                      ? "warning"
                      : "info"
                }
              >
                {paper.status}
              </Status>
            </div>
            <p className="mt-3 font-mono text-xs font-bold text-muted-foreground">
              {paper.code}
            </p>
            <h2 className="mt-2 text-lg font-extrabold">{paper.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {paper.type} · {paper.semester}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-secondary)_5%,white)] p-3 text-center">
              <div>
                <p className="examiner-kicker">Questions</p>
                <strong>{paper.questions}</strong>
              </div>
              <div>
                <p className="examiner-kicker">Duration</p>
                <strong>{paper.duration}m</strong>
              </div>
              <div>
                <p className="examiner-kicker">Versions</p>
                <strong>4</strong>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => unavailable("Exam details")}
              >
                Details
              </Button>
              <Button className="flex-1" asChild>
                <Link to="/examiner/schedule/new/details">Schedule</Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

const paperSteps = [
  "Exam setup",
  "Question selection",
  "Operations",
  "Readiness",
];
const scheduleSteps = [
  "Shift details",
  "Rooms & staff",
  "Candidates",
  "Readiness",
];
function Stepper({
  steps,
  current,
  base,
}: {
  steps: string[];
  current: number;
  base: string;
}) {
  return (
    <ol className="mb-6 grid gap-2 md:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step}>
          <Link
            to={`${base}/${["setup", "questions", "operations", "readiness"][i] ?? ""}`}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${i === current ? "border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action)_8%,white)]" : "border-[var(--color-border-subtle)] text-muted-foreground"}`}
          >
            <span
              className={`grid size-7 place-items-center rounded-lg ${i === current ? "bg-[var(--color-action)] text-white" : "bg-[var(--color-border-subtle)]"}`}
            >
              {i + 1}
            </span>
            {step}
          </Link>
        </li>
      ))}
    </ol>
  );
}
function WizardActions({
  back,
  next,
  nextLabel = "Continue",
  nextDisabled = false,
}: {
  back: string;
  next?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-5">
      <Button variant="outline" asChild>
        <Link to={back}>
          <ArrowLeft />
          Back
        </Link>
      </Button>
      <Button variant="outline" onClick={() => unavailable("Draft saving")}>
        Save draft
      </Button>
      {next && !nextDisabled ? (
        <Button asChild>
          <Link to={next}>
            {nextLabel}
            <ArrowRight />
          </Link>
        </Button>
      ) : (
        <Button disabled={nextDisabled} onClick={() => unavailable(nextLabel)}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

type ScheduleStaff = {
  lead302: string;
  second302: string;
  lead304: string;
  second304: string;
};

const scheduleStaffKey = "learnable:examiner:schedule-staff";
const defaultScheduleStaff: ScheduleStaff = {
  lead302: "nguyen",
  second302: "le",
  lead304: "dang",
  second304: "",
};

function readScheduleStaff(): ScheduleStaff {
  try {
    const stored = sessionStorage.getItem(scheduleStaffKey);
    return stored
      ? { ...defaultScheduleStaff, ...(JSON.parse(stored) as ScheduleStaff) }
      : defaultScheduleStaff;
  } catch {
    return defaultScheduleStaff;
  }
}

function useScheduleStaff() {
  const [staff, setStaffState] = useState<ScheduleStaff>(readScheduleStaff);
  const setStaff = (next: ScheduleStaff) => {
    setStaffState(next);
    sessionStorage.setItem(scheduleStaffKey, JSON.stringify(next));
  };
  return [staff, setStaff] as const;
}

export function ExamSetupRoute() {
  const [draft, setDraft] = useExamDraft();
  const catalog = useAcademicCatalog();
  const subjects = catalog.subjects.data?.items ?? [];
  const semesters = catalog.semesters.data?.items ?? [];
  useRouteAnnouncer("Create exam paper", "Exam setup");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management / New exam"
        title="Exam setup"
        description="Define the academic identity, duration, scoring, and student instructions."
      />
      <Stepper steps={paperSteps} current={0} base="/examiner/exams/new" />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="examiner-major p-5">
          <h2 className="text-lg font-extrabold">Academic identity</h2>
          <ApiState
            pending={catalog.subjects.isPending || catalog.semesters.isPending}
            error={catalog.subjects.error || catalog.semesters.error}
            empty={
              !catalog.subjects.isPending &&
              !catalog.semesters.isPending &&
              (!subjects.length || !semesters.length)
            }
            onRetry={() => {
              void catalog.subjects.refetch();
              void catalog.semesters.refetch();
            }}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <Select
                value={draft.subjectId}
                onValueChange={(subjectId) => setDraft({ ...draft, subjectId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem
                      key={subject.subjectId}
                      value={subject.subjectId}
                    >
                      {subject.subjectCode} ·{" "}
                      {subject.subjectNameEn ?? "Not available"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select
                value={draft.semesterId}
                onValueChange={(semesterId) =>
                  setDraft({ ...draft, semesterId })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem
                      key={semester.semesterId}
                      value={semester.semesterId}
                    >
                      {semester.semesterName} · {semester.academicYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Exam type">
              <Select defaultValue="final">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="final">Final Exam</SelectItem>
                  <SelectItem value="midterm">Midterm Exam</SelectItem>
                  <SelectItem value="practical">Practical Exam</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Exam title">
              <Input defaultValue="Software Engineering Final Exam" />
            </Field>
            <Field label="Exam code">
              <Input defaultValue="SWE201_FE_FA26_01" />
            </Field>
          </div>
        </section>
        <section className="examiner-panel p-5">
          <h2 className="text-lg font-extrabold">Assessment settings</h2>
          <div className="mt-5 space-y-4">
            <Field label="Duration (minutes)">
              <Input type="number" defaultValue="90" />
            </Field>
            <Field label="Maximum score">
              <Input type="number" defaultValue="10" />
            </Field>
            <Field label="Number of versions">
              <Input type="number" defaultValue="4" />
            </Field>
          </div>
        </section>
      </div>
      <section className="examiner-panel mt-5 p-5">
        <h2 className="text-lg font-extrabold">Rules and instructions</h2>
        <Textarea
          className="mt-4 min-h-36"
          defaultValue="Read each question carefully. The exam runs in Safe Exam Browser. External applications and communication tools are not permitted."
        />
      </section>
      <WizardActions
        back="/examiner/exams"
        next="/examiner/exams/new/questions"
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function QuestionSelectionRoute() {
  const [draft, setDraft] = useExamDraft();
  const topicsQuery = useQuery({
    queryKey: ["examiner", "topics", draft.subjectId],
    queryFn: () =>
      getTopics({
        SubjectId: draft.subjectId || undefined,
        IsActive: true,
      }),
  });
  const [selected, setSelected] = useState(
    () => new Set(draft.selectedQuestionIds),
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState("all");
  const [questionType, setQuestionType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string>();
  const questionData = useQuery({
    queryKey: [
      "examiner",
      "questions",
      search,
      topicId,
      questionType,
      difficulty,
      page,
    ],
    queryFn: () =>
      getQuestions({
        SearchTerm: search || undefined,
        TopicId: topicId === "all" ? undefined : topicId,
        QuestionType: questionType === "all" ? undefined : questionType,
        Difficulty: difficulty === "all" ? undefined : difficulty,
        Status: "Active",
        PageNumber: page,
        PageSize: 10,
        SortBy: "-createdAt",
      }),
  });
  const preview = useQuery({
    queryKey: ["examiner", "question-preview", previewId],
    queryFn: () => getQuestion(previewId ?? ""),
    enabled: Boolean(previewId),
  });
  useExpiredSession(questionData.error || preview.error || topicsQuery.error);
  useRouteAnnouncer("Create exam paper", "Question selection");
  const rows = questionData.data?.items ?? [];
  const topics = topicsQuery.data?.items ?? [];
  const toggle = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setDraft({ ...draft, selectedQuestionIds: [...next] });
      return next;
    });
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management / New exam"
        title="Question selection and matrix"
        description="Build the exam from the question bank while keeping the academic distribution balanced."
      />
      <Stepper steps={paperSteps} current={1} base="/examiner/exams/new" />
      <SimulationNotice />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="examiner-major overflow-hidden">
          <form
            className="grid gap-3 border-b border-[var(--color-border-subtle)] p-4 md:grid-cols-[1fr_repeat(3,160px)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query.trim());
              setPage(1);
            }}
          >
            <Label className="relative md:self-end">
              <span className="sr-only">Search question bank</span>
              <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
              <Input
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search question bank"
              />
            </Label>
            <Select
              value={topicId}
              onValueChange={(value) => {
                setTopicId(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.topicId} value={topic.topicId}>
                    {topic.topicName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={questionType}
              onValueChange={(value) => {
                setQuestionType(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by question type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Single">Single choice</SelectItem>
                <SelectItem value="Multiple">Multiple choice</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={difficulty}
              onValueChange={(value) => {
                setDifficulty(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search />
              Search
            </Button>
          </form>
          <ApiState
            pending={questionData.isPending || topicsQuery.isPending}
            error={questionData.error || topicsQuery.error}
            empty={!questionData.isPending && rows.length === 0}
            onRetry={() => {
              void questionData.refetch();
              void topicsQuery.refetch();
            }}
          />
          {!questionData.isPending && !questionData.error ? (
            <div
              className="examiner-scroll max-h-[620px] divide-y divide-[var(--color-border-subtle)] overflow-y-auto"
              role="region"
              aria-label="Available active questions"
              tabIndex={0}
            >
              {rows.map((question) => {
                const topic = topics.find(
                  (item) => item.topicId === question.topicId,
                );
                return (
                  <label
                    key={question.questionId}
                    className="flex cursor-pointer items-start gap-3 p-4 hover:bg-[color-mix(in_srgb,var(--color-secondary)_4%,white)]"
                  >
                    <Checkbox
                      checked={selected.has(question.questionId)}
                      onCheckedChange={() => toggle(question.questionId)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <strong>
                          {question.questionId.slice(0, 8)} · {question.content}
                        </strong>
                        <Badge variant="outline">{question.difficulty}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {topic?.topicName ?? "Topic not available"} ·{" "}
                        {question.questionType} · {question.defaultScore} points
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewId(question.questionId);
                      }}
                    >
                      Preview
                    </Button>
                  </label>
                );
              })}
            </div>
          ) : null}
          {questionData.data && questionData.data.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] p-4">
              <Button
                variant="outline"
                disabled={!questionData.data.hasPreviousPage}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-sm font-bold">
                Page {questionData.data.pageNumber} of{" "}
                {questionData.data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={!questionData.data.hasNextPage}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>
        <aside className="space-y-4">
          <div className="examiner-command rounded-2xl p-5">
            <p className="text-xs font-bold uppercase text-white/60">
              Selected questions
            </p>
            <p className="mt-2 text-4xl font-extrabold">
              {selected.size}
              <span className="text-lg text-white/60"> / 40</span>
            </p>
            <Progress value={(selected.size / 40) * 100} className="mt-4" />
          </div>
          <div className="examiner-panel p-5">
            <h2 className="font-extrabold">Bloom distribution</h2>
            {[
              ["Remember", 30],
              ["Understand", 40],
              ["Apply", 30],
            ].map(([label, value]) => (
              <div key={label} className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <Progress value={Number(value)} className="mt-2" />
              </div>
            ))}
          </div>
          <div className="examiner-panel p-5">
            <h2 className="font-extrabold">Matrix status</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add {Math.max(0, 40 - selected.size)} more questions to meet the
              target.
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => unavailable("Matrix reconciliation")}
            >
              Check matrix
            </Button>
          </div>
        </aside>
      </div>
      <WizardActions
        back="/examiner/exams/new/setup"
        next="/examiner/exams/new/operations"
      />
      <Dialog
        open={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) setPreviewId(undefined);
        }}
      >
        <DialogContent
          title="Question preview"
          description="Live question detail from LearnAble API."
          closeLabel="Close question preview"
        >
          <ApiState
            pending={preview.isPending}
            error={preview.error}
            onRetry={() => void preview.refetch()}
          />
          {preview.data ? (
            <div className="space-y-4">
              <p className="font-bold">{preview.data.content}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preview.data.questionType}</Badge>
                <Badge variant="outline">{preview.data.difficulty}</Badge>
                <Badge variant="outline">
                  {preview.data.defaultScore} points
                </Badge>
              </div>
              {preview.data.options.length ? (
                <ol className="space-y-2">
                  {[...preview.data.options]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((option) => (
                      <li
                        key={option.optionId}
                        className="rounded-lg border border-[var(--color-border-subtle)] p-3"
                      >
                        {option.content}
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No answer options were returned.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ExamOperationsRoute() {
  useRouteAnnouncer("Create exam paper", "Exam operations");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management / New exam"
        title="Operations and security"
        description="Configure save intervals, submission rules, reconnection behavior, and approved exam applications."
      />
      <Stepper steps={paperSteps} current={2} base="/examiner/exams/new" />
      <div className="grid gap-5 xl:grid-cols-2">
        <ConfigPanel
          title="Autosave and synchronization"
          items={[
            "Save responses every 15 seconds",
            "Keep an encrypted local recovery buffer",
            "Retry synchronization after reconnection",
          ]}
        />
        <ConfigPanel
          title="Time and submission"
          items={[
            "Show reminders at 30, 15, and 5 minutes",
            "Submit automatically when time expires",
            "Allow examiner-controlled compensation time",
          ]}
        />
        <ConfigPanel
          title="Connection recovery"
          items={[
            "Allow a 5-minute reconnect window",
            "Lock navigation while disconnected",
            "Record all reconnect events",
          ]}
        />
        <ConfigPanel
          title="Approved applications"
          items={[
            "Safe Exam Browser",
            "Visual Studio Code",
            ".NET SDK and compiler",
          ]}
        />
      </div>
      <WizardActions
        back="/examiner/exams/new/questions"
        next="/examiner/exams/new/readiness"
      />
    </div>
  );
}
function ConfigPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="examiner-major p-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <label
            key={item}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] px-3"
          >
            <Checkbox defaultChecked={index !== 2} />
            <span className="text-sm font-semibold">{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function ExamReadinessRoute() {
  useRouteAnnouncer("Create exam paper", "Exam readiness");
  const checks = [
    "Academic metadata is complete",
    "40 questions meet the approved matrix",
    "Timing and autosave policies are configured",
    "Approved applications are listed",
    "Student instructions are present",
    "Four encrypted versions are prepared",
  ];
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management / New exam"
        title="Readiness review"
        description="Review the student experience and verify operational requirements before requesting publication."
      />
      <Stepper steps={paperSteps} current={3} base="/examiner/exams/new" />
      <SimulationNotice />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="examiner-major p-5">
          <h2 className="text-lg font-extrabold">Readiness checklist</h2>
          <div className="mt-4 space-y-3">
            {checks.map((check) => (
              <div
                key={check}
                className="flex gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3"
              >
                <CheckCircle2 className="size-5 shrink-0 text-[var(--color-success)]" />
                <span className="text-sm font-semibold">{check}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-[color-mix(in_srgb,var(--color-success)_10%,white)] p-4">
            <p className="font-extrabold text-[var(--color-success)]">
              6 of 6 checks passed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Local readiness preview only.
            </p>
          </div>
        </aside>
        <section className="examiner-major overflow-hidden">
          <div className="examiner-command p-5">
            <h2 className="text-xl font-extrabold">
              Student preview · SWE201 Final Exam
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Question 12 of 40 · 0.25 points
            </p>
          </div>
          <div className="p-6">
            <p className="examiner-kicker">Question 12</p>
            <h3 className="mt-3 text-lg font-extrabold">
              Which statement best describes continuous integration?
            </h3>
            <div className="mt-5 space-y-3">
              {[
                "Code is integrated and tested frequently",
                "Testing happens only before release",
                "Each developer works on a separate permanent branch",
                "Deployment replaces automated testing",
              ].map((answer, i) => (
                <label
                  key={answer}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] px-4"
                >
                  <input
                    type="radio"
                    name="preview-answer"
                    defaultChecked={i === 0}
                  />
                  {answer}
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
      <WizardActions
        back="/examiner/exams/new/operations"
        nextLabel="Request publication"
      />
    </div>
  );
}

export function ExamScheduleDashboardRoute() {
  useRouteAnnouncer("Exam Schedule", "Exam Schedule and Shift Cockpit");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Operations"
        title="Exam Schedule & Shift Cockpit"
        description="Coordinate rooms, staffing, candidates, and readiness across the examination day."
        actions={
          <Button asChild>
            <Link to="/examiner/schedule/new/details">
              <CalendarDays />
              Create exam shift
            </Link>
          </Button>
        }
      />
      <SimulationNotice />
      <section className="examiner-command rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-white/60">
              Tuesday · September 22, 2026
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              Linear exam timeline · 07:00–18:00
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Day
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Week
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Month
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["07:30", "MAD101", "Complete"],
            ["09:30", "PRF192", "Active"],
            ["13:30", "SWE201", "Ready"],
            ["15:45", "PRJ301", "Pending"],
          ].map(([time, code, state]) => (
            <div
              key={time}
              className="rounded-xl border border-white/20 bg-white/5 p-4"
            >
              <p className="text-2xl font-extrabold">{time}</p>
              <p className="mt-2 font-bold">{code}</p>
              <p className="text-xs text-white/60">{state}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className="examiner-major overflow-hidden">
          <div className="border-b border-[var(--color-border-subtle)] p-5">
            <h2 className="text-lg font-extrabold">Scheduled shifts</h2>
          </div>
          {examPapers.slice(0, 4).map((paper, i) => (
            <article
              key={paper.id}
              className="grid gap-4 border-b border-[var(--color-border-subtle)] p-5 last:border-0 lg:grid-cols-[100px_1fr_auto] lg:items-center"
            >
              <div>
                <p className="text-xl font-extrabold text-[var(--color-action)]">
                  {["07:30", "09:30", "13:30", "15:45"][i]}
                </p>
                <p className="text-xs text-muted-foreground">90 minutes</p>
              </div>
              <div>
                <strong>
                  {paper.subject} · {paper.title}
                </strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lab Alpha {302 + i} · {30 + i * 5} candidates
                </p>
              </div>
              <Status tone={i < 2 ? "success" : i === 2 ? "warning" : "info"}>
                {i < 2 ? "Ready" : i === 2 ? "Needs review" : "Scheduled"}
              </Status>
            </article>
          ))}
        </div>
        <aside className="space-y-5">
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Room readiness</h2>
            <div className="mt-4 space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] p-3"
                >
                  <div>
                    <strong className="text-sm">{room.name}</strong>
                    <p className="text-xs text-muted-foreground">
                      {room.capacity} stations
                    </p>
                  </div>
                  <Status tone={room.state === "Active" ? "success" : "info"}>
                    {room.state}
                  </Status>
                </div>
              ))}
            </div>
          </div>
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Staffing coverage</h2>
            <p className="mt-3 text-3xl font-extrabold">8/9</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One additional invigilator required for the afternoon shift.
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => unavailable("Staff assignment")}
            >
              Open assignment
            </Button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ScheduleStepper({ current }: { current: number }) {
  const routes = ["details", "rooms", "candidates", "readiness"];
  return (
    <ol className="mb-6 grid gap-2 md:grid-cols-4">
      {scheduleSteps.map((step, i) => (
        <li key={step}>
          <Link
            to={`/examiner/schedule/new/${routes[i]}`}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${i === current ? "border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action)_8%,white)]" : "border-[var(--color-border-subtle)] text-muted-foreground"}`}
          >
            <span
              className={`grid size-7 place-items-center rounded-lg ${i === current ? "bg-[var(--color-action)] text-white" : "bg-[var(--color-border-subtle)]"}`}
            >
              {i + 1}
            </span>
            {step}
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function ScheduleDetailsRoute() {
  const [examDraft] = useExamDraft();
  const [subjectId, setSubjectId] = useState(examDraft.subjectId);
  const [semesterId, setSemesterId] = useState(examDraft.semesterId);
  const catalog = useAcademicCatalog();
  const subjects = catalog.subjects.data?.items ?? [];
  const semesters = catalog.semesters.data?.items ?? [];
  useRouteAnnouncer("Create exam schedule", "Shift details");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Schedule / New shift"
        title="Shift details and time window"
        description="Select the approved exam package, academic scope, date, and examination window."
      />
      <ScheduleStepper current={0} />
      <SimulationNotice />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="examiner-major p-5">
          <h2 className="text-lg font-extrabold">Exam package</h2>
          <ApiState
            pending={catalog.subjects.isPending || catalog.semesters.isPending}
            error={catalog.subjects.error || catalog.semesters.error}
            empty={
              !catalog.subjects.isPending &&
              !catalog.semesters.isPending &&
              (!subjects.length || !semesters.length)
            }
            onRetry={() => {
              void catalog.subjects.refetch();
              void catalog.semesters.refetch();
            }}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Campus">
              <Select defaultValue="hoa-lac">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoa-lac">Hoa Lac Campus</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem
                      key={semester.semesterId}
                      value={semester.semesterId}
                    >
                      {semester.semesterName} · {semester.academicYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem
                      key={subject.subjectId}
                      value={subject.subjectId}
                    >
                      {subject.subjectCode} ·{" "}
                      {subject.subjectNameEn ?? "Not available"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Exam">
              <Select defaultValue="swe">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swe">SWE201_FE_FA26_01</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>
        <section className="examiner-major p-5">
          <h2 className="text-lg font-extrabold">Time window</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Exam date">
              <Input type="date" defaultValue="2026-09-22" />
            </Field>
            <Field label="Shift">
              <Select defaultValue="afternoon">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning · 09:30–11:00</SelectItem>
                  <SelectItem value="afternoon">
                    Afternoon · 14:00–15:30
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Check-in opens">
              <Input type="time" defaultValue="13:30" />
            </Field>
            <Field label="Maximum compensation">
              <Input defaultValue="30 minutes" />
            </Field>
          </div>
        </section>
      </div>
      <WizardActions
        back="/examiner/schedule"
        next="/examiner/schedule/new/rooms"
      />
    </div>
  );
}

export function ScheduleRoomsRoute() {
  const [selected, setSelected] = useState(new Set(["alpha-302", "alpha-304"]));
  const [staff, setStaff] = useScheduleStaff();
  const assignedCount = Object.values(staff).filter(Boolean).length;
  useRouteAnnouncer("Create exam schedule", "Rooms and staff");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Schedule / New shift"
        title="Rooms and staff assignment"
        description="Allocate suitable labs and confirm invigilator coverage for the selected shift."
      />
      <ScheduleStepper current={1} />
      <div className="grid gap-5 xl:grid-cols-2">
        {rooms.map((room) => (
          <label
            key={room.id}
            className={`examiner-major cursor-pointer p-5 ${selected.has(room.id) ? "border-[var(--color-action)]" : ""}`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selected.has(room.id)}
                onCheckedChange={() =>
                  setSelected((old) => {
                    const next = new Set(old);
                    if (next.has(room.id)) next.delete(room.id);
                    else next.add(room.id);
                    return next;
                  })
                }
              />
              <div className="flex-1">
                <div className="flex justify-between gap-3">
                  <h2 className="text-lg font-extrabold">{room.name}</h2>
                  <Status tone={room.state === "Active" ? "success" : "info"}>
                    {room.capacity} stations
                  </Status>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {room.invigilators}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-success)_8%,white)] p-3">
                    <strong>Network ready</strong>
                  </div>
                  <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-secondary)_7%,white)] p-3">
                    <strong>SEB verified</strong>
                  </div>
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>
      <section className="examiner-major mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Invigilator coverage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a room lead and secondary invigilator to each selected lab.
            </p>
          </div>
          <Status tone={assignedCount === 4 ? "success" : "warning"}>
            {assignedCount} of 4 roles assigned
          </Status>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {["Lab Alpha 302", "Lab Alpha 304"].map((roomName, roomIndex) => (
            <div
              key={roomName}
              className="rounded-xl border border-[var(--color-border-subtle)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{roomName}</strong>
                <span className="text-xs text-muted-foreground">
                  2 required
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Room lead">
                  <Select
                    value={roomIndex === 0 ? staff.lead302 : staff.lead304}
                    onValueChange={(value) =>
                      setStaff({
                        ...staff,
                        [roomIndex === 0 ? "lead302" : "lead304"]: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nguyen">Nguyen Van A</SelectItem>
                      <SelectItem value="dang">Dang Quoc Huy</SelectItem>
                      <SelectItem value="phan">Phan Dinh Nam</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Second invigilator">
                  <Select
                    value={
                      roomIndex === 0
                        ? staff.second302 || "unassigned"
                        : staff.second304 || "unassigned"
                    }
                    onValueChange={(value) =>
                      setStaff({
                        ...staff,
                        [roomIndex === 0 ? "second302" : "second304"]:
                          value === "unassigned" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="le">Le Hoang Yen</SelectItem>
                      <SelectItem value="phan">Phan Dinh Nam</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {roomIndex === 1 && !staff.second304 ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_8%,white)] p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]" />
                  <span>
                    <strong>Coverage gap:</strong> assign one additional
                    invigilator before release.
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => unavailable("Staff conflict check")}
          >
            Check conflicts
          </Button>
          <Button
            variant="outline"
            onClick={() => unavailable("Staff suggestions")}
          >
            Suggest available staff
          </Button>
        </div>
      </section>
      <WizardActions
        back="/examiner/schedule/new/details"
        next="/examiner/schedule/new/candidates"
      />
    </div>
  );
}

export function ScheduleCandidatesRoute() {
  const [query, setQuery] = useState("");
  const filtered = candidates.filter((c) =>
    `${c.name} ${c.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  useRouteAnnouncer("Create exam schedule", "Candidates and seating");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Schedule / New shift"
        title="Candidates and seating"
        description="Review eligibility and arrange candidates across the selected examination rooms."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => unavailable("Candidate import")}
            >
              Import CSV
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Seats rearranged locally",
                  description:
                    "The fixture seating map has been updated only in this browser session.",
                })
              }
            >
              Auto-seat candidates
            </Button>
          </>
        }
      />
      <ScheduleStepper current={2} />
      <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
        <section className="examiner-major overflow-hidden">
          <div className="border-b border-[var(--color-border-subtle)] p-4">
            <Label className="relative">
              <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
              <Input
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search candidate"
              />
            </Label>
          </div>
          <div className="border-b border-[var(--color-border-subtle)] px-4 py-2 text-xs text-muted-foreground sm:hidden">
            Swipe horizontally to view room and eligibility.
          </div>
          <div
            className="examiner-scroll max-h-[650px] overflow-auto"
            role="region"
            aria-label="Candidate allocation table"
            tabIndex={0}
          >
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Seat</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--color-border-subtle)]"
                  >
                    <td className="p-3">
                      <strong>{c.name}</strong>
                      <p className="text-xs text-muted-foreground">{c.id}</p>
                    </td>
                    <td className="p-3 font-bold">
                      {String(c.seat).padStart(2, "0")}
                    </td>
                    <td className="p-3">
                      Lab Alpha {c.seat <= 18 ? "302" : "304"}
                    </td>
                    <td className="p-3">
                      <Status tone="success">Eligible</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="examiner-major p-5">
          <h2 className="text-lg font-extrabold">Seat map · Alpha 302</h2>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <button
                key={i}
                className="aspect-square rounded-lg border border-[var(--color-border-subtle)] text-xs font-bold hover:border-[var(--color-action)]"
                aria-label={`Seat ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-between text-sm">
            <span>35 assigned</span>
            <strong className="text-[var(--color-success)]">
              100% allocated
            </strong>
          </div>
        </aside>
      </div>
      <WizardActions
        back="/examiner/schedule/new/rooms"
        next="/examiner/schedule/new/readiness"
      />
    </div>
  );
}

export function ScheduleReadinessRoute() {
  const [staff] = useScheduleStaff();
  const assignedCount = Object.values(staff).filter(Boolean).length;
  const staffingComplete = assignedCount === 4;
  useRouteAnnouncer("Create exam schedule", "Schedule readiness");
  return (
    <div>
      <PageHeading
        eyebrow="Exam Schedule / New shift"
        title="Readiness and release"
        description="Complete the final operational review before requesting the shift release."
      />
      <ScheduleStepper current={3} />
      <SimulationNotice />
      <section className="examiner-command rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold">
              Final review · SWE201 Afternoon shift
            </h2>
            <p className="mt-1 text-white/70">
              September 22, 2026 · 14:00–15:30
            </p>
          </div>
          <Status tone={staffingComplete ? "success" : "warning"}>
            {staffingComplete
              ? "Configuration complete"
              : "Staffing action required"}
          </Status>
        </div>
      </section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Exam package"
          value="01"
          detail="Approved and encrypted"
          tone="green"
          icon={FileCheck2}
        />
        <Metric
          label="Rooms"
          value="02"
          detail="75 available stations"
          icon={MonitorCheck}
        />
        <Metric
          label="Candidates"
          value="35"
          detail="All seats allocated"
          tone="orange"
          icon={Users}
        />
        <Metric
          label="Staff"
          value={`${String(assignedCount).padStart(2, "0")}/04`}
          detail={
            staffingComplete ? "Coverage confirmed" : "One assignment remains"
          }
          tone={staffingComplete ? "green" : "orange"}
          icon={ShieldCheck}
        />
      </section>
      <section className="examiner-major mt-5 p-5">
        <h2 className="text-lg font-extrabold">
          Room and invigilator allocation
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rooms.slice(0, 2).map((room, index) => {
            const roomReady = index === 0 || Boolean(staff.second304);
            return (
              <div
                key={room.id}
                className="rounded-xl border border-[var(--color-border-subtle)] p-4"
              >
                <div className="flex justify-between">
                  <strong>{room.name}</strong>
                  <Status tone={roomReady ? "success" : "warning"}>
                    {roomReady ? "Ready" : "Staffing gap"}
                  </Status>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {index === 0
                    ? "Nguyen Van A · Le Hoang Yen"
                    : staff.second304
                      ? "Dang Quoc Huy · Phan Dinh Nam"
                      : "Dang Quoc Huy · Secondary invigilator unassigned"}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="examiner-panel p-5">
          <h2 className="text-lg font-extrabold">Exam and time evidence</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Exam code", "SWE201_FE_FA26_01"],
              ["Exam type", "Final Exam"],
              ["Date", "September 22, 2026"],
              ["Window", "14:00–15:30"],
              ["Check-in", "13:30"],
              ["Campus", "Hoa Lac"],
            ].map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-[var(--color-border-subtle)] p-3"
              >
                <dt className="text-xs font-bold uppercase text-muted-foreground">
                  {key}
                </dt>
                <dd className="mt-1 font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="examiner-panel p-5">
          <h2 className="text-lg font-extrabold">
            Candidate allocation evidence
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between rounded-lg border border-[var(--color-border-subtle)] p-3">
              <span>Eligible candidates</span>
              <strong>35/35</strong>
            </div>
            <div className="flex justify-between rounded-lg border border-[var(--color-border-subtle)] p-3">
              <span>Seats assigned</span>
              <strong>35/35</strong>
            </div>
            <div className="flex justify-between rounded-lg border border-[var(--color-border-subtle)] p-3">
              <span>Unresolved conflicts</span>
              <strong
                className={
                  staffingComplete
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-warning)]"
                }
              >
                {staffingComplete ? "0" : "1 staffing gap"}
              </strong>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Local readiness preview. Release remains unavailable until the
            backend workflow is connected.
          </p>
        </div>
      </section>
      <WizardActions
        back="/examiner/schedule/new/candidates"
        nextLabel={
          staffingComplete
            ? "Release unavailable — backend not connected"
            : "Resolve staffing gap to release"
        }
        nextDisabled
      />
    </div>
  );
}

export function LiveMonitoringRoute() {
  useRouteAnnouncer("Live Exam Monitoring", "Live Exam Monitoring");
  return (
    <div>
      <PageHeading
        eyebrow="Examiner / Live operations"
        title="Live Exam Monitoring"
        description="Monitor active rooms, kiosk connectivity, submissions, and incidents from one command surface."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => unavailable("Submission reconciliation")}
            >
              Reconcile submissions
            </Button>
            <Button onClick={() => unavailable("Incident report")}>
              Report incident
            </Button>
          </>
        }
      />
      <SimulationNotice />
      <section className="examiner-command rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="examiner-primary border-0 text-white">
                AFTERNOON SHIFT 01 · 14:00–15:30
              </Badge>
              <Status tone="success">Live exam</Status>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">
              SWE201 and PRF192 · Fall 2026
            </h2>
          </div>
          <div className="rounded-xl border border-white/20 px-5 py-3">
            <p className="text-xs text-white/60">Time remaining</p>
            <strong className="text-2xl">39:36</strong>
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Connected kiosks"
          value="65/67"
          detail="97.0% online"
          tone="green"
          icon={MonitorCheck}
        />
        <Metric
          label="Submissions"
          value="30/75"
          detail="28 acknowledged · 2 retrying"
          icon={RefreshCw}
        />
        <Metric
          label="Active rooms"
          value="2+1"
          detail="Two live · one standby"
          icon={LayoutGrid}
        />
        <Metric
          label="Incidents"
          value="02"
          detail="Currently being handled"
          tone="red"
          icon={AlertTriangle}
        />
      </section>
      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Active exam rooms matrix</h2>
          <Status tone="success">Live simulation</Status>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="examiner-major flex flex-col overflow-hidden"
            >
              <div className="border-b border-[var(--color-border-subtle)] p-5">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.subject}
                    </p>
                  </div>
                  <Status
                    tone={room.state === "Active" ? "success" : "warning"}
                  >
                    {room.state}
                  </Status>
                </div>
              </div>
              <div className="flex-1 space-y-4 p-5">
                <p className="text-sm">
                  <span className="text-muted-foreground">Invigilators:</span>{" "}
                  <strong>{room.invigilators}</strong>
                </p>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Kiosk connectivity</span>
                    <strong>
                      {room.online}/{room.capacity}
                    </strong>
                  </div>
                  <Progress
                    className="mt-2"
                    value={(room.online / room.capacity) * 100}
                  />
                </div>
                <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-secondary)_6%,white)] p-4">
                  <span className="text-sm">Submission progress</span>
                  <strong className="float-right">
                    {room.submitted}/{room.capacity}
                  </strong>
                </div>
              </div>
              <Button className="m-4 mt-0" asChild>
                <Link to={`/examiner/monitoring/${room.id}`}>
                  Open room view
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="examiner-panel p-5">
          <h2 className="text-lg font-extrabold">Live event stream</h2>
          <div className="mt-4 space-y-3">
            {[
              "10:08 · Submission acknowledged from Kiosk 14",
              "10:07 · Lab Alpha 304 integrity check passed",
              "10:05 · Reconnection attempt started for Kiosk 05",
              "10:02 · Examiner note added to candidate HE170124",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="examiner-major p-5">
          <h2 className="text-lg font-extrabold text-[var(--color-error)]">
            Emergency incidents
          </h2>
          <div className="mt-4 space-y-3">
            {incidents.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_5%,white)] p-4"
              >
                <strong>
                  {i.station} · {i.room}
                </strong>
                <p className="mt-1 text-sm">{i.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function RoomMonitoringRoute() {
  const { roomId } = useParams();
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const [filter, setFilter] = useState("all");
  useRouteAnnouncer("Room monitoring", `${room.name} monitoring`);
  const visible = candidates.filter(
    (c) => filter === "all" || c.state === filter,
  );
  return (
    <div>
      <PageHeading
        eyebrow="Live Exam Monitoring / Room"
        title={`${room.name} · Detailed monitoring`}
        description={`${room.subject} · ${room.invigilators}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/examiner/monitoring">
              <ArrowLeft />
              All rooms
            </Link>
          </Button>
        }
      />
      <SimulationNotice />
      <section className="examiner-command rounded-2xl p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-white/60">Connected</p>
            <strong className="text-2xl">
              {room.online}/{room.capacity}
            </strong>
          </div>
          <div>
            <p className="text-xs text-white/60">Submitted</p>
            <strong className="text-2xl">{room.submitted}</strong>
          </div>
          <div>
            <p className="text-xs text-white/60">Working</p>
            <strong className="text-2xl">
              {room.capacity - room.submitted - 1}
            </strong>
          </div>
          <div>
            <p className="text-xs text-white/60">Incidents</p>
            <strong className="text-2xl text-[var(--color-error)]">01</strong>
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["all", "All 35 kiosks"],
          ["Working", "Working"],
          ["Submitted", "Submitted"],
          ["Disconnected", "Disconnected"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "primary" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
        {visible.map((c) => (
          <Link
            key={c.id}
            to={`/examiner/monitoring/${room.id}/candidates/${c.id}`}
            className={`rounded-xl border p-3 transition hover:-translate-y-0.5 ${c.state === "Disconnected" ? "border-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_8%,white)]" : c.state === "Submitted" ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_8%,white)]" : "border-[var(--color-border-subtle)]"}`}
          >
            <div className="flex items-center justify-between">
              <strong className="text-lg">
                {String(c.seat).padStart(2, "0")}
              </strong>
              <MonitorCheck className="size-4" />
            </div>
            <p className="mt-3 truncate text-xs font-bold">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.id}</p>
            <Progress className="mt-3" value={(c.progress / 40) * 100} />
            <p className="mt-2 text-xs font-bold">{c.state}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

export function CandidateMonitoringRoute() {
  const { roomId, candidateId } = useParams();
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const candidate =
    candidates.find((c) => c.id === candidateId) ?? candidates[0];
  useRouteAnnouncer("Candidate monitoring", `${candidate.name} monitoring`);
  return (
    <div>
      <PageHeading
        eyebrow={`${room.name} / Candidate`}
        title={`${candidate.name} · Seat ${String(candidate.seat).padStart(2, "0")}`}
        description={`${candidate.id} · SWE201 Final Exam · Kiosk ${String(candidate.seat).padStart(2, "0")}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`/examiner/monitoring/${room.id}`}>
              <ArrowLeft />
              Room view
            </Link>
          </Button>
        }
      />
      <SimulationNotice />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="space-y-5">
          <div className="examiner-command rounded-2xl p-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-white/60">Progress</p>
                <strong className="text-2xl">{candidate.progress}/40</strong>
              </div>
              <div>
                <p className="text-xs text-white/60">Remaining</p>
                <strong className="text-2xl">39:36</strong>
              </div>
              <div>
                <p className="text-xs text-white/60">Network link</p>
                <strong
                  className={`text-lg ${candidate.state === "Disconnected" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}
                >
                  {candidate.state === "Disconnected"
                    ? "Disconnected"
                    : "Stable"}
                </strong>
              </div>
              <div>
                <p className="text-xs text-white/60">Exam session</p>
                <strong className="text-lg">
                  {candidate.state === "Disconnected"
                    ? "Paused"
                    : candidate.state}
                </strong>
              </div>
            </div>
          </div>
          <div className="examiner-major overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
              <div>
                <h2 className="text-lg font-extrabold">
                  Workstation live view
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  KIOSK-A302-{String(candidate.seat).padStart(2, "0")} ·
                  simulated verification feed
                </p>
              </div>
              <Status tone="success">Identity verified</Status>
            </div>
            <div className="grid gap-4 bg-[var(--color-text)] p-5 text-white lg:grid-cols-[1fr_220px]">
              <div className="grid min-h-72 place-items-center rounded-xl border border-white/20 bg-white/5 p-6 text-center">
                <div>
                  <MonitorCheck className="mx-auto size-12 text-[var(--color-success)]" />
                  <p className="mt-4 text-xl font-extrabold">
                    Secure exam workspace active
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    Question {candidate.progress + 1} is visible · no prohibited
                    process detected
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                <div className="grid aspect-[4/3] place-items-center rounded-lg bg-white/10">
                  <Users className="size-12 text-white/60" />
                  <span className="sr-only">Candidate camera simulation</span>
                </div>
                <p className="mt-3 text-sm font-bold">Candidate camera</p>
                <p className="text-xs text-white/60">
                  Face present · framing stable
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => unavailable("Verification snapshot")}
                >
                  Capture snapshot
                </Button>
              </div>
            </div>
          </div>
          <div className="examiner-major p-5">
            <h2 className="text-lg font-extrabold">Workstation controls</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => unavailable("Time compensation")}
              >
                Add 15 minutes
              </Button>
              <Button
                variant="outline"
                onClick={() => unavailable("Kiosk hot-swap")}
              >
                Move to backup kiosk
              </Button>
              <Button
                variant="outline"
                onClick={() => unavailable("Candidate snapshot")}
              >
                Capture verification snapshot
              </Button>
              <Button onClick={() => unavailable("Candidate incident report")}>
                Create incident report
              </Button>
            </div>
          </div>
          <div className="examiner-major p-5">
            <h2 className="text-lg font-extrabold">Answer progress</h2>
            <Progress
              value={(candidate.progress / 40) * 100}
              className="mt-4"
            />
            <div className="mt-5 grid grid-cols-10 gap-2">
              {Array.from({ length: 40 }, (_, i) => (
                <span
                  key={i}
                  className={`grid aspect-square place-items-center rounded-md border text-xs font-bold ${i < candidate.progress ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_9%,white)]" : "border-[var(--color-border-subtle)]"}`}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </section>
        <aside className="space-y-5">
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Kiosk telemetry</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Device", "KIOSK-A302-01"],
                ["IP address", "10.24.30.101"],
                ["SEB version", "4.8.2"],
                ["Last sync", "10:08:14"],
                ["Packet loss", "0.1%"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-2"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="examiner-panel p-5">
            <h2 className="text-lg font-extrabold">Event history</h2>
            <div className="mt-4 space-y-4">
              {[
                "10:08 · Answer package synchronized",
                "10:02 · Candidate returned to question 18",
                "09:55 · Integrity heartbeat verified",
                "09:31 · Exam session started",
              ].map((event) => (
                <div
                  key={event}
                  className="rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm"
                >
                  {event}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

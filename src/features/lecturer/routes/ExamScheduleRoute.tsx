import { useState } from "react";
import { Link } from "react-router";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Badge } from "@/shared/ui/primitives/badge";
import { ExamOverview } from "../components/ExamOverview";
import { StatusBadge } from "../components/Workbench";
import { examShifts } from "../data/examFixture";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { ExamCodeCard } from "../components/ExamCodeCard";

export function ExamScheduleRoute() {
  useRouteAnnouncer("Exam Schedule & Rooms", "Exam Schedule & Rooms");
  const fullName = useAuthStore((state) => state.user?.fullName) ?? "Lecturer";
  const [semester, setSemester] = useState("fall-2026");
  const [semesterGroupStart, setSemesterGroupStart] = useState(0);
  const semesterOptions = [
    ["fall-2026", "Fall 2026"], ["summer-2026", "Summer 2026"], ["spring-2026", "Spring 2026"],
    ["fall-2025", "Fall 2025"], ["summer-2025", "Summer 2025"], ["spring-2025", "Spring 2025"],
    ["fall-2024", "Fall 2024"], ["summer-2024", "Summer 2024"], ["spring-2024", "Spring 2024"],
    ["fall-2023", "Fall 2023"], ["summer-2023", "Summer 2023"], ["spring-2023", "Spring 2023"],
  ] as const;
  const visibleSemesters = semesterOptions.slice(semesterGroupStart, semesterGroupStart + 3);
  const moveSemesterGroup = (direction: -1 | 1) => {
    const nextStart = Math.max(0, Math.min(semesterOptions.length - 3, semesterGroupStart + direction * 3));
    setSemesterGroupStart(nextStart);
    setSemester(semesterOptions[nextStart][0]);
  };
  const selectedSemesterLabel = semesterOptions.find(([value]) => value === semester)?.[1] ?? "Fall 2026";
  return <div className="space-y-8">
    <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
      {semesterGroupStart > 0 && <Button type="button" size="icon" variant="outline" aria-label="Show newer semesters" onClick={() => moveSemesterGroup(-1)}><ChevronLeft aria-hidden /></Button>}
      <div key={semesterGroupStart} className="flex min-w-0 flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none" role="tablist" aria-label="Academic semester">
        {visibleSemesters.map(([value, label]) => <Button key={value} type="button" role="tab" aria-selected={semester === value} variant={semester === value ? "default" : "outline"} className={semester === value ? "text-white" : undefined} onClick={() => setSemester(value)}>{label}</Button>)}
      </div>
      {semesterGroupStart < semesterOptions.length - 3 && <Button type="button" size="icon" variant="outline" aria-label="Show older semesters" onClick={() => moveSemesterGroup(1)}><ChevronRight aria-hidden /></Button>}
    </div>
    {semester === "fall-2026" ? <>
      <ExamOverview exam={examShifts[0]} />
    {(["this", "next"] as const).map((week) => {
      const shifts = examShifts.filter((exam) => exam.week === week);
      return <section key={week} className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex flex-wrap items-center gap-2.5"><CalendarDays aria-hidden className={`size-6 ${week === "this" ? "text-[var(--color-action)]" : "text-muted-foreground"}`} /><h2 className="text-xl font-extrabold tracking-tight">{week === "this" ? "This week (Sep 15–21, 2026)" : "Next week (Sep 22–28, 2026)"}</h2><Badge variant="outline" className={week === "this" ? "border-[var(--color-action)] bg-[var(--color-selected-bg)] text-[var(--color-action)]" : "border-[var(--color-border-subtle)] bg-white text-muted-foreground"}>{shifts.length} exam {shifts.length === 1 ? "shift" : "shifts"}</Badge></div>
          <span className="text-xs font-semibold text-muted-foreground">{week === "this" ? "Hoa Lac Campus" : "Main examination period"}</span>
        </header>
        <div className="space-y-5">{shifts.map((exam, index) => {
          const isToday = week === "this" && index === 0;
          return <Card key={exam.id} className={`lecturer-major-card py-0 shadow-none ${isToday ? "lecturer-today-exam-card border-[3px]" : "border"}`}><CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={isToday ? "border-transparent bg-[var(--color-selected-bg)] text-[var(--color-action)]" : "border-[var(--color-border-subtle)] bg-white text-muted-foreground"}>{isToday && <span aria-hidden className="mr-1.5 size-2 rounded-full bg-[var(--color-action)]" />}{exam.date}</Badge><StatusBadge value={exam.assessment} /></div>
                <h3 className="text-xl font-extrabold tracking-tight">{exam.subjectCode} – {exam.subject}</h3>
                <dl className="mt-6 grid max-w-4xl gap-y-7 rounded-xl border border-[var(--color-border-subtle)] bg-white p-7 sm:grid-cols-3 sm:gap-x-16 sm:[&>div+div]:border-l sm:[&>div+div]:border-[var(--color-border-subtle)] sm:[&>div+div]:pl-8">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Room & location</dt>
                      <dd className="mt-1.5 flex items-start gap-2 text-sm font-extrabold"><MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />{exam.room} · {exam.location}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Invigilators</dt>
                      <dd className="mt-1.5 flex items-start gap-2 text-sm font-extrabold"><Users aria-hidden className="size-4 shrink-0 text-muted-foreground" />{exam.invigilators.replace("Lecturer One", fullName)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Candidates</dt>
                      <dd className="mt-1.5 flex items-center gap-2 text-sm font-extrabold"><Users aria-hidden className="size-4 text-[var(--color-action)]" /><strong className="text-lg tabular-nums">{exam.students}</strong> students</dd>
                    </div>
                </dl>
              </div>
              <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:items-end">
                <div className={`rounded-xl border px-4 py-3 text-right ${isToday ? "border-[var(--color-action)] bg-[var(--color-selected-bg)]" : "border-[var(--color-border-subtle)] bg-white"}`}><p className={`flex items-center justify-end gap-2 text-2xl font-extrabold tabular-nums ${isToday ? "text-[var(--color-action)]" : "text-[var(--color-text)]"}`}><Clock3 aria-hidden className="size-5" />{exam.time}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">Duration: {exam.duration} minutes</p></div>
                {isToday ? (
                  <div className="flex w-full flex-col gap-2 sm:w-96">
                    <ExamCodeCard code={exam.examCode} status={exam.codeStatus} detail={`Unlocks at ${exam.time.split("–")[0]}`} />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild><Link to={`/lecturer/exams/${exam.id}/attendance`}>View seating map</Link></Button>
                      <Button variant="outline" disabled title="Attendance opens 30 minutes before the exam">Attendance</Button>
                    </div>
                    <p className="text-right text-xs font-semibold text-muted-foreground">Attendance opens 30 minutes before the exam.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <ExamCodeCard code={exam.examCode} status="scheduled" compact />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild><Link to={`/lecturer/exams/${exam.id}/attendance`}>Seating map</Link></Button>
                      <Button variant="outline" disabled title="Attendance opens 30 minutes before the exam">Attendance</Button>
                    </div>
                    <p className="text-right text-xs font-semibold text-muted-foreground">Attendance opens 30 minutes before the exam.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent></Card>;
        })}</div>
      </section>;
    })}
    </> : <PastSemesterSchedule semester={selectedSemesterLabel as keyof typeof pastSemesterExams} lecturerName={fullName} />}
  </div>;
}

const pastSemesterExams = {
  "Summer 2026": [
    { code: "PRN211", subject: "C# & .NET Architecture", assessment: "Final Exam", date: "July 18, 2026", time: "08:00–10:00", room: "Lab Beta 204", candidates: 28, examCode: "PRN211-FE-SU26-01" },
    { code: "SWE201", subject: "Software Engineering", assessment: "Final Exam", date: "July 21, 2026", time: "13:30–15:30", room: "Lab Alpha 302", candidates: 32, examCode: "SWE201-FE-SU26-02" },
  ],
  "Spring 2026": [
    { code: "IOT102", subject: "Internet of Things Fundamentals", assessment: "Final Exam", date: "March 20, 2026", time: "10:15–12:15", room: "Lab IoT 105", candidates: 30, examCode: "IOT102-FE-SP26-01" },
  ],
  "Fall 2025": [
    { code: "SWE201", subject: "Software Engineering", assessment: "Final Exam", date: "December 19, 2025", time: "13:30–15:30", room: "Lab Alpha 302", candidates: 31, examCode: "SWE201-FE-FA25-01" },
  ],
  "Summer 2025": [
    { code: "PRN211", subject: "C# & .NET Architecture", assessment: "Final Exam", date: "July 17, 2025", time: "08:00–10:00", room: "Lab Beta 204", candidates: 27, examCode: "PRN211-FE-SU25-01" },
  ],
  "Spring 2025": [
    { code: "IOT102", subject: "Internet of Things Fundamentals", assessment: "Final Exam", date: "March 21, 2025", time: "10:15–12:15", room: "Lab IoT 105", candidates: 29, examCode: "IOT102-FE-SP25-01" },
  ],
  "Fall 2024": [
    { code: "SWE201", subject: "Software Engineering", assessment: "Final Exam", date: "December 20, 2024", time: "13:30–15:30", room: "Lab Alpha 302", candidates: 30, examCode: "SWE201-FE-FA24-01" },
  ],
  "Summer 2024": [
    { code: "PRN211", subject: "C# & .NET Architecture", assessment: "Final Exam", date: "July 19, 2024", time: "08:00–10:00", room: "Lab Beta 204", candidates: 26, examCode: "PRN211-FE-SU24-01" },
  ],
  "Spring 2024": [
    { code: "IOT102", subject: "Internet of Things Fundamentals", assessment: "Final Exam", date: "March 22, 2024", time: "10:15–12:15", room: "Lab IoT 105", candidates: 28, examCode: "IOT102-FE-SP24-01" },
  ],
  "Fall 2023": [
    { code: "SWE201", subject: "Software Engineering", assessment: "Final Exam", date: "December 22, 2023", time: "13:30–15:30", room: "Lab Alpha 302", candidates: 29, examCode: "SWE201-FE-FA23-01" },
  ],
  "Summer 2023": [
    { code: "PRN211", subject: "C# & .NET Architecture", assessment: "Final Exam", date: "July 21, 2023", time: "08:00–10:00", room: "Lab Beta 204", candidates: 25, examCode: "PRN211-FE-SU23-01" },
  ],
  "Spring 2023": [
    { code: "IOT102", subject: "Internet of Things Fundamentals", assessment: "Final Exam", date: "March 24, 2023", time: "10:15–12:15", room: "Lab IoT 105", candidates: 27, examCode: "IOT102-FE-SP23-01" },
  ],
} as const;

function PastSemesterSchedule({ semester, lecturerName }: { semester: keyof typeof pastSemesterExams; lecturerName: string }) {
  const exams = pastSemesterExams[semester];
  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
      <div className="flex items-center gap-3"><CalendarDays aria-hidden className="size-6 text-muted-foreground" /><div><h2 className="text-xl font-extrabold">{semester} exam history</h2><p className="text-sm text-muted-foreground">Completed invigilation schedule</p></div></div>
      <Badge variant="outline">{exams.length} completed {exams.length === 1 ? "shift" : "shifts"}</Badge>
    </header>
    <div className="space-y-4">
      {exams.map((exam) => <Card key={exam.examCode} className="lecturer-major-card border py-0 shadow-none"><CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge value="Completed" /><Badge variant="outline">{exam.assessment}</Badge><span className="text-xs font-semibold text-muted-foreground">{exam.date}</span></div>
          <h3 className="text-xl font-extrabold">{exam.code} – {exam.subject}</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-muted-foreground"><span className="flex items-center gap-2"><Clock3 aria-hidden className="size-4" />{exam.time}</span><span className="flex items-center gap-2"><MapPin aria-hidden className="size-4" />{exam.room}</span><span className="flex items-center gap-2"><Users aria-hidden className="size-4" />{exam.candidates} candidates</span><span className="flex items-center gap-2"><CheckCircle2 aria-hidden className="size-4" />{lecturerName}</span></div>
        </div>
        <ExamCodeCard code={exam.examCode} status="closed" compact />
      </CardContent></Card>)}
    </div>
  </section>;
}

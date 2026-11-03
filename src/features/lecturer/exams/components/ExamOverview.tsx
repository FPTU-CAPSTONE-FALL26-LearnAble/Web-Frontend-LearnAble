import { Link } from "react-router";
import { Clock3, Grid3X3, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Progress } from "@/shared/ui/primitives/progress";
import { StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import type { ExamShift } from "../model";
import { ExamCodeCard } from "./ExamCodeCard";

export function ExamOverview({ exam, attendance = false }: { exam: ExamShift; attendance?: boolean }) {
  return (
    <Card className="lecturer-major-card lecturer-active-exam-card overflow-hidden border-2 bg-card py-0 shadow-none">
      <CardContent className="flex flex-col items-start justify-between gap-6 p-6 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-primary-foreground">
              <span aria-hidden className="size-2 rounded-full bg-primary-foreground" />
              {attendance ? "Attendance in progress" : "Today’s priority exam shift"}
            </span>
            {!attendance && <StatusBadge value="Ready for candidates" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className={attendance
                  ? "text-xl font-extrabold tracking-tight lg:text-2xl xl:whitespace-nowrap"
                  : "text-2xl font-extrabold tracking-tight sm:text-3xl"}
              >
                {exam.subjectCode} – {exam.subject}
              </h2>
              <span className="rounded-md border border-primary bg-background px-2.5 py-1 text-xs font-extrabold text-primary">{exam.assessment} · Fall 2026</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="flex items-center gap-2 text-lg font-extrabold tabular-nums text-primary"><Clock3 aria-hidden className="size-5" />{exam.time} ({exam.duration} minutes)</p>
              <p className="flex items-start gap-2 text-sm font-bold"><MapPin aria-hidden className="size-5 shrink-0 text-muted-foreground" />{exam.room} · {exam.location} · Hoa Lac</p>
            </div>
          </div>
          <div className="max-w-2xl rounded-xl border border-primary/35 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="flex items-center gap-2 font-bold"><Clock3 aria-hidden className="size-5 text-warning-foreground" />{attendance ? "Exam package opens in 18 minutes" : "Attendance opens in 20 minutes (13:10)"}</p>
              <span className="font-extrabold tabular-nums text-muted-foreground">Exam time: {exam.time}</span>
            </div>
            <Progress value={68} aria-label="Example countdown to exam opening" aria-valuetext={attendance ? "18 minutes" : "20 minutes"} className="mt-3 h-2 bg-muted [&_[data-slot=progress-indicator]]:bg-primary" />
          </div>
        </div>
        <div className={`flex w-full flex-col gap-2.5 sm:w-auto xl:shrink-0 ${attendance ? "xl:w-auto" : "xl:w-96"}`}>
          <ExamCodeCard code={exam.examCode} status={attendance ? "open" : exam.codeStatus} detail={attendance ? "Available for the active attendance session" : "Unlocks at 13:30"} compact={attendance} />
          {!attendance && (
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" className="min-w-0 px-3" asChild><Link to={`/lecturer/exams/${exam.id}/attendance`}><Grid3X3 aria-hidden />View seating map</Link></Button>
              <Button className="min-w-0 px-3 text-white" asChild><Link to={`/lecturer/exams/${exam.id}/attendance`}><Users aria-hidden />Attendance</Link></Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

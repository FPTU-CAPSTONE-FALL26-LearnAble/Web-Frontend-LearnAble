import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Flag, Search, ShieldCheck, UsersRound } from "lucide-react";
import { getExamEnrollments, getExamSchedules, updateExamEnrollment } from "@/api/exams";
import { getExamSubjects } from "@/api/exams";
import { downloadExamReport, getAttemptActivities, getAttemptIntegrity, getExamReportIncidents, getExamReportOverview, getExamReportStudents, getIntegrityReviews, getScheduleIntegrityReviews, resolveAttemptIntegrity } from "@/api/examOperations";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
export { GradeReleaseRoute } from "./GradeReleaseRoute";

function IntegrityWorkspace({ incidentsOnly = false }: { incidentsOnly?: boolean }) {
  const client = useQueryClient();
  const [searchParams] = useSearchParams();
  const scheduleId = searchParams.get("scheduleId")?.trim() ?? "";
  const [search, setSearch] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState("");
  const [decision, setDecision] = useState("Dismissed");
  const [reason, setReason] = useState("");
  const reviews = useQuery({
    queryKey: ["examiner", "integrity-reviews", scheduleId, incidentsOnly, search],
    queryFn: () => {
      const filters = { StudentKeyword: search || undefined, IncidentStatus: incidentsOnly ? "Ongoing" : undefined, Page: 1, PageSize: 100, Sort: "-lastFlaggedAt" };
      return scheduleId ? getScheduleIntegrityReviews(scheduleId, filters) : getIntegrityReviews(filters);
    },
  });
  const detail = useQuery({ queryKey: ["examiner", "integrity", selectedAttempt], queryFn: () => getAttemptIntegrity(selectedAttempt), enabled: Boolean(selectedAttempt) });
  const activities = useQuery({ queryKey: ["examiner", "activities", selectedAttempt], queryFn: () => getAttemptActivities(selectedAttempt), enabled: Boolean(selectedAttempt) });
  const resolve = useMutation({
    mutationFn: () => resolveAttemptIntegrity(selectedAttempt, detail.data!.revision, { decision, reason: reason.trim() }),
    onSuccess: async () => {
      toast({ title: "Integrity decision saved", description: "The review and its audit history were updated." });
      setReason("");
      await Promise.all([client.invalidateQueries({ queryKey: ["examiner", "integrity-reviews"] }), client.invalidateQueries({ queryKey: ["examiner", "integrity", selectedAttempt] })]);
    },
    onError: () => toast({ title: "Decision not saved", description: "The review may have changed. Refresh it and try again." }),
  });
  return <main className="space-y-6">
    <header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight">{incidentsOnly ? "Flagged sessions" : "Integrity review"}</h1><p className="mt-2 text-muted-foreground">Review integrity reports, signal interruptions and the candidate activity timeline returned by the Backend.</p></header>
    {scheduleId ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 p-4"><p className="text-sm font-semibold">Showing integrity reviews for the selected exam schedule.</p><Button variant="outline" asChild><Link to={incidentsOnly ? "/examiner/flags" : "/examiner/reviews"}>Show all schedules</Link></Button></div> : null}
    <label htmlFor="integrity-student-search" className="block max-w-xl space-y-2 font-semibold">Search students<span className="relative block"><Search className="absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden /><Input id="integrity-student-search" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student name or code" /></span></label>
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.4fr)]">
      <section className="overflow-hidden rounded-xl border border-border" aria-label="Integrity review queue">
        <header className="border-b border-border p-5"><h2 className="text-xl font-bold">Review queue</h2><p className="mt-1 text-sm text-muted-foreground">{reviews.data?.totalCount ?? 0} attempts</p></header>
        {reviews.isPending ? <p role="status" className="p-6">Loading reviews…</p> : reviews.error ? <div role="alert" className="p-6 text-destructive">Reviews could not be loaded. <Button variant="outline" onClick={() => reviews.refetch()}>Retry</Button></div> : reviews.data?.items.length ? <div className="divide-y divide-border">{reviews.data.items.map((review) => <button type="button" key={review.attemptId} onClick={() => setSelectedAttempt(review.attemptId)} className={`min-h-20 w-full px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring ${selectedAttempt === review.attemptId ? "bg-accent" : "hover:bg-accent"}`}><span className="flex items-start justify-between gap-3"><span><strong className="block">{review.studentName ?? "Unknown student"}</strong><span className="font-mono text-sm text-muted-foreground">{review.userCode ?? review.studentId}</span></span><Badge variant="outline">{review.status ?? "Pending"}</Badge></span><span className="mt-2 block text-sm text-muted-foreground">{review.latestReason ?? "No reason supplied"} · {review.reportCount} reports</span></button>)}</div> : <p className="p-10 text-center text-muted-foreground">No matching integrity reviews.</p>}
      </section>
      <section className="rounded-xl border border-border p-5" aria-label="Integrity review details">
        {!selectedAttempt ? <div className="py-16 text-center"><ShieldCheck className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select an attempt</h2><p className="mt-2 text-muted-foreground">Its evidence and activity timeline will appear here.</p></div> : detail.isPending || activities.isPending ? <p role="status">Loading synchronized evidence…</p> : detail.error ? <p role="alert" className="text-destructive">The attempt review could not be loaded.</p> : detail.data ? <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Attempt evidence</h2><p className="font-mono text-sm text-muted-foreground">{selectedAttempt}</p></div><Badge variant="outline">{detail.data.status ?? "Pending"}</Badge></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-secondary p-4"><span className="text-sm text-muted-foreground">Reports</span><strong className="mt-1 block text-2xl">{detail.data.events.totalCount}</strong></div><div className="rounded-xl bg-secondary p-4"><span className="text-sm text-muted-foreground">Signal incidents</span><strong className="mt-1 block text-2xl">{detail.data.signalIncidents.length}</strong></div><div className="rounded-xl bg-secondary p-4"><span className="text-sm text-muted-foreground">Activities</span><strong className="mt-1 block text-2xl">{activities.data?.events.totalCount ?? 0}</strong></div></div><div><h3 className="font-bold">Evidence timeline</h3><ol className="mt-3 space-y-3">{[...detail.data.events.items.map((event) => ({ id: event.eventId, at: event.createdAt, title: event.eventType ?? event.reportKind ?? "Integrity event", text: event.reason ?? event.reasonCode ?? event.source ?? "No details" })), ...(activities.data?.events.items ?? []).map((event) => ({ id: event.activityId, at: event.occurredAt, title: event.eventType ?? "Activity", text: `Sequence ${event.sequenceNumber}` }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30).map((event) => <li key={event.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{event.title}</strong><time className="text-sm text-muted-foreground">{new Date(event.at).toLocaleString()}</time></div><p className="mt-1 text-sm text-muted-foreground">{event.text}</p></li>)}</ol></div><div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-[200px_minmax(0,1fr)]"><div className="space-y-2 font-semibold"><span>Decision</span><Select value={decision} onValueChange={setDecision}><SelectTrigger aria-label="Integrity decision"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Dismissed">Dismiss flag</SelectItem><SelectItem value="Confirmed">Confirm violation</SelectItem><SelectItem value="Invalidated">Invalidate attempt</SelectItem></SelectContent></Select></div><label htmlFor="integrity-decision-reason" className="space-y-2 font-semibold">Decision reason<Textarea id="integrity-decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the evidence behind this decision" /></label></div><Button disabled={!reason.trim() || resolve.isPending} onClick={() => resolve.mutate()}>{resolve.isPending ? "Saving…" : "Save decision"}</Button></div> : null}
      </section>
    </div>
  </main>;
}

export function IntegrityReviewRoute() { return <IntegrityWorkspace />; }
export function FlaggedSessionsRoute() { return <IntegrityWorkspace incidentsOnly />; }

export function ExamReportsRoute() {
  const [examSubjectId, setExamSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const subjects = useQuery({ queryKey: ["examiner", "report-subjects"], queryFn: () => getExamSubjects({ pageSize: 100 }) });
  const overview = useQuery({ queryKey: ["examiner", "report", examSubjectId], queryFn: () => getExamReportOverview(examSubjectId), enabled: Boolean(examSubjectId) });
  const students = useQuery({ queryKey: ["examiner", "report-students", examSubjectId, search], queryFn: () => getExamReportStudents(examSubjectId, { StudentKeyword: search || undefined, Page: 1, PageSize: 100 }), enabled: Boolean(examSubjectId) });
  const incidents = useQuery({ queryKey: ["examiner", "report-incidents", examSubjectId, search], queryFn: () => getExamReportIncidents(examSubjectId, { StudentKeyword: search || undefined, Page: 1, PageSize: 100 }), enabled: Boolean(examSubjectId) });
  const exportReport = async () => { const result = await downloadExamReport(examSubjectId); const url = URL.createObjectURL(result.blob); const link = document.createElement("a"); link.href = url; link.download = result.fileName ?? "exam-report.xlsx"; link.click(); URL.revokeObjectURL(url); };
  const summary = overview.data?.summary;
  return <main className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight">Exam reports</h1><p className="mt-2 text-muted-foreground">Review participation, marking outcomes and integrity status, then export the Backend report.</p></header><section className="grid gap-4 rounded-xl border border-border p-5 lg:grid-cols-[minmax(280px,1fr)_minmax(220px,1fr)_auto] lg:items-end"><div className="space-y-2 font-semibold"><span>Exam</span><Select value={examSubjectId} onValueChange={setExamSubjectId}><SelectTrigger aria-label="Exam report"><SelectValue placeholder="Select an exam" /></SelectTrigger><SelectContent>{subjects.data?.items.map((item) => <SelectItem key={item.examSubjectId} value={item.examSubjectId}>{item.name ?? item.examSubjectId}</SelectItem>)}</SelectContent></Select></div><label htmlFor="report-student-search" className="space-y-2 font-semibold">Find a student<Input id="report-student-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or student code" /></label><Button disabled={!examSubjectId} onClick={() => void exportReport()}><Download aria-hidden />Export XLSX</Button></section>{!examSubjectId ? <Card className="shadow-none"><CardContent><div className="py-16 text-center"><Flag className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select an exam</h2></div></CardContent></Card> : overview.isPending || students.isPending || incidents.isPending ? <p role="status" className="rounded-xl border border-border p-6">Generating report…</p> : overview.error || students.error || incidents.error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">The report could not be generated.</div> : <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Registered", summary?.registered], ["Present", summary?.present], ["Submitted", summary?.submitted], ["Pass rate", summary?.passRate == null ? "—" : `${summary.passRate.toFixed(1)}%`], ["Flagged", summary?.flaggedAttempts]].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent><span className="text-sm text-muted-foreground">{label}</span><strong className="mt-2 block text-3xl">{value ?? 0}</strong></CardContent></Card>)}</section><section className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[760px] text-left"><thead className="bg-secondary"><tr><th className="p-4">Student</th><th className="p-4">Room / seat</th><th className="p-4">Attendance</th><th className="p-4">Score</th><th className="p-4">Integrity</th></tr></thead><tbody>{students.data?.students.items.map((student) => <tr key={student.enrollmentId} className="border-t border-border"><td className="p-4"><strong className="block">{student.studentName ?? "Unknown"}</strong><span className="font-mono text-sm text-muted-foreground">{student.studentCode ?? student.studentId}</span></td><td className="p-4">{student.roomName ?? "—"} · {student.seatCode ?? "—"}</td><td className="p-4">{student.attendanceStatus ?? "Unknown"}</td><td className="p-4">{student.totalScore == null ? "Not graded" : `${student.totalScore}/${student.maxScore ?? "—"}`}</td><td className="p-4"><Badge variant="outline">{student.integrityStatus ?? "Clear"}</Badge></td></tr>)}</tbody></table></section><section className="rounded-xl border border-border"><header className="border-b border-border p-5"><h2 className="text-xl font-bold">Integrity incidents</h2><p className="mt-1 text-sm text-muted-foreground">{incidents.data?.incidents.totalCount ?? 0} recorded events</p></header><div className="divide-y divide-border">{incidents.data?.incidents.items.map((incident) => <article className="grid gap-2 p-4 md:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)_auto]" key={incident.eventId}><div><strong>{incident.studentName ?? "Unknown student"}</strong><p className="font-mono text-sm text-muted-foreground">{incident.studentCode ?? incident.attemptId}</p></div><div><p>{incident.reason ?? incident.reasonCode ?? incident.reportKind ?? "No description"}</p><p className="text-sm text-muted-foreground">{incident.source ?? "Unknown source"} · {incident.roomName ?? "Unknown room"}</p></div><time className="text-sm text-muted-foreground">{new Date(incident.createdAt).toLocaleString()}</time></article>)}</div></section></>}</main>;
}

type Enrollment = Awaited<ReturnType<typeof getExamEnrollments>>[number];

function AccommodationRow({ scheduleId, enrollment }: { scheduleId: string; enrollment: Enrollment }) {
  const client = useQueryClient();
  const [minutes, setMinutes] = useState(String(enrollment.extraTimeMinutes));
  const [notes, setNotes] = useState(enrollment.accommodationNotes ?? "");
  useEffect(() => { setMinutes(String(enrollment.extraTimeMinutes)); setNotes(enrollment.accommodationNotes ?? ""); }, [enrollment.extraTimeMinutes, enrollment.accommodationNotes]);
  const save = useMutation({
    mutationFn: () => updateExamEnrollment(scheduleId, enrollment.enrollmentId, { extraTimeMinutes: Number(minutes), accommodationNotes: notes.trim() || null }),
    onSuccess: async () => { toast({ title: "Extra time updated", description: `${enrollment.studentName ?? "The candidate"} now has ${minutes} additional minutes.` }); await client.invalidateQueries({ queryKey: ["examiner", "accommodations", scheduleId] }); },
    onError: () => toast({ title: "Update unsuccessful", description: "Check the candidate’s enrollment status and try again." }),
  });
  const changed = Number(minutes) !== enrollment.extraTimeMinutes || notes !== (enrollment.accommodationNotes ?? "");
  const validMinutes = minutes.trim() !== "" && Number.isInteger(Number(minutes)) && Number(minutes) >= 0 && Number(minutes) <= 1440;
  return (
    <article className="grid gap-4 border-b border-border px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(180px,1fr)_160px_minmax(220px,1.5fr)_auto] lg:items-end">
      <div><p className="font-bold">{enrollment.studentName ?? "Candidate"}</p><p className="mt-1 font-mono text-sm text-muted-foreground">{enrollment.studentId}</p><Badge className="mt-2" variant="outline">{enrollment.status}</Badge></div>
      <label htmlFor={`extra-minutes-${enrollment.enrollmentId}`} className="space-y-2 text-sm font-semibold">Extra minutes<Input id={`extra-minutes-${enrollment.enrollmentId}`} min={0} max={1440} step={1} type="number" value={minutes} onChange={(event) => setMinutes(event.target.value)} />{!validMinutes ? <span className="block text-xs text-destructive">Enter a whole number from 0 to 1440.</span> : null}</label>
      <label htmlFor={`accommodation-notes-${enrollment.enrollmentId}`} className="space-y-2 text-sm font-semibold">Accommodation notes<Textarea id={`accommodation-notes-${enrollment.enrollmentId}`} className="min-h-11 resize-y" rows={1} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason or approved accommodation" /></label>
      <Button disabled={!changed || !validMinutes || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
    </article>
  );
}

export function AccommodationsRoute() {
  const [scheduleId, setScheduleId] = useState("");
  const [query, setQuery] = useState("");
  const schedules = useQuery({ queryKey: ["examiner", "accommodation-schedules"], queryFn: () => getExamSchedules({ pageSize: 100 }) });
  const enrollments = useQuery({ queryKey: ["examiner", "accommodations", scheduleId], queryFn: () => getExamEnrollments(scheduleId), enabled: Boolean(scheduleId) });
  const rows = (enrollments.data ?? []).filter((item) => `${item.studentName ?? ""} ${item.studentId}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight">Extra time assignments</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Set approved additional time for candidates already enrolled in an exam schedule.</p></header>
      <section className="grid gap-4 rounded-xl border border-border p-5 lg:grid-cols-[minmax(260px,420px)_minmax(240px,1fr)]">
        <div className="space-y-2 text-sm font-semibold"><span>Exam schedule</span><Select value={scheduleId} onValueChange={setScheduleId}><SelectTrigger aria-label="Exam schedule"><SelectValue placeholder="Select an exam schedule" /></SelectTrigger><SelectContent>{schedules.data?.items.map((schedule) => <SelectItem key={schedule.examScheduleId} value={schedule.examScheduleId}>{schedule.examName ?? "Unnamed exam"} · {new Date(schedule.startsAt).toLocaleDateString()}</SelectItem>)}</SelectContent></Select></div>
        <label htmlFor="accommodation-search" className="space-y-2 text-sm font-semibold">Search candidates<span className="relative block"><Search className="absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden /><Input id="accommodation-search" className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or student ID" /></span></label>
      </section>
      {!scheduleId ? <Card className="shadow-none"><CardContent className="py-14 text-center"><UsersRound className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select an exam schedule</h2><p className="mt-2 text-muted-foreground">Candidate accommodations are managed within each schedule.</p></CardContent></Card> : enrollments.isPending ? <p role="status" className="rounded-xl border border-border p-6">Loading candidates…</p> : enrollments.error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">We couldn’t load the enrolled candidates.</p><Button className="mt-4" variant="outline" onClick={() => enrollments.refetch()}>Try again</Button></div> : <section className="overflow-hidden rounded-xl border border-border"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="text-xl font-bold">Candidate accommodations</h2><p className="mt-1 text-sm text-muted-foreground">{rows.length} candidates shown</p></div><span className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-5 text-success-foreground" aria-hidden />Changes are saved per candidate</span></header>{rows.map((enrollment) => <AccommodationRow key={enrollment.enrollmentId} scheduleId={scheduleId} enrollment={enrollment} />)}{rows.length === 0 ? <p className="p-12 text-center text-muted-foreground">No candidates match this search.</p> : null}</section>}
    </main>
  );
}

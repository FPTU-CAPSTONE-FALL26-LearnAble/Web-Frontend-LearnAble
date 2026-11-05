import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Search, UsersRound } from "lucide-react";
import { getExamEnrollments, getExamSchedules, updateExamEnrollment } from "@/api/exams";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
export { GradeReleaseRoute } from "./GradeReleaseRoute";

function ComingSoon({ title, capability, nextStep }: { title: string; capability: string; nextStep: string }) {
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{capability}</p>
      </header>
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Clock3 className="size-6" aria-hidden /></span>
          <div><h2 className="text-xl font-bold">Workspace coming soon</h2><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{nextStep}</p></div>
        </CardContent>
      </Card>
    </main>
  );
}

export function IntegrityReviewRoute() { return <ComingSoon title="Synchronized integrity review" capability="Review exam recordings alongside candidate activity and integrity events." nextStep="Use Live Exam Monitoring for current schedules. Recorded review will appear here when exam telemetry is available." />; }
export function FlaggedSessionsRoute() { return <ComingSoon title="Flagged sessions" capability="Review integrity flags, supporting evidence, and examiner decisions." nextStep="No flagged-session records are available yet. Active exam rooms remain accessible from Live Exam Monitoring." />; }
export function ExamReportsRoute() { return <ComingSoon title="Exam reports" capability="Review completion, grade distribution, and integrity outcomes across exam schedules." nextStep="Reports and file export will appear here when result aggregation is available." />; }

type Enrollment = Awaited<ReturnType<typeof getExamEnrollments>>[number];

function AccommodationRow({ scheduleId, enrollment }: { scheduleId: string; enrollment: Enrollment }) {
  const client = useQueryClient();
  const [minutes, setMinutes] = useState(String(enrollment.extraTimeMinutes));
  const [notes, setNotes] = useState(enrollment.accommodationNotes ?? "");
  useEffect(() => { setMinutes(String(enrollment.extraTimeMinutes)); setNotes(enrollment.accommodationNotes ?? ""); }, [enrollment.extraTimeMinutes, enrollment.accommodationNotes]);
  const save = useMutation({
    mutationFn: () => updateExamEnrollment(scheduleId, enrollment.enrollmentId, { extraTimeMinutes: Math.max(0, Number(minutes) || 0), accommodationNotes: notes.trim() || null }),
    onSuccess: async () => { toast({ title: "Extra time updated", description: `${enrollment.studentName ?? "The candidate"} now has ${Math.max(0, Number(minutes) || 0)} additional minutes.` }); await client.invalidateQueries({ queryKey: ["examiner", "accommodations", scheduleId] }); },
    onError: () => toast({ title: "Update unsuccessful", description: "Check the candidate’s enrollment status and try again." }),
  });
  const changed = Number(minutes) !== enrollment.extraTimeMinutes || notes !== (enrollment.accommodationNotes ?? "");
  return (
    <article className="grid gap-4 border-b border-border px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(180px,1fr)_160px_minmax(220px,1.5fr)_auto] lg:items-end">
      <div><p className="font-bold">{enrollment.studentName ?? "Candidate"}</p><p className="mt-1 font-mono text-sm text-muted-foreground">{enrollment.studentId}</p><Badge className="mt-2" variant="outline">{enrollment.status}</Badge></div>
      <label className="space-y-2 text-sm font-semibold">Extra minutes<Input min={0} max={240} type="number" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
      <label className="space-y-2 text-sm font-semibold">Accommodation notes<Textarea className="min-h-11 resize-y" rows={1} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason or approved accommodation" /></label>
      <Button disabled={!changed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
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
        <label className="space-y-2 text-sm font-semibold">Exam schedule<Select value={scheduleId} onValueChange={setScheduleId}><SelectTrigger><SelectValue placeholder="Select an exam schedule" /></SelectTrigger><SelectContent>{schedules.data?.items.map((schedule) => <SelectItem key={schedule.examScheduleId} value={schedule.examScheduleId}>{schedule.examName ?? "Unnamed exam"} · {new Date(schedule.startsAt).toLocaleDateString()}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-2 text-sm font-semibold">Search candidates<span className="relative block"><Search className="absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or student ID" /></span></label>
      </section>
      {!scheduleId ? <Card className="shadow-none"><CardContent className="py-14 text-center"><UsersRound className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select an exam schedule</h2><p className="mt-2 text-muted-foreground">Candidate accommodations are managed within each schedule.</p></CardContent></Card> : enrollments.isPending ? <p role="status" className="rounded-xl border border-border p-6">Loading candidates…</p> : enrollments.error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">We couldn’t load the enrolled candidates.</p><Button className="mt-4" variant="outline" onClick={() => enrollments.refetch()}>Try again</Button></div> : <section className="overflow-hidden rounded-xl border border-border"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="text-xl font-bold">Candidate accommodations</h2><p className="mt-1 text-sm text-muted-foreground">{rows.length} candidates shown</p></div><span className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-5 text-success-foreground" aria-hidden />Changes are saved per candidate</span></header>{rows.map((enrollment) => <AccommodationRow key={enrollment.enrollmentId} scheduleId={scheduleId} enrollment={enrollment} />)}{rows.length === 0 ? <p className="p-12 text-center text-muted-foreground">No candidates match this search.</p> : null}</section>}
    </main>
  );
}

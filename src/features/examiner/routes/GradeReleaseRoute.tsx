import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CheckCircle2, Send, UserRoundCheck } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { getExamSchedules } from "@/api/exams";
import { GraderAssignmentPanel } from "@/features/examiner/components/GraderAssignmentPanel";
import { assignScheduleGrader, autoGradeExamSchedule, getAttemptGrading, getExamGradebook, getGraderCandidates, releaseExamResults, reviewAttemptResult } from "@/api/grading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

function message(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server") return [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ") || fallback;
  return fallback;
}

function ResultReview({ attemptId, onClose }: { attemptId: string; onClose: () => void }) {
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["examiner", "grading-detail", attemptId], queryFn: () => getAttemptGrading(attemptId) });
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => { if (detail.data) { setReviewed(Boolean(detail.data.reviewedAt)); setNote(detail.data.reviewNote ?? ""); } }, [detail.data]);
  const save = useMutation({ mutationFn: () => reviewAttemptResult(attemptId, detail.data!.revision, { reviewed, note: note.trim() || null }), onSuccess: async () => { toast({ title: "Review saved", description: "The attempt review status has been updated." }); await Promise.all([client.invalidateQueries({ queryKey: ["examiner", "grading-detail", attemptId] }), client.invalidateQueries({ queryKey: ["examiner", "gradebook"] })]); }, onError: (error) => toast({ title: "Review could not be saved", description: message(error, "Refresh the result and try again.") }) });
  if (detail.isPending) return <p role="status" className="rounded-xl border border-border p-5">Loading result detail…</p>;
  if (detail.error || !detail.data) return <div role="alert" className="rounded-xl border border-destructive p-5 text-destructive">{message(detail.error, "The result detail could not be loaded.")}</div>;
  return <section className="space-y-5 rounded-xl border border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Review · {detail.data.studentName}</h2><p className="mt-1 text-sm text-muted-foreground">{detail.data.totalScore ?? "—"} / {detail.data.maxScore} points · {detail.data.gradingStatus}</p></div><Button variant="outline" onClick={onClose}>Close review</Button></div><div className="space-y-3">{detail.data.questions.map((question) => <article key={question.attemptQuestionId} className="rounded-lg bg-muted p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{question.position}. {question.content}</p><span className="shrink-0 font-bold">{question.score ?? "—"} / {question.maxScore}</span></div>{question.answerText ? <p className="mt-2 text-sm">Answer: {question.answerText}</p> : null}{question.feedback ? <p className="mt-1 text-sm text-muted-foreground">Feedback: {question.feedback}</p> : null}</article>)}</div><div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start"><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><Checkbox checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} />Mark reviewed</label><label className="space-y-2 text-sm font-semibold">Review note<Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional examiner review note" /></label></div><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save review"}</Button></section>;
}

export function GradeReleaseRoute() {
  const [scheduleId, setScheduleId] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [reviewAttemptId, setReviewAttemptId] = useState("");
  const client = useQueryClient();
  const schedules = useQuery({ queryKey: ["examiner", "grading-schedules"], queryFn: () => getExamSchedules({ pageSize: 100 }) });
  const gradebook = useQuery({ queryKey: ["examiner", "gradebook", scheduleId], queryFn: () => getExamGradebook(scheduleId), enabled: Boolean(scheduleId) });
  const candidates = useQuery({ queryKey: ["examiner", "grader-candidates", scheduleId], queryFn: () => getGraderCandidates(scheduleId), enabled: Boolean(scheduleId) });
  const refresh = () => client.invalidateQueries({ queryKey: ["examiner", "gradebook", scheduleId] });
  const autoGrade = useMutation({ mutationFn: () => autoGradeExamSchedule(scheduleId, gradebook.data!.revision), onSuccess: async (result) => { toast({ title: "Automatic grading complete", description: `${result.graded} attempts graded; ${result.unchanged} unchanged.` }); await refresh(); }, onError: (error) => toast({ title: "Automatic grading could not finish", description: message(error, "Refresh the gradebook and try again.") }) });
  const assign = useMutation({ mutationFn: () => assignScheduleGrader(scheduleId, gradebook.data!.revision, { lecturerId, overwriteExisting }), onSuccess: async (result) => { toast({ title: "Essay grader assigned", description: `${result.assignedCount} attempts assigned and ${result.reassignedCount} reassigned.` }); await refresh(); }, onError: (error) => toast({ title: "Assignment could not be saved", description: message(error, "Refresh the gradebook and try again.") }) });
  const release = useMutation({ mutationFn: () => releaseExamResults(scheduleId, gradebook.data!.revision), onSuccess: async (result) => { toast({ title: "Results released", description: `${result.submittedResults} submitted results are now released.` }); await refresh(); }, onError: (error) => toast({ title: "Results could not be released", description: message(error, "Resolve the remaining blockers and try again.") }) });
  const data = gradebook.data;
  const metrics = data ? [["Registered", data.registered], ["Submitted", data.submitted], ["Need manual grading", data.needsManual], ["Unreviewed", data.unreviewed]] as const : [];
  return <main className="space-y-6">
    <header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-primary">Grade review & release</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Run automatic grading, assign Essay marking, review readiness, and release results for an exam schedule.</p></header>
    <label className="block max-w-xl space-y-2 text-sm font-semibold">Exam schedule<Select value={scheduleId} onValueChange={(value) => { setScheduleId(value); setLecturerId(""); }}><SelectTrigger><SelectValue placeholder="Select an exam schedule" /></SelectTrigger><SelectContent>{schedules.data?.items.map((schedule) => <SelectItem key={schedule.examScheduleId} value={schedule.examScheduleId}>{schedule.examName ?? "Unnamed exam"} · {new Date(schedule.startsAt).toLocaleDateString()}</SelectItem>)}</SelectContent></Select></label>
    {!scheduleId ? <Card className="shadow-none"><CardContent className="py-14 text-center text-muted-foreground">Select a schedule to open its gradebook.</CardContent></Card> : gradebook.isPending ? <p role="status" className="rounded-xl border border-border p-6">Loading gradebook…</p> : gradebook.error || !data ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">{message(gradebook.error, "The gradebook could not be loaded.")}</p><Button className="mt-4" variant="outline" onClick={() => gradebook.refetch()}>Try again</Button></div> : <>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-border p-4"><dt className="text-sm font-semibold text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-extrabold">{value}</dd></div>)}</dl>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-5 text-primary" aria-hidden />Calculate results</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Scores objective questions and initializes result records. Essay answers remain pending until a Lecturer grades them.</p><Button className="mt-4" disabled={autoGrade.isPending} onClick={() => autoGrade.mutate()}>{autoGrade.isPending ? "Grading…" : "Run automatic grading"}</Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCheck className="size-5 text-primary" aria-hidden />Assign Essay grader</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={lecturerId} onValueChange={setLecturerId}><SelectTrigger><SelectValue placeholder="Select a suitable Lecturer" /></SelectTrigger><SelectContent>{candidates.data?.items.map((candidate) => <SelectItem key={candidate.lecturerId} value={candidate.lecturerId}>{candidate.fullName} · {candidate.userCode}</SelectItem>)}</SelectContent></Select><label className="flex items-center gap-3 text-sm"><Checkbox checked={overwriteExisting} onCheckedChange={(value) => setOverwriteExisting(value === true)} />Replace existing assignments</label><Button variant="outline" disabled={!lecturerId || assign.isPending} onClick={() => assign.mutate()}>{assign.isPending ? "Assigning…" : "Assign eligible Essay attempts"}</Button></CardContent></Card>
      </div>
      <GraderAssignmentPanel scheduleId={scheduleId} rows={data.results.items} candidates={candidates.data?.items ?? []} onChanged={refresh} />
      {data.blockingReasons.length ? <section className="rounded-xl border border-warning-border p-5"><h2 className="font-bold">Release requirements</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{data.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : <p className="flex items-center gap-2 rounded-xl border border-success-border p-4 font-semibold"><CheckCircle2 className="size-5 text-success-foreground" aria-hidden />All submitted results are ready to release.</p>}
      <section className="overflow-hidden rounded-xl border border-border"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Student</th><th className="p-3">Attempt</th><th className="p-3">Automatic</th><th className="p-3">Manual</th><th className="p-3">Total</th><th className="p-3">Grading</th><th className="p-3">Action</th></tr></thead><tbody>{data.results.items.map((row) => <tr key={row.enrollmentId} className="border-t border-border"><td className="p-3"><p className="font-bold">{row.fullName}</p><p className="text-muted-foreground">{row.userCode}</p></td><td className="p-3">{row.attemptStatus ?? "Not started"}</td><td className="p-3">{row.autoScore ?? "—"}</td><td className="p-3">{row.manualScore ?? "—"}</td><td className="p-3 font-bold">{row.totalScore ?? "—"}{row.maxScore != null ? ` / ${row.maxScore}` : ""}</td><td className="p-3"><Badge variant="outline">{row.gradingStatus ?? "Pending"}</Badge></td><td className="p-3"><Button size="sm" variant="outline" disabled={!row.attemptId} onClick={() => setReviewAttemptId(row.attemptId ?? "")}>Review</Button></td></tr>)}</tbody></table></div>{data.results.items.length === 0 ? <p className="p-10 text-center text-muted-foreground">No enrolled attempts are available for grading.</p> : null}</section>
      {reviewAttemptId ? <ResultReview attemptId={reviewAttemptId} onClose={() => setReviewAttemptId("")} /> : null}
      <div className="flex justify-end"><Button disabled={!data.canRelease || release.isPending || Boolean(data.releasedAt)} onClick={() => release.mutate()}><Send aria-hidden />{data.releasedAt ? "Results released" : release.isPending ? "Releasing…" : "Release results"}</Button></div>
    </>}
  </main>;
}

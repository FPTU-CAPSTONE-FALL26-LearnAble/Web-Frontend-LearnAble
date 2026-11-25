import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Download, FlaskConical, LoaderCircle, Play, Search, Users } from "lucide-react";
import { describeError } from "@/app/providers";
import { getExamPaperBank } from "@/api/exams";
import { createPracticeSession, exportPracticeResults, getPracticeSession, getPracticeSessions, releasePracticeResults, setPracticeStudents, transitionPracticeSession } from "@/api/practiceSessions";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
import { PracticeGradingDialog } from "@/features/lecturer/practice/components/PracticeGradingDialog";

const localValue = (hours: number) => { const d = new Date(Date.now() + hours * 3600000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function PracticeSessionsRoute() {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [paperId, setPaperId] = useState("");
  const [name, setName] = useState("");
  const [opensAt, setOpensAt] = useState(() => localValue(1));
  const [closesAt, setClosesAt] = useState(() => localValue(25));
  const [duration, setDuration] = useState("60");
  const [studentIds, setStudentIds] = useState("");
  const [showAnswers, setShowAnswers] = useState(true);
  const [gradingAttempt, setGradingAttempt] = useState<{ attemptId: string; studentName: string } | null>(null);
  const sessions = useQuery({ queryKey: ["lecturer", "practice-sessions"], queryFn: getPracticeSessions });
  const papers = useQuery({ queryKey: ["exam-paper-bank", "practice-sessions"], queryFn: getExamPaperBank });
  const detail = useQuery({ queryKey: ["lecturer", "practice-session", selectedId], queryFn: () => getPracticeSession(selectedId), enabled: Boolean(selectedId) });
  const practicePapers = useMemo(() => (papers.data ?? []).filter((paper) => paper.status === "Published" && paper.examSubject.purpose === "Practice"), [papers.data]);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["lecturer", "practice-sessions"] }), client.invalidateQueries({ queryKey: ["lecturer", "practice-session", selectedId] })]); };
  const create = useMutation({ mutationFn: () => createPracticeSession({ examPaperId: paperId, name: name.trim(), opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString(), durationMinutes: Number(duration) }), onSuccess: async (session) => { setSelectedId(session.sessionId); setName(""); await refresh(); toast({ title: "Practice session created", description: "Add students, then schedule or open the session.", variant: "success" }); }, onError: (error) => toast({ title: "Session could not be created", description: describeError(error), variant: "error" }) });
  const roster = useMutation({ mutationFn: () => setPracticeStudents(selectedId, detail.data!.session.revision, [...new Set(studentIds.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean))]), onSuccess: async () => { await refresh(); toast({ title: "Student roster saved", variant: "success" }); }, onError: (error) => toast({ title: "Roster could not be saved", description: describeError(error), variant: "error" }) });
  const transition = useMutation({ mutationFn: (action: string) => transitionPracticeSession(selectedId, detail.data!.session.revision, action), onSuccess: async () => { await refresh(); toast({ title: "Session status updated", variant: "success" }); }, onError: (error) => toast({ title: "Status could not be updated", description: describeError(error), variant: "error" }) });
  const release = useMutation({ mutationFn: () => releasePracticeResults(selectedId, detail.data!.session.revision, showAnswers), onSuccess: async () => { await refresh(); toast({ title: "Practice results released", variant: "success" }); }, onError: (error) => toast({ title: "Results could not be released", description: describeError(error), variant: "error" }) });
  const exportResults = async () => { try { const result = await exportPracticeResults(selectedId); const url = URL.createObjectURL(result.blob); const link = document.createElement("a"); link.href = url; link.download = result.fileName ?? "practice-results.xlsx"; link.click(); URL.revokeObjectURL(url); } catch (error) { toast({ title: "Results could not be exported", description: describeError(error), variant: "error" }); } };
  const current = detail.data?.session;
  return <div className="space-y-6">
    <header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-primary">Practice sessions</h1><p className="mt-2 text-sm text-muted-foreground">Run a published Practice paper, manage its roster, and review or release student results.</p></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,.8fr)_minmax(0,1.6fr)]">
      <div className="space-y-5">
        <Card><CardHeader><CardTitle>Create session</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label>Published Practice paper</Label><Select value={paperId} onValueChange={setPaperId}><SelectTrigger className="mt-2"><SelectValue placeholder="Select a paper" /></SelectTrigger><SelectContent>{practicePapers.map((paper) => <SelectItem key={paper.examPaperId} value={paper.examPaperId}>{paper.name ?? paper.paperCode}</SelectItem>)}</SelectContent></Select>{papers.isSuccess && !practicePapers.length ? <p className="mt-2 text-xs text-muted-foreground">Publish a paper whose exam purpose is Practice first.</p> : null}</div>
          <div><Label htmlFor="practice-name">Session name</Label><Input id="practice-name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="practice-open">Opens</Label><Input id="practice-open" className="mt-2" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></div><div><Label htmlFor="practice-close">Closes</Label><Input id="practice-close" className="mt-2" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div></div>
          <div><Label htmlFor="practice-duration">Duration (minutes)</Label><Input id="practice-duration" className="mt-2" type="number" min={1} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <Button className="w-full" disabled={!paperId || !name.trim() || !opensAt || !closesAt || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <FlaskConical aria-hidden />}Create practice session</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Sessions</CardTitle></CardHeader><CardContent><div className="space-y-2">{sessions.isPending ? <p role="status">Loading sessions…</p> : sessions.error ? <p role="alert" className="text-destructive">Sessions could not be loaded.</p> : sessions.data?.map((session) => <button type="button" key={session.sessionId} onClick={() => setSelectedId(session.sessionId)} className={`w-full rounded-xl border p-3 text-left ${selectedId === session.sessionId ? "border-primary bg-accent" : "border-border"}`}><span className="flex justify-between gap-3"><strong>{session.name ?? "Practice session"}</strong><Badge variant="outline">{session.status ?? "Draft"}</Badge></span><span className="mt-1 block text-xs text-muted-foreground">{session.registered} students · {new Date(session.opensAt).toLocaleString()}</span></button>)}</div></CardContent></Card>
      </div>
      {!selectedId ? <Card><CardContent><div className="py-16 text-center"><CalendarClock className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Select a session</h2><p className="mt-2 text-muted-foreground">Roster, lifecycle and results will appear here.</p></div></CardContent></Card> : detail.isPending ? <p role="status">Loading practice session…</p> : detail.error || !current ? <p role="alert" className="rounded-xl border border-destructive p-5 text-destructive">The session could not be loaded.</p> : <div className="space-y-5">
        <Card><CardContent><div className="flex flex-wrap items-center gap-4"><div className="mr-auto"><h2 className="text-xl font-bold">{current.name}</h2><p className="mt-1 text-sm text-muted-foreground">{current.durationMinutes} minutes · {current.registered} registered</p></div><Badge variant="outline">{current.status}</Badge>{current.status === "Draft" ? <Button variant="outline" onClick={() => transition.mutate("schedule")}>Schedule</Button> : null}{["Draft", "Scheduled"].includes(current.status ?? "") ? <Button onClick={() => transition.mutate("open")}><Play aria-hidden />Open now</Button> : null}{current.status === "Open" ? <Button variant="destructive" onClick={() => transition.mutate("close")}>Close session</Button> : null}</div></CardContent></Card>
        {(["Draft", "Scheduled", "Open"].includes(current.status ?? "")) ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users aria-hidden />Student roster</CardTitle></CardHeader><CardContent><div className="space-y-3"><Label htmlFor="practice-students">Student profile IDs</Label><Textarea id="practice-students" value={studentIds} onChange={(e) => setStudentIds(e.target.value)} placeholder="Paste UUIDs separated by commas, spaces or new lines" className="min-h-28" /><p className="text-xs text-muted-foreground">The current BE contract accepts StudentProfile UUIDs. Saving replaces the complete roster.</p><Button variant="outline" disabled={!studentIds.trim() || roster.isPending} onClick={() => roster.mutate()}>Save roster</Button></div></CardContent></Card> : null}
        <Card><CardHeader><CardTitle>Results</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex flex-wrap items-center gap-3"><Checkbox id="show-practice-answers" checked={showAnswers} onCheckedChange={(v) => setShowAnswers(v === true)} /><Label htmlFor="show-practice-answers">Show correct answers after release</Label><Button variant="outline" className="ml-auto" disabled={!detail.data.students.length} onClick={() => void exportResults()}><Download aria-hidden />Export XLSX</Button><Button disabled={Boolean(current.releasedAt) || !["Closed", "Completed"].includes(current.status ?? "") || release.isPending} onClick={() => release.mutate()}>{current.releasedAt ? "Results released" : "Release results"}</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b"><th className="p-3">Student</th><th className="p-3">Participation</th><th className="p-3">Grading</th><th className="p-3">Score</th><th className="p-3">Action</th></tr></thead><tbody>{detail.data.students.map((row) => <tr key={row.studentId} className="border-b"><td className="p-3"><strong>{row.studentName ?? "Student"}</strong><span className="block font-mono text-xs text-muted-foreground">{row.studentCode ?? row.studentId}</span></td><td className="p-3">{row.participation ?? "Registered"}</td><td className="p-3">{row.gradingStatus ?? "Not started"}</td><td className="p-3">{row.totalScore == null ? "—" : `${row.totalScore}/${row.maxScore}`}</td><td className="p-3">{row.attemptId && row.submittedAt ? <Button type="button" variant="outline" onClick={() => setGradingAttempt({ attemptId: row.attemptId!, studentName: row.studentName ?? row.studentCode ?? "Student" })}>Grade answers</Button> : "—"}</td></tr>)}</tbody></table>{!detail.data.students.length ? <div className="py-10 text-center text-muted-foreground"><Search className="mx-auto size-8" aria-hidden /><p className="mt-2">No students are registered yet.</p></div> : null}</div></div></CardContent></Card>
      </div>}
    </div>
    <PracticeGradingDialog sessionId={selectedId} attemptId={gradingAttempt?.attemptId ?? null} studentName={gradingAttempt?.studentName ?? "Student"} onClose={() => setGradingAttempt(null)} />
  </div>;
}


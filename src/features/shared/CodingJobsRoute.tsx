import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, RotateCcw, Search } from "lucide-react";
import { describeError } from "@/app/providers";
import { getCodingJobs, retryCodingJob } from "@/api/coding";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { toast } from "@/shared/ui/primitives/toast";

export function CodingJobsRoute() {
  const client = useQueryClient(); const [draft, setDraft] = useState(""); const [attemptId, setAttemptId] = useState(""); const [practice, setPractice] = useState(false);
  const jobs = useQuery({ queryKey: ["coding-jobs", attemptId, practice], queryFn: () => getCodingJobs(attemptId, practice), enabled: Boolean(attemptId) });
  const retry = useMutation({ mutationFn: retryCodingJob, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["coding-jobs", attemptId, practice] }); toast({ title: "Coding job queued again", variant: "success" }); }, onError: (error) => toast({ title: "Job could not be retried", description: describeError(error), variant: "error" }) });
  return <div className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-primary">Coding jobs</h1><p className="mt-2 text-sm text-muted-foreground">Inspect Judge0 execution jobs for an official or Practice attempt and retry failed infrastructure jobs.</p></header><section className="flex flex-wrap items-end gap-4 rounded-xl border p-5"><div className="min-w-64 flex-1"><Label htmlFor="coding-attempt-id">Attempt ID</Label><Input id="coding-attempt-id" className="mt-2" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Attempt UUID" /></div><Checkbox id="practice-coding-attempt" checked={practice} onCheckedChange={(v) => setPractice(v === true)} /><Label htmlFor="practice-coding-attempt">Practice attempt</Label><Button disabled={!draft.trim()} onClick={() => setAttemptId(draft.trim())}><Search aria-hidden />Load jobs</Button></section>{!attemptId ? <Card><CardContent><div className="py-16 text-center"><Code2 className="mx-auto size-10 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-bold">Enter an attempt ID</h2></div></CardContent></Card> : jobs.isPending ? <p role="status">Loading coding jobs…</p> : jobs.error ? <div role="alert" className="rounded-xl border border-destructive p-5 text-destructive">{describeError(jobs.error)}</div> : <section className="overflow-hidden rounded-xl border"><div className="divide-y">{jobs.data?.map((job) => { const id = job.jobId ?? job.id ?? ""; return <article key={id} className="flex flex-wrap items-center gap-4 p-5"><div className="mr-auto"><strong className="font-mono">{id}</strong><p className="mt-1 text-sm text-muted-foreground">{job.languageCode ?? "Runtime not reported"}{job.errorCode ? ` · ${job.errorCode}` : ""}</p></div><Badge variant="outline">{job.status ?? "Unknown"}</Badge><Button variant="outline" disabled={!id || retry.isPending || !["Failed", "Error"].includes(job.status ?? "")} onClick={() => retry.mutate(id)}><RotateCcw aria-hidden />Retry</Button></article>; })}</div>{!jobs.data?.length ? <p className="p-12 text-center text-muted-foreground">No coding jobs were found for this attempt.</p> : null}</section>}</div>;
}

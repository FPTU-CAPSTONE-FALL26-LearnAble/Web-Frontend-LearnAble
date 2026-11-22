import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, UserRoundCheck } from "lucide-react";
import { assignAttemptGrader, getScheduleGradingAssignments, type gradebookItemSchema, type graderCandidateSchema } from "@/api/grading";
import { describeError } from "@/app/providers";
import type { z } from "zod";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";

type Row = z.infer<typeof gradebookItemSchema>;
type Candidate = z.infer<typeof graderCandidateSchema>;

/**
 * Who marks which attempt. An attempt has exactly one grader, and a grader is never picked for the
 * examiner: it is chosen from the lecturers of the school, then the attempts are handed to them.
 */
export function GraderAssignmentPanel({ scheduleId, rows, candidates, onChanged }: {
  scheduleId: string;
  rows: Row[];
  candidates: Candidate[];
  onChanged: () => unknown;
}) {
  const queryClient = useQueryClient();
  const [lecturerId, setLecturerId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const key = ["examiner", "grading-assignments", scheduleId];
  const assignments = useQuery({ queryKey: key, queryFn: () => getScheduleGradingAssignments(scheduleId) });
  const items = useMemo(() => assignments.data?.items ?? [], [assignments.data]);
  const byAttempt = useMemo(() => new Map(rows.filter((row) => row.attemptId).map((row) => [row.attemptId as string, row])), [rows]);
  const graderName = (id: string | null) => (id ? candidates.find((candidate) => candidate.lecturerId === id)?.fullName ?? "Another lecturer" : null);
  const unassigned = items.filter((item) => !item.lecturerId);
  const locked = (item: (typeof items)[number]) => Boolean(item.markingCompletedAt);
  const assign = useMutation({
    mutationFn: async () => {
      const failed: string[] = [];
      let done = 0;
      for (const attemptId of selected) {
        const item = items.find((entry) => entry.attemptId === attemptId);
        if (!item) continue;
        try {
          await assignAttemptGrader(attemptId, item.revision, { lecturerId });
          done += 1;
        } catch (error) {
          failed.push(`${byAttempt.get(attemptId)?.fullName ?? "A student"}: ${describeError(error)}`);
        }
      }
      return { done, failed };
    },
    onSuccess: async ({ done, failed }) => {
      setSelected([]);
      toast({
        title: failed.length ? `${done} assigned, ${failed.length} not` : `${done} attempt${done === 1 ? "" : "s"} assigned`,
        description: failed.length ? failed.slice(0, 2).join(" ") : `${graderName(lecturerId) ?? "The lecturer"} will see them in the grading list.`,
        variant: failed.length ? "error" : undefined,
      });
      await Promise.all([queryClient.invalidateQueries({ queryKey: key }), onChanged()]);
    },
  });
  if (assignments.isPending) return <div role="status" aria-label="Loading grading assignments" className="h-24 animate-pulse rounded-xl bg-muted" />;
  if (assignments.isError) {
    return <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">The grading assignments could not be loaded. {describeError(assignments.error)}</p>;
  }
  if (!items.length) return null;
  const toggle = (attemptId: string, on: boolean) => setSelected((current) => (on ? [...new Set([...current, attemptId])] : current.filter((id) => id !== attemptId)));
  const selectable = items.filter((item) => !locked(item));
  return (
    <section aria-label="Grader assignment" className="space-y-4 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><UserRoundCheck className="size-5 text-primary" aria-hidden />Assign attempts to a grader</h2>
        <Badge variant="outline">{items.length - unassigned.length} of {items.length} assigned</Badge>
      </div>
      {unassigned.length ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-warning-foreground/30 bg-warning/40 p-3 text-sm font-semibold">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {unassigned.length} attempt{unassigned.length === 1 ? " has" : "s have"} no grader yet. Results cannot be released until every attempt is marked.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-64 flex-1 gap-2 text-sm font-semibold">
          <span id={`grader-label-${scheduleId}`}>Grader</span>
          <Select value={lecturerId} onValueChange={setLecturerId}>
            <SelectTrigger aria-labelledby={`grader-label-${scheduleId}`}><SelectValue placeholder="Choose a lecturer" /></SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => <SelectItem key={candidate.lecturerId} value={candidate.lecturerId}>{candidate.fullName} · {candidate.userCode}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={() => setSelected(unassigned.filter((item) => !locked(item)).map((item) => item.attemptId))} disabled={!unassigned.length}>Select unassigned</Button>
        <Button type="button" disabled={!lecturerId || !selected.length || assign.isPending} onClick={() => assign.mutate()}>
          {assign.isPending ? "Assigning…" : `Assign ${selected.length || ""} selected`.replace("  ", " ")}
        </Button>
      </div>
      <ul aria-label="Attempts to grade" className="max-h-96 divide-y divide-border overflow-auto rounded-lg border border-border">
        {items.map((item) => {
          const row = byAttempt.get(item.attemptId);
          const done = locked(item);
          const owner = graderName(item.lecturerId);
          return (
            <li key={item.attemptId} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Checkbox aria-label={`Select ${row?.fullName ?? item.attemptId}`} checked={selected.includes(item.attemptId)} disabled={done} onCheckedChange={(on) => toggle(item.attemptId, on === true)} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{row?.fullName ?? "Student"}</span>
                <span className="block text-xs text-muted-foreground">{row?.userCode ?? ""}{item.assignedAt ? ` · assigned ${new Date(item.assignedAt).toLocaleString()}` : ""}</span>
              </span>
              <Badge variant={item.lecturerId ? "outline" : "destructive"}>{done ? "Marking confirmed" : owner ?? "Not assigned"}</Badge>
            </li>
          );
        })}
      </ul>
      {selectable.length < items.length ? <p className="text-xs text-muted-foreground">An attempt whose marking is already confirmed keeps its grader and its scores.</p> : null}
    </section>
  );
}

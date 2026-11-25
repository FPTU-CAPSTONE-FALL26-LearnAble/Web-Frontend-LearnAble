import { useQuery } from "@tanstack/react-query";
import { getScheduleGradingAssignments, type graderCandidateSchema } from "@/api/grading";
import type { z } from "zod";
import { Button } from "@/shared/ui/primitives/button";
import { UserRoundCheck } from "lucide-react";

const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function AssignedGraders({ scheduleId, candidates }: { scheduleId: string; candidates: z.infer<typeof graderCandidateSchema>[] }) {
  const query = useQuery({ queryKey: ["examiner", "grading-assignments", scheduleId], queryFn: () => getScheduleGradingAssignments(scheduleId), refetchInterval: 30_000 });
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading assigned lecturers…</p>;
  if (query.isError) return <div role="alert" className="space-y-2 text-sm"><p className="text-destructive">Assigned lecturers could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry assignments</Button></div>;
  const items = query.data.items;
  const ids = [...new Set(items.flatMap((item) => item.lecturerId ? [item.lecturerId] : []))];
  const unassigned = items.filter((item) => !item.lecturerId).length;
  return <section aria-label="Currently assigned lecturers" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Assigned lecturers</h3><span className="text-xs tabular-nums text-muted-foreground">{ids.length} assigned</span></div>
    {ids.length ? <ul className="max-h-96 divide-y divide-border overflow-auto">{ids.map((id) => {
      const lecturer = candidates.find((candidate) => candidate.lecturerId === id);
      const assigned = items.filter((item) => item.lecturerId === id);
      const completed = assigned.filter((item) => item.markingCompletedAt).length;
      const assignedAt = assigned.map((item) => item.assignedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
      return <li key={id} className="space-y-3 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{lecturer?.fullName ?? "Assigned lecturer"}</p><p className="mt-1 text-sm text-muted-foreground">{lecturer?.userCode ?? "Lecturer code unavailable"}</p></div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${completed === assigned.length ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>{completed === assigned.length ? "Marking confirmed" : "Awaiting confirmation"}</span></div><p className="text-sm">{assigned.length} assigned · {completed} confirmed · {assigned.length - completed} awaiting confirmation</p>{assignedAt ? <p className="text-xs text-muted-foreground">Last assigned: {date(assignedAt)}</p> : null}{assigned.flatMap((item) => item.assignmentNote ? [item.assignmentNote] : []).filter((note, index, notes) => notes.indexOf(note) === index).map((note) => <p key={note} className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{note}</p>)}</li>;
    })}</ul> : <div className="flex min-h-40 items-center gap-4 rounded-lg bg-muted/30 p-5"><UserRoundCheck className="size-8 shrink-0 text-muted-foreground" aria-hidden /><div><p className="font-semibold">No assignments yet</p><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Choose a Lecturer to assign eligible Essay attempts.</p></div></div>}
    {unassigned > 0 ? <p className="text-sm text-warning-foreground">{unassigned} attempt(s) still have no assigned Lecturer.</p> : null}
  </section>;
}

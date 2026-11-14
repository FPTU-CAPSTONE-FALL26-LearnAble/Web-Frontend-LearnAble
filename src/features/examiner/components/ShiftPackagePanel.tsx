import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck } from "lucide-react";
import { getSealedExamPapers, getSharedExamShift, getShiftPaperSelection, openSharedExamShift, publishSharedExamShift, releaseShiftPaper, selectShiftPaper } from "@/api/exams";
import { describeError } from "@/app/providers";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

const when = (value: string) => new Date(value).toLocaleString();

/**
 * The exam package of a shift. Examiners only attach a sealed package; they never edit it.
 * The Backend picks the package, checks that it is intact, and refuses a damaged one.
 */
export function ShiftPackagePanel({ shiftId, scheduleStatus }: { shiftId: string; scheduleStatus: string }) {
  const queryClient = useQueryClient();
  const operationId = useRef(crypto.randomUUID());
  const key = ["examiner", "shift-package", shiftId];
  const shift = useQuery({ queryKey: [...key, "shift"], queryFn: () => getSharedExamShift(shiftId), meta: { silent: true } });
  const selection = useQuery({ queryKey: [...key, "selection"], queryFn: () => getShiftPaperSelection(shiftId), meta: { silent: true } });
  const pool = useQuery({ queryKey: ["examiner", "sealed-papers"], queryFn: getSealedExamPapers, meta: { silent: true } });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: ["examiner", "sealed-papers"] })]);
  const attach = useMutation({
    mutationFn: () => selectShiftPaper(shiftId, shift.data?.eTag, operationId.current),
    onSuccess: async () => {
      operationId.current = crypto.randomUUID();
      toast({ title: "Package attached", description: "The package passed the integrity check and is attached to this shift." });
      await refresh();
    },
    onError: (error) => toast({ title: "The package could not be attached", description: describeError(error), variant: "error" }),
  });
  const release = useMutation({
    mutationFn: () => releaseShiftPaper(shiftId, shift.data?.eTag),
    onSuccess: async () => {
      toast({ title: "Package released", description: "This shift has no package until you attach one." });
      await refresh();
    },
    onError: (error) => toast({ title: "The package could not be released", description: describeError(error), variant: "error" }),
  });
  const publishShift = useMutation({
    mutationFn: () => publishSharedExamShift(shiftId, shift.data?.eTag),
    onSuccess: async () => {
      toast({ title: "Shift published", description: "Students and invigilators can now see this shift." });
      await refresh();
    },
    onError: (error) => toast({ title: "The shift could not be published", description: describeError(error), variant: "error" }),
  });
  const openShift = useMutation({
    mutationFn: () => openSharedExamShift(shiftId, shift.data?.eTag),
    onSuccess: async () => {
      toast({ title: "Exam opened", description: "Every room of this shift is open. Students who checked in can start." });
      await refresh();
    },
    onError: (error) => toast({ title: "The exam could not be opened", description: describeError(error), variant: "error" }),
  });
  const shiftStatus = shift.data?.status ?? "";
  const attached = selection.data ?? null;
  const details = attached ? pool.data?.find((paper) => paper.versionId === attached.versionId) : undefined;
  const locked = scheduleStatus === "Open" || scheduleStatus === "Closed" || scheduleStatus === "Cancelled";
  const loading = selection.isPending || shift.isPending;
  return (
    <section aria-label="Exam package" className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <PackageCheck className="size-5 text-primary" aria-hidden />
          Exam package
        </h2>
        {attached ? <Badge>Attached</Badge> : <Badge variant="outline">No package</Badge>}
      </div>
      {loading ? <div role="status" aria-label="Loading the package" className="h-12 animate-pulse rounded-lg bg-muted" /> : null}
      {selection.isError || shift.isError ? (
        <p role="alert" className="text-sm text-destructive">The package of this shift could not be loaded. {selection.isError ? describeError(selection.error) : describeError(shift.error)}</p>
      ) : null}
      {!loading && !selection.isError ? (
        attached ? (
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{details?.name ?? "Sealed package"}{details ? ` · version ${details.versionNumber}` : ""}</p>
            <p className="text-muted-foreground">
              {details ? `${details.questionCount} questions · ${details.totalScore} points · ${details.durationMinutes} minutes · ` : ""}attached {when(attached.selectedAt)}
            </p>
            <p className="text-muted-foreground">Students receive the exam from this package when they enter the room.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Attach a package that a lecturer handed over. The Backend checks that it is intact before it accepts it.
          </p>
        )
      ) : null}
      {attached && shiftStatus === "Draft" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={publishShift.isPending} onClick={() => publishShift.mutate()}>{publishShift.isPending ? "Publishing…" : "Publish shift"}</Button>
          <span className="text-sm text-muted-foreground">Publishing locks the package for this shift.</span>
        </div>
      ) : null}
      {attached && shiftStatus === "Published" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={openShift.isPending} onClick={() => openShift.mutate()}>{openShift.isPending ? "Opening…" : "Open exam for every room"}</Button>
          <span className="text-sm text-muted-foreground">Lecturers cannot open a shared shift; the examiner opens it once, inside the entry window.</span>
        </div>
      ) : null}
      {!locked && shiftStatus !== "Published" ? (
        <div className="flex flex-wrap gap-2">
          {attached ? (
            <Button variant="outline" disabled={release.isPending || !shift.data} onClick={() => release.mutate()}>{release.isPending ? "Releasing…" : "Release package"}</Button>
          ) : (
            <Button disabled={attach.isPending || loading || !shift.data} onClick={() => attach.mutate()}>{attach.isPending ? "Checking the package…" : "Attach a package"}</Button>
          )}
        </div>
      ) : <p className="text-sm text-muted-foreground">The package can no longer change because this exam has started or ended.</p>}
    </section>
  );
}

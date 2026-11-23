import { useRef } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileQuestion, PackageCheck, Star, Tag } from "lucide-react";
import { useNavigate } from "react-router";
import { getScheduleValidation, getSealedExamPapers, getSharedExamShift, getShiftPaperSelection, openSharedExamShift, publishSharedExamShift, releaseShiftPaper, selectShiftPaper } from "@/api/exams";
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
  const navigate = useNavigate();
  const operationId = useRef(crypto.randomUUID());
  const key = ["examiner", "shift-package", shiftId];
  const shift = useQuery({ queryKey: [...key, "shift"], queryFn: () => getSharedExamShift(shiftId), meta: { silent: true } });
  const selection = useQuery({ queryKey: [...key, "selection"], queryFn: () => getShiftPaperSelection(shiftId), meta: { silent: true } });
  const pool = useQuery({ queryKey: ["examiner", "sealed-papers"], queryFn: getSealedExamPapers, meta: { silent: true } });
  const roomValidations = useQueries({
    queries: (shift.data?.scheduleIds ?? []).map((scheduleId) => ({
      queryKey: ["examiner", "shared-room", scheduleId, "validation"],
      queryFn: () => getScheduleValidation(scheduleId),
      meta: { silent: true },
    })),
  });
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
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["examiner", "exam-schedules"] });
      void navigate("/examiner/schedule");
      window.setTimeout(() => toast({
        title: "Shift published successfully",
        description: "The shift is ready. Open the exam from its details when the entry window begins.",
      }), 0);
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
  const checkingReadiness = roomValidations.length === 0 || roomValidations.some((query) => query.isPending);
  const readyToPublish = !checkingReadiness && roomValidations.every((query) => query.data?.isValid === true);
  const readinessProblems = [...new Set(roomValidations.flatMap((query) => query.data?.errors ?? []))];
  const packageState = shiftStatus === "Open"
    ? "Exam open"
    : shiftStatus === "Published"
      ? "Published · ready to open"
      : shiftStatus === "Closed"
        ? "Exam closed"
        : shiftStatus === "Cancelled"
          ? "Shift cancelled"
          : attached
            ? "Attached to draft"
            : "Waiting for package";
  return (
    <section aria-label="Exam package" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <PackageCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold">Exam package</h2>
            <p className="text-sm font-medium text-muted-foreground">{packageState}</p>
          </div>
        </div>
        {selection.isError ? <Badge variant="outline">Status unknown</Badge> : attached ? <Badge>Package attached</Badge> : <Badge variant="outline">No package</Badge>}
      </div>
      {loading ? <div role="status" aria-label="Loading the package" className="m-5 h-24 animate-pulse rounded-xl bg-muted" /> : null}
      {selection.isError || shift.isError ? (
        <p role="alert" className="p-5 text-sm text-destructive">The package of this shift could not be loaded. {selection.isError ? describeError(selection.error) : describeError(shift.error)}</p>
      ) : null}
      {!loading && !selection.isError ? (
        attached ? (
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-bold">{details?.name ?? "Sealed package"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Attached {when(attached.selectedAt)}</p>
              </div>
              {details ? <Badge variant="outline">Version {details.versionNumber}</Badge> : null}
            </div>
            {details ? (
              <dl className="mt-5 grid border-y border-border sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-3 py-4 sm:pr-4 xl:border-r xl:border-border">
                  <FileQuestion className="size-5 shrink-0 text-primary" aria-hidden />
                  <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Questions</dt><dd className="font-bold">{details.questionCount}</dd></div>
                </div>
                <div className="flex items-center gap-3 py-4 sm:pl-4 xl:border-r xl:border-border">
                  <Star className="size-5 shrink-0 text-primary" aria-hidden />
                  <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Total score</dt><dd className="font-bold">{details.totalScore} points</dd></div>
                </div>
                <div className="flex items-center gap-3 py-4 sm:pr-4 xl:border-r xl:border-border xl:pl-4">
                  <Clock3 className="size-5 shrink-0 text-primary" aria-hidden />
                  <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Duration</dt><dd className="font-bold">{details.durationMinutes} minutes</dd></div>
                </div>
                <div className="flex items-center gap-3 py-4 sm:pl-4">
                  <Tag className="size-5 shrink-0 text-primary" aria-hidden />
                  <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Package state</dt><dd className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="size-4 text-success-foreground" aria-hidden />Verified</dd></div>
                </div>
              </dl>
            ) : null}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">
            {locked
              ? "This exam has started or ended, so you can no longer change its package."
              : "Attach a package that a lecturer handed over. The Backend checks that it is intact before it accepts it."}
          </p>
        )
      ) : null}
      {attached && shiftStatus === "Draft" ? (
        <div className="space-y-2 border-t border-border p-5">
          <div className="flex flex-wrap items-center gap-2">
            {readyToPublish ? <Button disabled={publishShift.isPending} onClick={() => publishShift.mutate()}>{publishShift.isPending ? "Publishing…" : "Publish shift"}</Button> : <Button disabled>{checkingReadiness ? "Checking people setup…" : "Complete people setup first"}</Button>}
            <span className="text-sm text-muted-foreground">{readyToPublish ? "Publishing locks the package for this shift." : "Import students and invigilators for every room before publishing."}</span>
          </div>
          {!checkingReadiness && readinessProblems.length ? <ul role="status" className="list-disc space-y-1 pl-5 text-sm text-warning-foreground">{readinessProblems.slice(0, 4).map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
        </div>
      ) : null}
      {attached && shiftStatus === "Published" ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-5">
          <Button disabled={openShift.isPending} onClick={() => openShift.mutate()}>{openShift.isPending ? "Opening…" : "Open exam for every room"}</Button>
        </div>
      ) : null}
      {!locked && shiftStatus !== "Published" ? (
        <div className="flex flex-wrap gap-2 border-t border-border p-5">
          {attached ? (
            <Button variant="outline" disabled={release.isPending || !shift.data} onClick={() => release.mutate()}>{release.isPending ? "Releasing…" : "Release package"}</Button>
          ) : (
            <Button disabled={attach.isPending || loading || !shift.data} onClick={() => attach.mutate()}>{attach.isPending ? "Checking the package…" : "Attach a package"}</Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

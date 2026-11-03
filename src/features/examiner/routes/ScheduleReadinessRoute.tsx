import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Grid3X3, Send } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getExamEnrollments, getExamSeating, getScheduleValidation, publishExamSchedule } from "@/api/exams";
import {
  useExamPreparationDraft,
  useSchedulePreparationDraft,
} from "@/features/examiner/workflow/examPreparation";
import {
  ApiNotice,
  PreparationHeader,
  PreparationSteps,
} from "@/features/examiner/workflow/PreparationShell";
import { Button } from "@/shared/ui/primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { toast } from "@/shared/ui/primitives/toast";

const steps = [
  "Shift & room",
  "Add students & lecturers",
  "Automatic seating",
  "Validate & publish",
];

export function ScheduleReadinessRoute() {
  const [seatingOpen, setSeatingOpen] = useState(false);
  const navigate = useNavigate();
  const client = useQueryClient();
  const schedule = useSchedulePreparationDraft();
  const exam = useExamPreparationDraft();
  const targets = schedule.draft.scheduleRooms.length
    ? schedule.draft.scheduleRooms
    : [
        {
          examRoomId: schedule.draft.examRoomId,
          roomLabel: "Selected room",
          examShiftId: schedule.draft.examShiftId,
          examScheduleId: schedule.draft.examScheduleId,
        },
      ];
  const validations = useQueries({
    queries: targets.map((target) => ({
      queryKey: ["exam-schedule", target.examScheduleId, "validation"],
      queryFn: () => getScheduleValidation(target.examScheduleId),
      enabled: Boolean(target.examScheduleId),
    })),
  });
  const allValid =
    validations.length > 0 && validations.every((item) => item.data?.isValid);
  const seating = useQuery({ queryKey: ["exam-schedule", schedule.draft.examScheduleId, "seating"], queryFn: () => getExamSeating(schedule.draft.examScheduleId), enabled: seatingOpen && Boolean(schedule.draft.examScheduleId) });
  const enrollments = useQuery({ queryKey: ["exam-schedule", schedule.draft.examScheduleId, "enrollments"], queryFn: () => getExamEnrollments(schedule.draft.examScheduleId), enabled: seatingOpen && Boolean(schedule.draft.examScheduleId) });
  const studentNameByEnrollment = new Map((enrollments.data ?? []).map((item) => [item.enrollmentId, item.studentName]));
  const seatColumns = Math.max(1, ...(seating.data ?? []).map((item) => item.columnNumber));
  const publish = useMutation({
    mutationFn: () =>
      Promise.all(
        targets.map((target) => publishExamSchedule(target.examScheduleId)),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["examiner", "exam-schedules"],
      });
      toast({
        title: `${targets.length} room schedule${targets.length === 1 ? "" : "s"} published`,
        description:
          "The validated schedules are now available to assigned staff and candidates.",
      });
      schedule.reset();
      exam.reset();
      navigate("/examiner/schedule");
    },
  });
  if (!schedule.draft.examScheduleId)
    return (
      <ApiNotice tone="error">
        No draft schedule is available.{" "}
        <Link
          className="font-semibold underline"
          to="/examiner/schedule/new/details"
        >
          Create a schedule first
        </Link>
        .
      </ApiNotice>
    );
  return (
    <main className="space-y-6">
      <PreparationHeader
        title="Validate and publish the schedule"
        description="Check room capacity, schedule conflicts, paper readiness, invigilators, enrollments, and seat assignments before publication."
      />
      <PreparationSteps steps={steps} current={3} />
      {validations.some((item) => item.error) || publish.error ? (
        <ApiNotice tone="error">
          One or more room schedules could not be validated or published.
          Resolve every reported error.
        </ApiNotice>
      ) : null}
      <section className="examiner-major mx-auto max-w-4xl overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 className="text-xl font-semibold">Room schedule readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {targets.length} room schedule{targets.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={validations.some((item) => item.isFetching)}
            onClick={() => validations.forEach((item) => void item.refetch())}
          >
            {validations.some((item) => item.isFetching)
              ? "Checking…"
              : "Run all validations again"}
          </Button>
        </header>
        <div className="space-y-4 p-6">
          {targets.map((target, index) => {
            const validation = validations[index];
            return (
              <article
                key={target.examScheduleId}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{target.roomLabel}</strong>
                  <span className="text-sm font-semibold">
                    {validation.data?.isValid
                      ? "Ready"
                      : validation.isPending
                        ? "Checking…"
                        : "Action required"}
                  </span>
                </div>
                {validation.data && !validation.data.isValid ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-destructive">
                    {validation.data.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
          {allValid ? (
            <ApiNotice tone="success">
              <span className="flex items-center gap-3">
                <CheckCircle2 className="size-6" />
                <strong>All room schedules are ready to publish.</strong>
              </span>
            </ApiNotice>
          ) : (
            <ApiNotice tone="error">
              <span className="flex gap-3">
                <AlertTriangle className="size-6 shrink-0" />
                <strong>
                  Every room must pass validation before publishing.
                </strong>
              </span>
            </ApiNotice>
          )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/examiner/schedule/new/candidates">Review assignments</Link>
              </Button>
              <Button variant="outline" onClick={() => setSeatingOpen(true)}>
                <Grid3X3 />View seating map
              </Button>
            </div>
            <Button
              disabled={!allValid || publish.isPending}
              onClick={() => publish.mutate()}
            >
              <Send />
              {publish.isPending ? "Publishing…" : "Publish all room schedules"}
            </Button>
          </div>
        </div>
      </section>
      <Dialog open={seatingOpen} onOpenChange={setSeatingOpen}>
        <DialogContent className="h-[90vh] w-[96vw] max-w-[96vw] overflow-auto sm:max-w-[min(96vw,90rem)]">
          <DialogHeader>
            <DialogTitle>Assigned seating · {targets[0]?.roomLabel}</DialogTitle>
            <DialogDescription>Seats returned by the Backend after automatic allocation.</DialogDescription>
          </DialogHeader>
          {seating.isPending || enrollments.isPending ? (
            <p role="status" className="py-12 text-center text-muted-foreground">Loading assigned seats…</p>
          ) : seating.error || enrollments.error ? (
            <ApiNotice tone="error">The assigned seats could not be loaded. Close this window and try again.</ApiNotice>
          ) : seating.data?.length ? (
            <div className="grid gap-3 overflow-x-auto p-1" style={{ gridTemplateColumns: `repeat(${seatColumns}, minmax(10rem, 1fr))` }}>
              {[...seating.data].sort((a, b) => a.rowNumber - b.rowNumber || a.columnNumber - b.columnNumber).map((seat) => (
                <article key={seat.studentExamSheetId} className="rounded-xl border border-success-border bg-success/5 p-4">
                  <strong className="block text-primary">Seat {seat.seatCode ?? `${seat.rowNumber}-${seat.columnNumber}`}</strong>
                  <span className="mt-2 block font-semibold">{studentNameByEnrollment.get(seat.enrollmentId) ?? `Student ${seat.studentId.slice(0, 8)}`}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Row {seat.rowNumber} · Column {seat.columnNumber}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No assigned seats were returned for this schedule.</p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* eslint-disable jsx-a11y/label-has-associated-control -- Wrapped labels remain programmatically associated. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  extendAttemptTime,
  getAttemptTimeExtension,
} from "@/api/timeExtensions";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
import { AttemptRecordingsPanel } from "@/features/examiner/components/AttemptRecordingsPanel";
import { describeError } from "@/app/providers";

export function CandidateMonitoringRoute() {
  const { roomId, candidateId } = useParams();
  const client = useQueryClient();
  const [minutes, setMinutes] = useState("10");
  const [reason, setReason] = useState("");
  const state = useQuery({
    queryKey: ["attempt-time-extension", candidateId],
    queryFn: () => getAttemptTimeExtension(candidateId!),
    enabled: Boolean(candidateId),
  });
  const addedMinutes = Number(minutes);
  const validMinutes =
    Number.isInteger(addedMinutes) &&
    addedMinutes >= 1 &&
    addedMinutes <= (state.data?.maxAdditionalMinutes ?? 0);
  const extend = useMutation({
    mutationFn: () =>
      extendAttemptTime(candidateId!, state.data!.revision, {
        operationId: crypto.randomUUID(),
        additionalMinutes: addedMinutes,
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      toast({
        title: "Exam time extended",
        description: `${minutes} minutes were added to this active attempt.`,
      });
      setReason("");
      await client.invalidateQueries({
        queryKey: ["attempt-time-extension", candidateId],
      });
    },
    onError: (error) =>
      toast({
        title: "Time could not be extended",
        description: describeError(error),
        variant: "error",
      }),
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-primary">
          Candidate monitoring
        </h1>
        <p className="mt-2 text-muted-foreground">
          Attempt {candidateId?.slice(0, 8).toUpperCase() ?? "not selected"}
        </p>
      </header>
      {state.isPending ? (
        <p role="status" className="rounded-xl border border-border p-6">
          Loading active attempt…
        </p>
      ) : state.error || !state.data ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Active attempt details could not be loaded</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The attempt may not have started, may already be submitted, or you
              may not have permission to extend it.
            </p>
            <Button className="mt-5" variant="outline" asChild>
              <Link
                to={
                  roomId
                    ? `/examiner/monitoring/${roomId}`
                    : "/examiner/monitoring"
                }
              >
                Back to room monitoring
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Active attempt time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-sm text-muted-foreground">
                  Current deadline
                </dt>
                <dd className="mt-1 font-semibold">
                  {new Date(state.data.deadlineAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Time remaining
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {Math.max(0, Math.ceil(state.data.remainingSeconds / 60))}{" "}
                  minutes
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Extra time granted
                </dt>
                <dd className="mt-1 font-semibold">
                  {state.data.extraTimeMinutes} minutes
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Maximum additional time
                </dt>
                <dd className="mt-1 font-semibold">
                  {state.data.maxAdditionalMinutes} minutes
                </dd>
              </div>
            </dl>
            {!state.data.canExtend ? (
              <p
                role="status"
                className="rounded-xl border border-warning-foreground/30 bg-warning p-4 font-semibold text-warning-foreground"
              >
                This attempt cannot receive more time in its current state.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <label className="space-y-2 text-sm font-semibold">
                Additional minutes
                <Input
                  type="number"
                  min={1}
                  max={state.data.maxAdditionalMinutes}
                  step={1}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
                {!validMinutes ? (
                  <span className="block text-xs text-destructive">
                    Enter a whole number from 1 to{" "}
                    {state.data.maxAdditionalMinutes}.
                  </span>
                ) : null}
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Reason
                <Textarea
                  value={reason}
                  maxLength={4000}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why extra time is being granted"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !state.data.canExtend ||
                  extend.isPending ||
                  !reason.trim() ||
                  !validMinutes
                }
                onClick={() => extend.mutate()}
              >
                {extend.isPending
                  ? "Extending…"
                  : `Add ${validMinutes ? addedMinutes : 0} minutes`}
              </Button>
              <Button variant="outline" asChild>
                <Link
                  to={
                    roomId
                      ? `/examiner/monitoring/${roomId}`
                      : "/examiner/monitoring"
                  }
                >
                  Back to room monitoring
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {candidateId ? <AttemptRecordingsPanel attemptId={candidateId} /> : null}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { useState } from "react";
import { describeError } from "@/app/providers";
import {
  extendAttemptTime,
  getAttemptTimeExtension,
} from "@/api/timeExtensions";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

export function ExtendTimeDialog({
  attemptId,
  studentName,
}: {
  attemptId: string;
  studentName: string;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("10");
  const [reason, setReason] = useState("");
  const state = useQuery({
    queryKey: ["attempt-time-extension", attemptId],
    queryFn: () => getAttemptTimeExtension(attemptId),
    enabled: open,
  });
  const amount = Number(minutes);
  const validAmount =
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= (state.data?.maxAdditionalMinutes ?? 0);
  const extend = useMutation({
    mutationFn: () =>
      extendAttemptTime(attemptId, state.data!.revision, {
        operationId: crypto.randomUUID(),
        additionalMinutes: amount,
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      toast({
        title: "Extra time added",
        description: `${studentName} received ${amount} additional minutes.`,
      });
      setOpen(false);
      setReason("");
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["attempt-time-extension", attemptId],
        }),
        client.invalidateQueries({ queryKey: ["examiner", "monitoring"] }),
      ]);
    },
    onError: (error) =>
      toast({
        title: "Extra time could not be added",
        description: describeError(error),
        variant: "error",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Clock3 aria-hidden /> Add time
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add extra exam time</DialogTitle>
          <DialogDescription>
            Extend the active attempt for {studentName}. The Backend applies the
            new deadline immediately.
          </DialogDescription>
        </DialogHeader>
        {state.isPending ? (
          <p role="status" className="py-6">
            Loading the current time allowance…
          </p>
        ) : state.error || !state.data ? (
          <div role="alert" className="text-destructive">
            <p className="font-semibold">Time allowance is unavailable.</p>
            <p className="mt-1 text-sm">{describeError(state.error)}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => state.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Remaining</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {Math.max(0, Math.ceil(state.data.remainingSeconds / 60))} min
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Already added</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {state.data.extraTimeMinutes} min
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Can add up to</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {state.data.maxAdditionalMinutes} min
                </dd>
              </div>
            </dl>
            {!state.data.canExtend ? (
              <p className="rounded-xl bg-warning p-4 font-semibold text-warning-foreground">
                This attempt cannot receive more time in its current state.
              </p>
            ) : null}
            <label
              htmlFor={`extra-minutes-${attemptId}`}
              className="block space-y-2 font-semibold"
            >
              Additional minutes
              <Input
                id={`extra-minutes-${attemptId}`}
                aria-label="Additional minutes"
                type="number"
                min={1}
                max={state.data.maxAdditionalMinutes}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
              {!validAmount ? (
                <span className="block text-sm text-destructive">
                  Enter a whole number from 1 to{" "}
                  {state.data.maxAdditionalMinutes}.
                </span>
              ) : null}
            </label>
            <label
              htmlFor={`extra-reason-${attemptId}`}
              className="block space-y-2 font-semibold"
            >
              Reason
              <Textarea
                id={`extra-reason-${attemptId}`}
                aria-label="Reason"
                value={reason}
                maxLength={4000}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Record why this candidate receives extra time"
              />
            </label>
          </div>
        )}
        <DialogFooter showCloseButton>
          <Button
            disabled={
              !state.data?.canExtend ||
              !validAmount ||
              !reason.trim() ||
              extend.isPending
            }
            onClick={() => extend.mutate()}
          >
            {extend.isPending
              ? "Adding time…"
              : `Add ${validAmount ? amount : 0} minutes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ShieldCheck } from "lucide-react";
import { useParams } from "react-router";
import { getRecordingPolicy, submitRecordingConsent } from "@/api/proctoring";
import { describeError } from "@/app/providers";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

/** Student acknowledgement shown before a recording-required exam. */
export function RecordingConsentRoute() {
  const { scheduleId = "" } = useParams();
  const queryClient = useQueryClient();
  const policy = useQuery({ queryKey: ["recording-policy", scheduleId], queryFn: () => getRecordingPolicy(scheduleId), enabled: Boolean(scheduleId) });
  const consent = useMutation({
    mutationFn: () => submitRecordingConsent(scheduleId, true, policy.data?.policyVersion),
    onSuccess: async () => {
      toast({ title: "Recording consent saved", description: "You can continue to the exam entry check." });
      await queryClient.invalidateQueries({ queryKey: ["recording-policy", scheduleId] });
    },
    onError: (error) => toast({ title: "Consent could not be saved", description: describeError(error), variant: "error" }),
  });
  if (policy.isPending) return <div role="status" aria-label="Loading recording policy" className="h-48 animate-pulse rounded-xl bg-muted" />;
  if (policy.isError || !policy.data) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">The recording policy could not be loaded. {describeError(policy.error)}</div>;
  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-start gap-3 border-b border-border pb-5">
        <Camera className="mt-1 size-7 text-primary" aria-hidden />
        <div><h1 className="text-3xl font-semibold tracking-tight text-primary">Exam recording</h1><p className="mt-1 text-muted-foreground">Review how this exam uses camera recording before entering.</p></div>
      </header>
      {!policy.data.enabled ? <p className="rounded-xl border border-border p-5">Recording is disabled for this exam.</p> : (
        <section className="space-y-4 rounded-xl border border-border p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" aria-hidden /><h2 className="text-lg font-semibold">Recording policy</h2></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Required</dt><dd className="font-semibold">{policy.data.recordingRequired ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Retention</dt><dd className="font-semibold">{policy.data.retentionDays} days</dd></div>
            <div><dt className="text-muted-foreground">Camera unavailable</dt><dd className="font-semibold">{policy.data.cameraUnavailablePolicy ?? "Not specified"}</dd></div>
            <div><dt className="text-muted-foreground">Segment duration</dt><dd className="font-semibold">{policy.data.segmentDurationSeconds} seconds</dd></div>
          </dl>
          {policy.data.consentAccepted ? <p role="status" className="rounded-lg border border-success-border bg-success p-4 font-semibold text-success-foreground">You already accepted this recording policy.</p> : <Button disabled={consent.isPending} onClick={() => consent.mutate()}>{consent.isPending ? "Saving consent…" : "I understand and consent"}</Button>}
        </section>
      )}
    </main>
  );
}

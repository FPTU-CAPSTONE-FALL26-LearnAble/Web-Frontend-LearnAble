import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Clock3 } from "lucide-react";
import {
  cameraUnavailablePolicies,
  getUniversityExamPolicy,
  updateUniversityExamPolicy,
  type UniversityExamPolicy,
} from "@/api/admin";
import { describeError } from "@/app/providers";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { PageHeading, ReadState, StatusBadge } from "@/components/workbench/Workbench";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { toast } from "@/shared/ui/primitives/toast";

type CameraPolicy = (typeof cameraUnavailablePolicies)[number];
type PolicyForm = {
  duration: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  cameraRequired: boolean;
  cameraUnavailablePolicy: CameraPolicy;
};

/** What the exam setup form starts with when a university has not saved a policy. */
export const builtInPolicy: UniversityExamPolicy = {
  defaultDurationMinutes: 90,
  shuffleQuestions: true,
  shuffleOptions: true,
  scoringPolicy: "AllOrNothing",
  cameraRequired: true,
  cameraUnavailablePolicy: "AllowWithFlag",
};
const DURATION_MAX = 1440;
const cameraOptions: Array<{ value: CameraPolicy; label: string }> = [
  { value: "Block", label: "Block exam entry" },
  { value: "AllowWithFlag", label: "Allow and flag for review" },
  { value: "Allow", label: "Allow without a flag" },
];

const toForm = (policy: UniversityExamPolicy): PolicyForm => ({
  duration: String(policy.defaultDurationMinutes),
  shuffleQuestions: policy.shuffleQuestions,
  shuffleOptions: policy.shuffleOptions,
  cameraRequired: policy.cameraRequired,
  cameraUnavailablePolicy: policy.cameraUnavailablePolicy,
});

function durationError(value: string) {
  const minutes = Number(value);
  if (!value.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > DURATION_MAX)
    return `Enter a whole number of minutes from 1 to ${DURATION_MAX}.`;
  return null;
}

export function StaffPolicyRoute() {
  useRouteAnnouncer("Default Exam Policy · LearnAble", "Default Exam Policy");
  const universityId = useAuthStore((state) => state.user?.universityId ?? "");
  const [edits, setEdits] = useState<Partial<PolicyForm>>({});
  const [showErrors, setShowErrors] = useState(false);

  const policy = useQuery({
    queryKey: ["staff", "default-exam-policy", universityId],
    queryFn: () => getUniversityExamPolicy(universityId),
    enabled: Boolean(universityId),
  });
  useExpiredSession(policy.error);

  const saved = policy.data ?? builtInPolicy;
  const hasSavedPolicy = Boolean(policy.data);
  const savedForm = toForm(saved);
  const form: PolicyForm = { ...savedForm, ...edits };
  const dirty = (Object.keys(edits) as Array<keyof PolicyForm>).some((key) => edits[key] !== savedForm[key]);
  const invalidDuration = durationError(form.duration);
  const patch = (next: Partial<PolicyForm>) => setEdits((old) => ({ ...old, ...next }));

  const save = useMutation({
    mutationFn: () =>
      updateUniversityExamPolicy(
        universityId,
        {
          defaultDurationMinutes: Number(form.duration),
          shuffleQuestions: form.shuffleQuestions,
          shuffleOptions: form.shuffleOptions,
          scoringPolicy: saved.scoringPolicy,
          cameraRequired: form.cameraRequired,
          cameraUnavailablePolicy: form.cameraUnavailablePolicy,
        },
        policy.data?.revision,
      ),
    onSuccess: async () => {
      await policy.refetch();
      setEdits({});
      setShowErrors(false);
      toast({ title: "Default exam policy saved", description: "New exam configurations start from these values." });
    },
    onError: (error) =>
      toast({
        title: "Default exam policy was not saved",
        description: `${describeError(error)} Your changes are still here.`,
        variant: "error",
      }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (invalidDuration || save.isPending) return;
    save.mutate();
  };

  const state = save.isPending
    ? { label: "Saving…", tone: "info" as const }
    : dirty && save.isError
      ? { label: "Save failed", tone: "danger" as const }
      : dirty
        ? { label: "Not saved", tone: "warning" as const }
        : hasSavedPolicy
          ? { label: "Saved", tone: "success" as const }
          : { label: "Built-in defaults, not saved yet", tone: "neutral" as const };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Default Exam Policy"
        description="Set the university defaults that a new exam configuration starts from. Examiners can still change them for a single exam."
      />

      {!universityId ? (
        <div role="alert" className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Your account is not linked to a university, so there is no policy to show. Ask an administrator to link your account.
        </div>
      ) : (
        <>
          <ReadState pending={policy.isPending} error={policy.error} retry={() => void policy.refetch()} />
          {policy.isSuccess ? (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Clock3 aria-hidden className="size-5 text-primary" />
                      <CardTitle>Assessment defaults</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TextField
                      label="Default duration (minutes)"
                      type="number"
                      min="1"
                      max={String(DURATION_MAX)}
                      value={form.duration}
                      error={showErrors ? (invalidDuration ?? undefined) : undefined}
                      onChange={(duration) => patch({ duration })}
                    />
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id="policy-shuffle-questions"
                        checked={form.shuffleQuestions}
                        onCheckedChange={(checked) => patch({ shuffleQuestions: checked === true })}
                      />
                      <Label htmlFor="policy-shuffle-questions">Shuffle questions</Label>
                    </div>
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id="policy-shuffle-options"
                        checked={form.shuffleOptions}
                        onCheckedChange={(checked) => patch({ shuffleOptions: checked === true })}
                      />
                      <Label htmlFor="policy-shuffle-options">Shuffle answer options</Label>
                    </div>
                    <ChoiceField
                      label="Scoring policy"
                      value={saved.scoringPolicy}
                      disabled
                      options={[{ value: "AllOrNothing", label: "All-or-Nothing" }]}
                      onChange={() => undefined}
                    />
                    <p className="text-xs text-muted-foreground">The Backend currently supports All-or-Nothing scoring only.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Camera aria-hidden className="size-5 text-primary" />
                      <CardTitle>Camera</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id="policy-camera-required"
                        checked={form.cameraRequired}
                        onCheckedChange={(checked) => patch({ cameraRequired: checked === true })}
                      />
                      <Label htmlFor="policy-camera-required">Require a camera for the exam</Label>
                    </div>
                    <ChoiceField
                      label="If a camera is unavailable"
                      value={form.cameraUnavailablePolicy}
                      options={cameraOptions}
                      onChange={(value) => patch({ cameraUnavailablePolicy: value as CameraPolicy })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used when a candidate&apos;s camera cannot be started during exam entry.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
                <div role="status" className="flex items-center gap-3">
                  <StatusBadge value={state.label} tone={state.tone} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {dirty && !save.isPending ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEdits({});
                        setShowErrors(false);
                      }}
                    >
                      Reset changes
                    </Button>
                  ) : null}
                  {dirty || save.isPending ? (
                    <Button type="submit" aria-busy={save.isPending}>
                      {save.isPending ? "Saving…" : "Save defaults"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}

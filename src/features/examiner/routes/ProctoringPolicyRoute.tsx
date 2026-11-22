import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { getExamCameraPolicy, getExamSubjects, updateExamCameraPolicy, type ExamCameraPolicy, type ExamSubject } from "@/api/exams";
import { describeError } from "@/app/providers";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";

type Behaviour = ExamCameraPolicy["cameraUnavailablePolicy"];

export const behaviourLabels: Record<Behaviour, { label: string; note: string }> = {
  Block: { label: "Block the exam", note: "The student cannot start without a working camera." },
  AllowWithFlag: { label: "Allow and flag the session", note: "The student can take the exam; the session is flagged for review." },
  Allow: { label: "Allow normally", note: "The student takes the exam as usual." },
};

function PolicyCard({ exam }: { exam: ExamSubject }) {
  const queryClient = useQueryClient();
  const key = ["examiner", "camera-policy", exam.examSubjectId];
  const policy = useQuery({ queryKey: key, queryFn: () => getExamCameraPolicy(exam.examSubjectId), meta: { silent: true } });
  const [draft, setDraft] = useState<Pick<ExamCameraPolicy, "cameraRequired" | "cameraUnavailablePolicy"> | null>(null);
  const current = draft ?? (policy.data ? { cameraRequired: policy.data.cameraRequired, cameraUnavailablePolicy: policy.data.cameraUnavailablePolicy } : null);
  const dirty = Boolean(draft && policy.data && (draft.cameraRequired !== policy.data.cameraRequired || draft.cameraUnavailablePolicy !== policy.data.cameraUnavailablePolicy));
  const save = useMutation({
    mutationFn: () => updateExamCameraPolicy(exam.examSubjectId, draft!, policy.data?.eTag),
    onSuccess: async () => {
      setDraft(null);
      toast({ title: "Camera policy saved", description: `${exam.name ?? "The exam"} uses it as soon as a student starts.` });
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: async (error) => {
      toast({ title: "The camera policy could not be saved", description: describeError(error), variant: "error" });
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const checkboxId = `camera-required-${exam.examSubjectId}`;
  return (
    <article aria-label={exam.name ?? "Exam"} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{exam.name ?? "Unnamed exam"}</h2>
        <Badge variant="outline">{exam.durationMinutes} minutes</Badge>
      </div>
      {policy.isPending ? <div role="status" aria-label="Loading the camera policy" className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
      {policy.isError ? <p role="alert" className="text-sm text-destructive">The camera policy could not be loaded. {describeError(policy.error)}</p> : null}
      {current ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox id={checkboxId} checked={current.cameraRequired} onCheckedChange={(on) => setDraft({ ...current, cameraRequired: on === true })} />
            <div>
              <label htmlFor={checkboxId} className="font-semibold">Camera is required</label>
              <p className="text-sm text-muted-foreground">Students must turn the camera on during this exam.</p>
            </div>
          </div>
          <div className="grid max-w-md gap-2 text-sm font-semibold">
            <span id={`camera-behaviour-${exam.examSubjectId}`}>When the camera is not available</span>
            <Select value={current.cameraUnavailablePolicy} disabled={!current.cameraRequired} onValueChange={(value) => setDraft({ ...current, cameraUnavailablePolicy: value as Behaviour })}>
              <SelectTrigger aria-labelledby={`camera-behaviour-${exam.examSubjectId}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(behaviourLabels) as Behaviour[]).map((value) => <SelectItem key={value} value={value}>{behaviourLabels[value].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs font-normal text-muted-foreground">
              {current.cameraRequired ? behaviourLabels[current.cameraUnavailablePolicy].note : "Not used while the camera is not required."}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save policy"}</Button>
            <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>Discard changes</Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/** Whether the camera is required for each exam, and what happens when a student has none. */
export function ProctoringPolicyRoute() {
  const exams = useQuery({ queryKey: ["examiner", "proctoring-exams"], queryFn: () => getExamSubjects() });
  const items = (exams.data?.items ?? []).filter((exam) => exam.status !== "Archived");
  return (
    <main className="space-y-6">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <Camera className="size-7 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Proctoring policy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose, for each exam, whether the camera is required and what to do when it is not available.</p>
        </div>
      </header>
      {exams.isPending ? <div role="status" aria-label="Loading exams" className="space-y-3"><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-32 animate-pulse rounded-xl bg-muted" /></div> : null}
      {exams.isError ? (
        <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
          <p className="font-bold">The exams could not be loaded.</p>
          <p className="mt-1 text-sm">{describeError(exams.error)}</p>
          <Button className="mt-3" variant="outline" onClick={() => void exams.refetch()}>Retry</Button>
        </div>
      ) : null}
      {exams.isSuccess && items.length === 0 ? <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">No exam configuration exists yet. A lecturer creates one with the exam paper.</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((exam) => <PolicyCard key={exam.examSubjectId} exam={exam} />)}
      </div>
    </main>
  );
}

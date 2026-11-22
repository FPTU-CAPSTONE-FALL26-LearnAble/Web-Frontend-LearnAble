import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, RotateCcw } from "lucide-react";
import {
  getQuestionAudioGeneration,
  getQuestionAudioGenerationSummary,
  queueQuestionAudioGeneration,
  retryAudioGeneration,
  type AudioGenerationSummary,
  type AudioSegment,
} from "@/api/lecturer";
import { formatQuestionId } from "@/shared/strings/questionId";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

const POLL_MS = 3000;
const MAX_FAILED_SHOWN = 5;
export const audioGenerationKey = ["question-audio-generation"] as const;

const statusNames: Record<AudioSegment["generationStatus"], string> = {
  Pending: "Waiting",
  Processing: "Creating",
  Ready: "Ready",
  Failed: "Failed",
};

const segmentName = (segment: AudioSegment) =>
  segment.optionId ? `Answer ${segment.displayOrder ?? ""}`.trim() : "Question text";

function reportQueued(result: { queued: number; requeued: number }) {
  const count = result.queued + result.requeued;
  toast({
    title: count > 0 ? "Audio generation queued" : "Nothing to queue",
    description: count > 0
      ? `${count} audio segments were added to the queue.`
      : "All audio in this scope is already queued or ready.",
  });
}

function reportQueueFailure() {
  toast({
    title: "Audio generation was not queued",
    description: "The audio service could not accept this request. Your questions are unchanged. Try again.",
    variant: "error",
  });
}

function WorkerDisabled() {
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
      The audio worker is turned off on the server, so audio cannot be created right now. Ask the Backend team to enable it.
    </p>
  );
}

/** How many questions (not audio segments) are in each audio state. */
export type QuestionProgress = { loading: boolean; total: number; ready: number; waiting: number; failed: number; none: number; checking: number };

type PanelFilters = { subjectId?: string; topicId?: string; examTypeId?: string };

/**
 * Audio progress for everything matching the filters. The Backend summarises one subject at a time,
 * so with no subject chosen the panel asks for each subject in `subjectIds` and adds them up.
 */
export function AudioGenerationPanel({ filters, subjectIds = [], questionProgress }: { filters: PanelFilters; subjectIds?: string[]; questionProgress?: QuestionProgress }) {
  const queryClient = useQueryClient();
  const scopes: PanelFilters[] = filters.subjectId ? [filters] : subjectIds.map((subjectId) => ({ ...filters, subjectId }));
  const results = useQueries({
    queries: scopes.map((scope) => ({
      queryKey: [...audioGenerationKey, "summary", scope],
      queryFn: () => getQuestionAudioGenerationSummary(scope),
      meta: { silent: true },
      refetchInterval: (query: { state: { data?: AudioGenerationSummary } }) => {
        const data = query.state.data;
        return data?.workerEnabled && data.pending + data.processing > 0 ? POLL_MS : false;
      },
    })),
  });
  const loaded = results.flatMap((result) => (result.data ? [result.data] : []));
  const loading = scopes.length > 0 && results.some((result) => result.isPending);
  const failedToLoad = results.some((result) => result.isError);
  const sum = (pick: (item: AudioGenerationSummary) => number) => loaded.reduce((total, item) => total + pick(item), 0);
  const data = loaded.length
    ? {
      questions: sum((item) => item.questions),
      totalSegments: sum((item) => item.totalSegments),
      ready: sum((item) => item.ready),
      pending: sum((item) => item.pending),
      processing: sum((item) => item.processing),
      failed: sum((item) => item.failed),
      missing: sum((item) => item.missing),
      workerEnabled: loaded.every((item) => item.workerEnabled),
      failedSegments: loaded.flatMap((item) => item.failedSegments),
    }
    : null;
  const retry = useMutation({
    mutationFn: async () => {
      const done = await Promise.all(scopes.map((scope) => retryAudioGeneration({ ...scope, includeMissing: true })));
      return { queued: done.reduce((total, item) => total + item.queued, 0), requeued: done.reduce((total, item) => total + item.requeued, 0) };
    },
    onSuccess: async (result) => {
      reportQueued(result);
      await queryClient.invalidateQueries({ queryKey: audioGenerationKey });
    },
    onError: reportQueueFailure,
  });
  const byQuestion = questionProgress && !questionProgress.loading ? questionProgress : null;
  const unfinished = byQuestion ? byQuestion.failed + byQuestion.none : data ? data.failed + data.missing : 0;
  const active = data ? data.pending + data.processing : 0;
  const percent = byQuestion
    ? byQuestion.total ? Math.round((byQuestion.ready / byQuestion.total) * 100) : 0
    : data && data.totalSegments ? Math.round((data.ready / data.totalSegments) * 100) : 0;
  const counts = byQuestion
    ? [["Ready", byQuestion.ready], ["In progress", byQuestion.waiting], ["Failed", byQuestion.failed], ["No audio", byQuestion.none]] as const
    : data
      ? [["Ready", data.ready], ["Waiting", data.pending], ["Creating", data.processing], ["Failed", data.failed], ["Missing", data.missing]] as const
      : [];
  return (
    <section aria-label="Audio generation status" className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-primary">
            <AudioLines className="size-5" aria-hidden />
            Audio generation
          </h2>
          {data ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {byQuestion
                ? `${byQuestion.ready} of ${byQuestion.total} questions have all their audio ready`
                : `${data.ready} of ${data.totalSegments} audio segments ready across ${data.questions} questions`}
              {byQuestion && byQuestion.checking > 0 ? `, checking ${byQuestion.checking} more` : ""}
              {data.workerEnabled && active > 0 ? ". Updating automatically." : "."}
            </p>
          ) : null}
        </div>
        {data ? (
          <Button type="button" variant="outline" disabled={!unfinished || !data.workerEnabled || retry.isPending} onClick={() => retry.mutate()}>
            <RotateCcw aria-hidden />
            {retry.isPending ? "Queueing audio…" : `Retry failed and create missing (${unfinished})`}
          </Button>
        ) : null}
      </div>
      {loading && !data ? <div role="status" aria-label="Checking the audio queue" className="h-16 animate-pulse rounded-lg bg-muted" /> : null}
      {failedToLoad ? <p className="text-sm text-destructive">Some audio status could not be loaded. Refresh this page to check again.</p> : null}
      {data ? (
        <>
          {!data.workerEnabled ? <WorkerDisabled /> : null}
          {data.totalSegments > 0 ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{active > 0 ? "Audio is being created" : data.failed > 0 ? "Finished with failures" : data.missing > 0 ? "Some audio has not been queued yet" : data.ready === data.totalSegments ? "All audio is ready" : "Waiting for the audio worker"}</span>
                <span className="tabular-nums">{percent}%</span>
              </div>
              <div role="progressbar" aria-label="Audio segments ready" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}
          {byQuestion ? <p className="text-xs text-muted-foreground">{data.ready} of {data.totalSegments} audio segments are ready. A question counts as ready when its text and every answer have audio.</p> : null}
          <dl aria-live="polite" className={byQuestion ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-2 gap-2 sm:grid-cols-5"}>
            {counts.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {data.failedSegments.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.failedSegments.slice(0, MAX_FAILED_SHOWN).map((segment) => (
                <li key={`${segment.questionId}-${segment.optionId ?? "question"}`} className="p-3 text-sm">
                  <span className="font-bold">{formatQuestionId(segment.questionId)} · {segmentName(segment)}</span>
                  <span className="ml-2 text-muted-foreground">{segment.lastError ?? "The server did not give a reason."}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {data.failedSegments.length > MAX_FAILED_SHOWN ? (
            <p className="text-sm text-muted-foreground">And {data.failedSegments.length - MAX_FAILED_SHOWN} more failed segments.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** Audio progress of one saved question, listed per question text and answer option. */
export function QuestionAudioStatus({ questionId }: { questionId: string }) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: [...audioGenerationKey, "question", questionId],
    meta: { silent: true },
    queryFn: () => getQuestionAudioGeneration(questionId),
    refetchInterval: (query) => {
      const data = query.state.data;
      const active = data?.segments.some((segment) => segment.generationStatus === "Pending" || segment.generationStatus === "Processing");
      return data?.workerEnabled && active ? POLL_MS : false;
    },
  });
  const retry = useMutation({
    mutationFn: () => queueQuestionAudioGeneration(questionId),
    onSuccess: async (result) => {
      reportQueued(result);
      await queryClient.invalidateQueries({ queryKey: audioGenerationKey });
    },
    onError: reportQueueFailure,
  });
  const data = status.data;
  if (status.isPending) return <p className="text-sm text-muted-foreground">Checking the audio for this question…</p>;
  if (!data) return <p className="text-sm text-destructive">The audio status could not be loaded. Refresh this page to check again.</p>;
  return (
    <div className="space-y-2" aria-live="polite">
      {!data.workerEnabled ? <WorkerDisabled /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{data.ready} of {data.totalSegments} audio segments ready</p>
        <Button type="button" variant="outline" disabled={!data.workerEnabled || retry.isPending} onClick={() => retry.mutate()}>
          <RotateCcw aria-hidden />
          {retry.isPending ? "Queueing audio…" : "Retry audio"}
        </Button>
      </div>
      {data.segments.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.segments.map((segment) => (
            <li key={segment.optionId ?? "question"} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0">
                <span className="font-semibold">{segmentName(segment)}</span>
                {segment.generationStatus === "Failed" && segment.lastError ? <span className="mt-1 block text-xs text-muted-foreground">{segment.lastError}</span> : null}
              </span>
              <Badge variant={segment.generationStatus === "Failed" ? "destructive" : "outline"}>{statusNames[segment.generationStatus]}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

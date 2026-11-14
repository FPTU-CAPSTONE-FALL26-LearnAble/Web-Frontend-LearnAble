import { useQueries } from "@tanstack/react-query";
import { getQuestionAudioGeneration } from "@/api/lecturer";
import { audioGenerationKey } from "@/features/lecturer/questions/components/AudioGenerationStatus";

export type AudioFilter = "all" | "question" | "ready" | "waiting" | "failed" | "none";

/** What one question's audio looks like, from the Backend's per-segment state. */
export type QuestionAudio =
  | { state: "loading" }
  | { state: "unavailable" }
  | ({ state: "none" | "waiting" | "failed" | "ready" } & AudioCounts);

/** questionReady: the spoken question text itself is ready, whether or not its answers are. */
type AudioCounts = { ready: number; total: number; workerEnabled: boolean; questionReady: boolean };

type Generation = Awaited<ReturnType<typeof getQuestionAudioGeneration>>;

export function summariseAudio(data: Generation): QuestionAudio {
  const total = data.totalSegments;
  const questionReady = data.segments.some((segment) => !segment.optionId && segment.generationStatus === "Ready");
  const base = { ready: data.ready, total, workerEnabled: data.workerEnabled, questionReady };
  if (total === 0) return { state: "none", ...base };
  if (data.segments.some((segment) => segment.generationStatus === "Failed")) return { state: "failed", ...base };
  if (data.ready < total) return { state: "waiting", ...base };
  return { state: "ready", ...base };
}

/**
 * Audio state of every question on the page. The Backend cannot filter a question
 * list by audio, so each row asks for its own state and the page filters afterwards.
 */
export function useQuestionAudio(questionIds: string[], options: { priorityIds?: string[]; restEnabled?: boolean } = {}) {
  const priority = new Set(options.priorityIds ?? questionIds);
  const results = useQueries({
    queries: questionIds.map((id) => ({
      // The rows on screen ask first; the rest wait their turn so they do not queue ahead of the list.
      enabled: priority.has(id) || options.restEnabled !== false,
      queryKey: [...audioGenerationKey, "question", id],
      queryFn: () => getQuestionAudioGeneration(id),
      // A question whose audio is complete never changes, so it is not asked again.
      staleTime: (query: { state: { data?: Generation } }) => query.state.data && summariseAudio(query.state.data).state === "ready" ? Infinity : 15_000,
      // Only questions that are still being worked on keep asking; a finished one never changes again.
      refetchInterval: (query: { state: { data?: Generation } }) => {
        const data = query.state.data;
        return data && data.workerEnabled && summariseAudio(data).state !== "ready" && data.segments.some((segment) => segment.generationStatus === "Pending" || segment.generationStatus === "Processing") ? 5_000 : false;
      },
      // Dozens of rows ask at once; a failure shows as "Unknown" on its row instead of a toast each.
      meta: { silent: true },
    })),
  });
  const byId = new Map<string, QuestionAudio>();
  questionIds.forEach((id, index) => {
    const result = results[index];
    byId.set(id, result.data ? summariseAudio(result.data) : { state: result.isError ? "unavailable" : "loading" });
  });
  return byId;
}

export function matchesAudioFilter(audio: QuestionAudio | undefined, filter: AudioFilter) {
  if (filter === "all") return true;
  if (filter === "question") return audio !== undefined && "questionReady" in audio && audio.questionReady;
  return audio?.state === filter;
}

export const audioFilterLabels: Record<AudioFilter, string> = {
  all: "All audio",
  question: "Has question audio",
  ready: "All audio ready",
  waiting: "Audio in progress",
  failed: "Audio failed",
  none: "No audio",
};

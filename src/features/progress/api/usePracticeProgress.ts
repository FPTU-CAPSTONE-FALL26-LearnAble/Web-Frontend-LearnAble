import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getPracticeResult,
  listMyPracticeSessions,
  type PracticeResult,
} from "@/api/studentPractice";
import { summariseProgress } from "@/features/progress/progressSummary";

/** The same cache entries the practice screens use, so neither fetches twice. */
const sessionsKey = ["me", "practice-sessions"] as const;
const resultKey = (sessionId: string) => ["me", "practice-sessions", sessionId, "result"] as const;

/**
 * Progress from the practice sessions and the result of each released one.
 * A result that cannot be read is left out and counted, so the page can say
 * the summary is incomplete instead of silently showing less.
 */
export function usePracticeProgress() {
  const sessions = useQuery({ queryKey: sessionsKey, queryFn: listMyPracticeSessions });
  const released = useMemo(
    () => (sessions.data ?? []).filter((session) => session.releasedAt),
    [sessions.data],
  );
  const results = useQueries({
    queries: released.map((session) => ({
      queryKey: resultKey(session.sessionId),
      queryFn: () => getPracticeResult(session.sessionId),
      retry: false,
      meta: { silent: true },
    })),
    // Combined once per change of the underlying queries, so `data` stays stable between renders.
    combine: (queries) => ({
      data: queries.map((query) => query.data),
      pending: queries.some((query) => query.isPending),
      failed: queries.filter((query) => query.isError).length,
    }),
  });

  const summary = useMemo(() => {
    if (!sessions.data) return null;
    const byId = new Map<string, PracticeResult>();
    released.forEach((session, index) => {
      const data = results.data[index];
      if (data) byId.set(session.sessionId, data);
    });
    return summariseProgress(sessions.data, byId);
  }, [sessions.data, released, results.data]);

  return {
    summary,
    isPending: sessions.isPending || results.pending,
    error: sessions.error,
    refetch: sessions.refetch,
    failedResults: results.failed,
  };
}

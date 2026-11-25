import { useQuery } from "@tanstack/react-query";
import {
  getPracticeResult,
  listMyPracticeSessions,
  startPracticeAttempt,
} from "@/api/studentPractice";

export const practiceKeys = {
  sessions: ["me", "practice-sessions"] as const,
  attempt: (sessionId: string) => ["me", "practice-sessions", sessionId, "attempt"] as const,
  result: (sessionId: string) => ["me", "practice-sessions", sessionId, "result"] as const,
};

export function useMyPracticeSessions() {
  return useQuery({ queryKey: practiceKeys.sessions, queryFn: listMyPracticeSessions });
}

/**
 * Starts the attempt, or resumes the one already started: the Backend returns
 * the existing attempt for a repeated start. It is read once per visit and
 * never refetched behind the student's back, because the screen owns the
 * answers from then on.
 */
export function usePracticeAttempt(sessionId: string) {
  return useQuery({
    queryKey: practiceKeys.attempt(sessionId),
    queryFn: () => startPracticeAttempt(sessionId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // A refused start is explained on the page itself.
    meta: { silent: true },
  });
}

export function usePracticeResult(sessionId: string) {
  return useQuery({
    queryKey: practiceKeys.result(sessionId),
    queryFn: () => getPracticeResult(sessionId),
    retry: false,
    // Before release the Backend refuses; the page explains that itself, so no global error toast.
    meta: { silent: true },
  });
}

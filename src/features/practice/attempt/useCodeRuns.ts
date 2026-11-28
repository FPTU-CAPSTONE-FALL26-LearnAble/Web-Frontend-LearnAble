import { useCallback, useEffect, useMemo, useRef } from "react";
import type { StudentQuestion } from "@/api/assessmentAttempt";
import type { CodeRunResult } from "@/shared/ui/patterns/exam/assessment-player-types";
import { runSavedPracticeCode } from "./codeRun";
import { isSupportedCoding } from "./playerMapping";

/**
 * Run pressed with no program saved for the question: nothing typed beyond
 * the starter code, a cleared program, or a save that failed. Starter code is
 * never saved (see `useAttemptAnswers`), so there is nothing to run.
 */
export class CodeNotSaved extends Error {
  constructor(public readonly questionId: string) {
    super("code-run:not-saved");
    this.name = "CodeNotSaved";
  }
}

/**
 * The player's `onRunCode` for a practice attempt. The Backend runs the saved
 * program, not the code on screen, so a run first waits for the save
 * (`savedRevision`) and then runs that revision against the question's public
 * examples. Runs still going when the attempt closes are abandoned.
 */
export function useCodeRuns({
  sessionId,
  attemptId,
  questions,
  savedRevision,
}: {
  sessionId: string;
  attemptId: string;
  questions: StudentQuestion[];
  savedRevision: (questionId: string) => Promise<number | null>;
}) {
  const examples = useMemo(
    () =>
      new Map(
        questions.flatMap((question) =>
          isSupportedCoding(question) ? [[question.attemptQuestionId, question.coding.examples] as const] : [],
        ),
      ),
    [questions],
  );

  const running = useRef(new Set<AbortController>());
  useEffect(() => {
    const controllers = running.current;
    return () => controllers.forEach((controller) => controller.abort());
  }, []);

  return useCallback(
    async (questionId: string): Promise<CodeRunResult> => {
      const samples = examples.get(questionId);
      if (!samples) throw new CodeNotSaved(questionId);
      const revision = await savedRevision(questionId);
      if (revision === null) throw new CodeNotSaved(questionId);
      const controller = new AbortController();
      running.current.add(controller);
      try {
        return await runSavedPracticeCode({ sessionId, attemptId, questionId }, revision, samples, {
          signal: controller.signal,
        });
      } finally {
        running.current.delete(controller);
      }
    },
    [examples, savedRevision, sessionId, attemptId],
  );
}

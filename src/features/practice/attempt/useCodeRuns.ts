import { useCallback, useEffect, useMemo, useRef } from "react";
import type { StudentQuestion } from "@/api/assessmentAttempt";
import { CodeRunFailed } from "@/api/studentCoding";
import { vi } from "@/shared/strings/vi";
import { CodeRunFailure, type CodeRunResult } from "@/shared/ui/patterns/exam/assessment-player-types";
import { runSavedPracticeCode } from "./codeRun";
import { isSupportedCoding } from "./playerMapping";

/**
 * The player's `onRunCode` for a practice attempt. The Backend runs the saved
 * program, not the code on screen, so a run first saves the editor's program
 * (untouched starter code too, as on the desktop) and then runs the revision
 * the Backend accepted against the question's public examples. Runs still
 * going when the attempt closes are abandoned.
 *
 * Two failures have a reason the student can act on, thrown as
 * `CodeRunFailure` so the player shows it instead of "couldn't run":
 * - the editor is empty, so nothing is sent;
 * - the Backend refused the run, for example at the run limit, in its words.
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
  savedRevision: (questionId: string, code: string) => Promise<number | null>;
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
    async (questionId: string, code: string): Promise<CodeRunResult> => {
      const samples = examples.get(questionId);
      // The player offers Run only on questions it edits, which are all here.
      if (!samples) throw new Error(`code-run:not-a-C-question:${questionId}`);
      const revision = await savedRevision(questionId, code);
      if (revision === null) throw new CodeRunFailure(vi.exam.coding.runNothingSaved);
      const controller = new AbortController();
      running.current.add(controller);
      try {
        return await runSavedPracticeCode({ sessionId, attemptId, questionId }, revision, samples, {
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof CodeRunFailed && error.reason === "refused" && error.serverMessage) {
          throw new CodeRunFailure(error.serverMessage);
        }
        throw error;
      } finally {
        running.current.delete(controller);
      }
    },
    [examples, savedRevision, sessionId, attemptId],
  );
}

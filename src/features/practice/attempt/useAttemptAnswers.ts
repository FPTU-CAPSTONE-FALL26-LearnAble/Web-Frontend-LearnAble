import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  newOperationId,
  type AnswerOperation,
  type SaveAnswerResult,
  type StoredAnswer,
  type StudentQuestion,
} from "@/api/assessmentAttempt";
import type { SaveState } from "@/shared/ui/patterns/exam/SaveStatus";
import type { Answer, Answers } from "@/shared/ui/patterns/exam/assessment-player-types";
import { isSupportedCoding, storedLanguages, toAnswerPayload, toPlayerAnswers } from "./playerMapping";

/**
 * Essay typing is saved once the student pauses; a choice is saved at once.
 * A program is saved at once too: the coding workspace already waits for a
 * pause before it reports the code.
 */
const TYPING_PAUSE_MS = 800;

/** An empty program for a question with no saved program: there is nothing to clear, so nothing is sent. */
const nothingToClear = (operation: AnswerOperation, programs: Record<string, string>) =>
  operation.answer.kind === "Coding" && !operation.answer.sourceCode && !programs[operation.attemptQuestionId];

/** The program each stored Coding answer holds, by attempt question id. */
const storedPrograms = (stored: StoredAnswer[]) =>
  Object.fromEntries(
    stored.flatMap(({ attemptQuestionId, answer }) =>
      answer.kind === "Coding" ? [[attemptQuestionId, answer.sourceCode ?? ""]] : [],
    ),
  );

/**
 * The answers of one attempt and their saving, as an exam attempt saves them:
 * every change is an operation with its own id and the revision it was made
 * on. Saves of one question never overlap, so revisions arrive in order; a
 * failed save stays pending and goes with the next change or with the submit.
 *
 * A Coding question's answer is its program. Editing back to the starter code
 * or to nothing clears a saved program, and sends nothing when none was saved.
 * A run saves the editor's program (the starter too) and gets its revision
 * from `savedRevision`.
 */
export function useAttemptAnswers({
  questions,
  stored,
  save,
}: {
  questions: StudentQuestion[];
  stored: StoredAnswer[];
  save: (operation: AnswerOperation) => Promise<SaveAnswerResult>;
}) {
  const [answers, setAnswers] = useState<Answers>(() => toPlayerAnswers(stored));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveFailed, setSaveFailed] = useState(false);

  const byId = useMemo(
    () => new Map(questions.map((question) => [question.attemptQuestionId, question])),
    [questions],
  );
  const latest = useRef<Answers>(answers);
  const revisions = useRef<Record<string, number>>(
    Object.fromEntries(stored.map((answer) => [answer.attemptQuestionId, answer.revision])),
  );
  /** The runtime each program was last saved in. */
  const languages = useRef<Record<string, string>>(storedLanguages(stored));
  /** The program the Backend holds for each Coding question; "" once cleared. */
  const programs = useRef<Record<string, string>>(storedPrograms(stored));
  /** Changed on screen, not yet confirmed by the Backend. */
  const pending = useRef(new Set<string>());
  /** Whose last save the Backend refused or never received. */
  const failed = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<string, Promise<void>>());
  const inFlight = useRef(0);

  useEffect(() => {
    const scheduled = timers.current;
    return () => scheduled.forEach((timer) => clearTimeout(timer));
  }, []);

  const operationFor = useCallback(
    (questionId: string): AnswerOperation | null => {
      const question = byId.get(questionId);
      if (!question) return null;
      const baseRevision = revisions.current[questionId] ?? 0;
      return {
        operationId: newOperationId(),
        attemptQuestionId: questionId,
        baseRevision,
        revision: baseRevision + 1,
        answer: toAnswerPayload(question, latest.current[questionId], languages.current[questionId]),
      };
    },
    [byId],
  );

  /** Sends one operation and records what the Backend accepted. Runs inside the question's save chain. */
  const send = useCallback(
    async (questionId: string, operation: AnswerOperation) => {
      inFlight.current += 1;
      setSaveState("saving");
      try {
        const result = await save(operation);
        revisions.current[questionId] = result.acceptedRevision;
        if (operation.answer.kind === "Coding") {
          programs.current[questionId] = operation.answer.sourceCode ?? "";
          if (operation.answer.languageCode) languages.current[questionId] = operation.answer.languageCode;
        }
        failed.current.delete(questionId);
        return true;
      } catch {
        failed.current.add(questionId);
        return false;
      } finally {
        inFlight.current -= 1;
        setSaveFailed(failed.current.size > 0);
        if (inFlight.current === 0) {
          const offline = typeof navigator !== "undefined" && !navigator.onLine;
          setSaveState(failed.current.size > 0 ? (offline ? "offline" : "error") : "saved");
        }
      }
    },
    [save],
  );

  /** Queues work after this question's earlier saves, so its revisions arrive in order. */
  const queue = useCallback(<T,>(questionId: string, work: () => Promise<T>) => {
    const previous = chains.current.get(questionId) ?? Promise.resolve();
    const next = previous.then(work);
    chains.current.set(
      questionId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }, []);

  const flush = useCallback(
    (questionId: string) => {
      timers.current.delete(questionId);
      return queue(questionId, async () => {
        if (!pending.current.has(questionId)) return;
        const operation = operationFor(questionId);
        if (!operation) return;
        pending.current.delete(questionId);
        if (nothingToClear(operation, programs.current)) {
          failed.current.delete(questionId);
          setSaveFailed(failed.current.size > 0);
          if (inFlight.current === 0 && failed.current.size === 0) setSaveState("saved");
          return;
        }
        if (!(await send(questionId, operation))) pending.current.add(questionId);
      });
    },
    [operationFor, queue, send],
  );

  const change = useCallback(
    (questionId: string, value: Answer) => {
      const question = byId.get(questionId);
      // A Coding question the web editor cannot edit (not C) is never answered here.
      if (!question || (question.questionType === "Coding" && !isSupportedCoding(question))) return;
      latest.current = { ...latest.current, [questionId]: value };
      setAnswers(latest.current);
      pending.current.add(questionId);
      setSaveState("saving");
      clearTimeout(timers.current.get(questionId));
      if (question.questionType === "Essay") {
        timers.current.set(questionId, setTimeout(() => void flush(questionId), TYPING_PAUSE_MS));
      } else {
        void flush(questionId);
      }
    },
    [byId, flush],
  );

  /**
   * Waits for saves in flight, then returns every answer the Backend has not
   * confirmed, as the final answers of a submit.
   */
  const finalAnswers = useCallback(async (): Promise<AnswerOperation[]> => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    await Promise.all(chains.current.values());
    return [...pending.current]
      .map(operationFor)
      .filter(
        (operation): operation is AnswerOperation =>
          operation !== null && !nothingToClear(operation, programs.current),
      );
  }, [operationFor]);

  /**
   * Saves `code`, the program in the editor, for a run and returns the
   * revision the Backend accepted it at; a run tests that saved revision. As
   * on the desktop, untouched starter code is saved too, so a student can run
   * it before changing anything (editing back to the starter still clears a
   * saved program). A program the Backend already holds is not sent again.
   * `null` when the editor is empty; throws when the save fails.
   */
  const savedRevision = useCallback(
    async (questionId: string, code: string): Promise<number | null> => {
      clearTimeout(timers.current.get(questionId));
      await flush(questionId);
      if (!code.trim()) return null;
      const question = byId.get(questionId);
      if (!question?.coding) return null;
      return queue(questionId, async () => {
        const revision = revisions.current[questionId];
        if (programs.current[questionId] === code && revision !== undefined) return revision;
        const baseRevision = revision ?? 0;
        const operation: AnswerOperation = {
          operationId: newOperationId(),
          attemptQuestionId: questionId,
          baseRevision,
          revision: baseRevision + 1,
          answer: {
            kind: "Coding",
            sourceCode: code,
            languageCode: languages.current[questionId] ?? question.coding?.languageCode ?? "",
          },
        };
        if (!(await send(questionId, operation))) throw new Error("code-run:save-failed");
        // The Backend now holds what is on screen (the starter reads as no answer), so an
        // older change waiting to be sent is dropped; one typed since stays queued.
        const shown = latest.current[questionId];
        if (shown === undefined || shown === code) pending.current.delete(questionId);
        return revisions.current[questionId];
      });
    },
    [byId, flush, queue, send],
  );

  return { answers, change, saveState, saveFailed, finalAnswers, savedRevision };
}

/**
 * Time left until `deadlineAt` by the Backend's clock: the offset between
 * `serverNow` and this device is measured once, so a wrong device clock does
 * not change the deadline.
 */
export function useRemainingSeconds(deadlineAt: string, serverNow: string) {
  const offset = useMemo(() => Date.parse(serverNow) - Date.now(), [serverNow]);
  const remaining = useCallback(
    () => Math.max(0, Math.floor((Date.parse(deadlineAt) - (Date.now() + offset)) / 1000)),
    [deadlineAt, offset],
  );
  const [seconds, setSeconds] = useState(remaining);
  useEffect(() => {
    setSeconds(remaining());
    const timer = setInterval(() => setSeconds(remaining()), 1000);
    return () => clearInterval(timer);
  }, [remaining]);
  return seconds;
}

export function formatRemaining(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

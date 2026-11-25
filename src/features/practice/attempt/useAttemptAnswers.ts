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
import { toAnswerPayload, toPlayerAnswers } from "./playerMapping";

/** Typing is saved once the student pauses; a choice is saved at once. */
const TYPING_PAUSE_MS = 800;

/**
 * The answers of one attempt and their saving, as an exam attempt saves them:
 * every change is an operation with its own id and the revision it was made
 * on. Saves of one question never overlap, so revisions arrive in order; a
 * failed save stays pending and goes with the next change or with the submit.
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
        answer: toAnswerPayload(question, latest.current[questionId]),
      };
    },
    [byId],
  );

  const flush = useCallback(
    (questionId: string) => {
      timers.current.delete(questionId);
      const previous = chains.current.get(questionId) ?? Promise.resolve();
      const next = previous.then(async () => {
        if (!pending.current.has(questionId)) return;
        const operation = operationFor(questionId);
        if (!operation) return;
        pending.current.delete(questionId);
        inFlight.current += 1;
        setSaveState("saving");
        try {
          const result = await save(operation);
          revisions.current[questionId] = result.acceptedRevision;
          failed.current.delete(questionId);
        } catch {
          pending.current.add(questionId);
          failed.current.add(questionId);
        } finally {
          inFlight.current -= 1;
          setSaveFailed(failed.current.size > 0);
          if (inFlight.current === 0) {
            const offline = typeof navigator !== "undefined" && !navigator.onLine;
            setSaveState(failed.current.size > 0 ? (offline ? "offline" : "error") : "saved");
          }
        }
      });
      chains.current.set(questionId, next);
      return next;
    },
    [operationFor, save],
  );

  const change = useCallback(
    (questionId: string, value: Answer) => {
      const question = byId.get(questionId);
      if (!question || question.questionType === "Coding") return;
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
      .filter((operation): operation is AnswerOperation => operation !== null);
  }, [operationFor]);

  return { answers, change, saveState, saveFailed, finalAnswers };
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

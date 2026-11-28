import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@/app/providers";
import {
  savePracticeAnswer,
  submitPracticeAttempt,
  type PracticeAttempt,
  type PracticeSession,
} from "@/api/studentPractice";
import { practiceKeys, usePracticeAttempt } from "@/features/practice/api/usePracticeSessions";
import { isSupportedCoding, toPlayerQuestions } from "@/features/practice/attempt/playerMapping";
import { useCodeRuns } from "@/features/practice/attempt/useCodeRuns";
import {
  formatRemaining,
  useAttemptAnswers,
  useRemainingSeconds,
} from "@/features/practice/attempt/useAttemptAnswers";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { AssessmentPlayer } from "@/shared/ui/patterns/exam/AssessmentPlayer";
import { SaveStatus } from "@/shared/ui/patterns/exam/SaveStatus";
import type { PlayerNavigation } from "@/shared/ui/patterns/exam/assessment-player-types";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";

const t = vi.practice;

/**
 * SCR-04 (attempt) — FR-07. A practice attempt runs in the same full-window
 * `AssessmentPlayer` as an exam and talks to the Backend the same way: the
 * attempt is started (or resumed) on arrival, every answer is saved as the
 * student goes, and the submit carries any answer not yet confirmed.
 */
/** Who is taking the attempt, as the player's top bar shows it. */
export type Candidate = { id: string; name: string };

export function PracticeAttemptRoute({ candidate = { id: "", name: "" } }: { candidate?: Candidate }) {
  const { sessionId = "" } = useParams<"sessionId">();
  const attempt = usePracticeAttempt(sessionId);
  useRouteAnnouncer(vi.exam.pageTitle(t.title), t.title);

  if (attempt.isPending) {
    return (
      <main id="main" className="p-8 text-xl">
        <p role="status">{t.loadingAttempt}</p>
      </main>
    );
  }
  if (attempt.isError) {
    return (
      <main id="main" className="mx-auto flex max-w-3xl flex-col items-start gap-6 p-8 text-lg">
        <h1 tabIndex={-1} className="text-4xl font-extrabold">{t.attemptFailed}</h1>
        <p role="alert">{describeError(attempt.error)}</p>
        <Link
          to="/practice"
          className="inline-flex min-h-14 items-center rounded-md border-4 border-foreground px-6 text-xl font-extrabold underline-offset-4 hover:underline"
        >
          {t.backToList}
        </Link>
      </main>
    );
  }
  if (attempt.data.submittedAt || attempt.data.status === "Submitted") {
    return <Navigate to={`/practice/${encodeURIComponent(sessionId)}/result`} replace />;
  }
  return <LiveAttempt sessionId={sessionId} attempt={attempt.data} candidate={candidate} />;
}

/** Remembers where the student was and what they flagged, for a reload of the same attempt. */
function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Without storage a reload simply starts from the contents.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

function LiveAttempt({
  sessionId,
  attempt,
  candidate,
}: {
  sessionId: string;
  attempt: PracticeAttempt;
  candidate: Candidate;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The attempt carries no name; the session list the student came from does.
  const sessionName =
    queryClient
      .getQueryData<PracticeSession[]>(practiceKeys.sessions)
      ?.find((session) => session.sessionId === sessionId)
      ?.name?.trim() || t.untitled;
  const questions = useMemo(() => toPlayerQuestions(attempt.questions), [attempt.questions]);
  const byId = useMemo(
    () => new Map(attempt.questions.map((q) => [q.attemptQuestionId, q])),
    [attempt.questions],
  );
  const { answers, change, saveState, saveFailed, finalAnswers, savedRevision } = useAttemptAnswers({
    questions: attempt.questions,
    stored: attempt.answers,
    save: (operation) => savePracticeAnswer(sessionId, operation),
  });
  const runCode = useCodeRuns({
    sessionId,
    attemptId: attempt.attemptId,
    questions: attempt.questions,
    savedRevision,
  });

  const storageKey = `learnable.practice.${attempt.attemptId}`;
  const [navigation, setNavigation] = useSessionState<PlayerNavigation>(`${storageKey}.position`, {
    questionId: null,
    view: "contents",
    filter: "all",
  });
  const [flagged, setFlagged] = useSessionState<string[]>(`${storageKey}.flags`, []);
  const [showTimer, setShowTimer] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const seconds = useRemainingSeconds(attempt.deadlineAt, attempt.serverNow);
  const timeUp = seconds === 0;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPracticeAttempt(sessionId, await finalAnswers());
      announce(t.submitted);
      try {
        sessionStorage.removeItem(`${storageKey}.position`);
        sessionStorage.removeItem(`${storageKey}.flags`);
      } catch {
        // Nothing to clean up without storage.
      }
      await queryClient.invalidateQueries({ queryKey: practiceKeys.sessions });
      queryClient.removeQueries({ queryKey: practiceKeys.attempt(sessionId) });
      navigate(`/practice/${encodeURIComponent(sessionId)}/result`, { replace: true });
    } catch (error) {
      setSubmitError(`${t.submitFailed} ${describeError(error)}`);
      setSubmitting(false);
    }
  };

  // When the time runs out the attempt is handed in with what is on screen.
  const submittedAtDeadline = useRef(false);
  useEffect(() => {
    if (!timeUp || submittedAtDeadline.current) return;
    submittedAtDeadline.current = true;
    setConfirming(false);
    announce(t.timeUp);
    void submit();
    // `submit` reads the latest answers through refs; running once at the deadline is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const current = navigation.view === "question" && navigation.questionId ? byId.get(navigation.questionId) : undefined;
  // A coding question the web editor cannot edit (not C) is shown but not answerable.
  const unsupportedCoding = current?.questionType === "Coding" && !isSupportedCoding(current);
  const answered = questions.filter((q) => {
    const value = answers[q.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  const feedback = submitError ? (
    <p role="alert" className="mx-2 mb-2 rounded border-2 border-destructive px-4 py-3 font-semibold text-destructive">
      {submitError}
    </p>
  ) : timeUp ? (
    <p role="alert" className="mx-2 mb-2 rounded border-2 border-foreground px-4 py-3 font-semibold">
      {t.timeUp}
    </p>
  ) : saveFailed ? (
    <p role="alert" className="mx-2 mb-2 rounded border-2 border-destructive px-4 py-3 font-semibold text-destructive">
      {t.saveFailed}
    </p>
  ) : unsupportedCoding ? (
    <p className="mx-2 mb-2 rounded border-2 border-foreground px-4 py-3 font-semibold">{t.codingUnsupported}</p>
  ) : null;

  return (
    <>
      <AssessmentPlayer
        title={sessionName}
        candidate={candidate}
        questions={questions}
        answers={answers}
        flagged={flagged}
        onAnswerChange={change}
        onToggleFlag={(questionId) =>
          setFlagged((items) =>
            items.includes(questionId) ? items.filter((id) => id !== questionId) : [...items, questionId],
          )
        }
        navigation={navigation}
        onNavigationChange={setNavigation}
        timer={showTimer ? <span aria-live="off">{t.remaining(formatRemaining(seconds))}</span> : undefined}
        saveStatus={<SaveStatus state={saveState} />}
        interactionLocked={submitting || timeUp}
        enabledSettings={["remainingTime"]}
        onSelectSetting={(setting) => {
          if (setting === "remainingTime") setShowTimer((shown) => !shown);
        }}
        onGoToSubmission={() => setConfirming(true)}
        onRunCode={runCode}
        feedback={feedback}
        focusOnMount
      />
      <Dialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.submitTitle}</DialogTitle>
            <DialogDescription>{t.submitBody(answered, questions.length)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="xl" onClick={() => setConfirming(false)} disabled={submitting}>
              {t.keepWorking}
            </Button>
            <Button size="xl" onClick={() => void submit()} disabled={submitting}>
              {submitting ? t.submitting : t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

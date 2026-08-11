import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ExamShell } from "@/shared/ui/patterns/ExamShell";
import { QuestionCard } from "@/shared/ui/patterns/QuestionCard";
import { AnswerOptionList } from "@/shared/ui/patterns/AnswerOptionList";
import { Button } from "@/shared/ui/primitives/Button";
import { Card, CardTitle } from "@/shared/ui/primitives/Card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/shared/ui/primitives/Dialog";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { usePracticeSet } from "@/features/practice/api/usePracticeSets";
import type { PracticeSet } from "@/api/practice";

/**
 * SCR-04 (làm bài) — FR-07: cùng ExamShell với SCR-03 bên desktop.
 * Khác biệt là props: không timer, không proctoring, không auto-save server
 * (chấm cục bộ trong lúc chờ quyết định §11 mục 3).
 */
export function PracticeAttemptRoute() {
  const { setId } = useParams<"setId">();
  const setQuery = usePracticeSet(setId!);

  useRouteAnnouncer(
    vi.exam.pageTitle(setQuery.data?.title ?? vi.practice.title),
    setQuery.data?.title ?? vi.practice.title,
  );

  if (setQuery.isPending) {
    return (
      <main id="main" className="p-6">
        <p>{vi.common.loading}</p>
      </main>
    );
  }
  if (setQuery.isError || !setQuery.data) {
    return (
      <main id="main" className="flex flex-col items-start gap-4 p-6">
        <p role="alert">{vi.errors.notFound}</p>
        <Button asChild variant="secondary">
          <Link to="/luyen-tap">{vi.practice.backToList}</Link>
        </Button>
      </main>
    );
  }
  return <PracticeAttempt set={setQuery.data} />;
}

function PracticeAttempt({ set }: { set: PracticeSet }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const questions = set.questions;
  const question = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const navState = useMemo(
    () =>
      questions.map((q) => ({
        id: q.id,
        answered: q.id in answers,
        flagged: Boolean(flags[q.id]),
      })),
    [questions, answers, flags],
  );

  if (finished) {
    return <PracticeResult set={set} answers={answers} onRetry={() => {
      setAnswers({});
      setFlags({});
      setCurrentIndex(0);
      setFinished(false);
    }} />;
  }

  return (
    <ExamShell
      title={set.title}
      questions={navState}
      currentIndex={currentIndex}
      onNavigate={setCurrentIndex}
      submitAction={
        <Dialog>
          <DialogTrigger asChild>
            <Button>{vi.practice.finish}</Button>
          </DialogTrigger>
          <DialogContent
            title={vi.exam.submitConfirmTitle}
            description={vi.exam.submitConfirmBody(answeredCount, questions.length)}
          >
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setFinished(true)}>{vi.practice.finish}</Button>
              <DialogClose asChild>
                <Button variant="secondary">{vi.exam.submitConfirmNo}</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <QuestionCard
        index={currentIndex + 1}
        total={questions.length}
        stem={question.stem}
        stemLang={question.stemLang}
        flagged={Boolean(flags[question.id])}
        onToggleFlag={() =>
          setFlags((f) => ({ ...f, [question.id]: !f[question.id] }))
        }
      >
        <AnswerOptionList
          options={question.options}
          value={answers[question.id] ?? null}
          onChange={(optionId) =>
            setAnswers((a) => ({ ...a, [question.id]: optionId }))
          }
        />
      </QuestionCard>
    </ExamShell>
  );
}

/** SCR-06 (một phần) — kết quả lượt luyện tập, chấm cục bộ kèm giải thích */
function PracticeResult({
  set,
  answers,
  onRetry,
}: {
  set: PracticeSet;
  answers: Record<string, string>;
  onRetry: () => void;
}) {
  useRouteAnnouncer(
    vi.exam.pageTitle(vi.practice.resultTitle),
    vi.practice.resultTitle,
  );
  const correctCount = set.questions.filter(
    (q) => answers[q.id] === q.correctOptionId,
  ).length;

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
        {vi.practice.resultTitle}
      </h1>
      <p className="text-[length:var(--text-xl)] font-bold">
        {vi.practice.score(correctCount, set.questions.length)}
      </p>

      <ol className="flex flex-col gap-4">
        {set.questions.map((q, i) => {
          const chosen = q.options.find((o) => o.id === answers[q.id]);
          const correct = q.options.find((o) => o.id === q.correctOptionId)!;
          const isCorrect = chosen?.id === correct.id;
          return (
            <li key={q.id}>
              <Card className="flex flex-col gap-3">
                <CardTitle>
                  {vi.exam.question(i + 1, set.questions.length)} —{" "}
                  <span className={isCorrect ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}>
                    {isCorrect ? vi.practice.correct : vi.practice.incorrect}
                  </span>
                </CardTitle>
                <p lang={q.stemLang}>{q.stem}</p>
                <p>
                  <strong>{vi.practice.yourAnswer}:</strong>{" "}
                  {chosen ? `${chosen.letter}. ${chosen.text}` : vi.exam.unanswered}
                </p>
                {!isCorrect ? (
                  <p>
                    <strong>{vi.practice.correctAnswer}:</strong> {correct.letter}. {correct.text}
                  </p>
                ) : null}
                <p className="text-[var(--color-text-muted)]">
                  <strong>{vi.practice.explanation}:</strong> {q.explanation}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetry}>{vi.practice.tryAgain}</Button>
        <Button asChild variant="secondary">
          <Link to="/luyen-tap">{vi.practice.backToList}</Link>
        </Button>
      </div>
    </main>
  );
}

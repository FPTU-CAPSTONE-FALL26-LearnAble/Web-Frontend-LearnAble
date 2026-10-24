import { useMemo, useState } from "react";
import { Tabs, TabsContent } from "@/shared/ui/primitives/tabs";
import {
  answerState,
  type Answer,
  type Answers,
  type PlayerFilter,
  type PlayerQuestion as PlayerQuestionData,
  type PlayerView,
} from "./assessment-player-types";
import { AssessmentPlayerFooter } from "./AssessmentPlayerFooter";
import { AssessmentPlayerHeader } from "./AssessmentPlayerHeader";
import {
  AssessmentPlayerOptions,
  type PlayerSetting,
} from "./AssessmentPlayerOptions";
import { PlayerQuestion } from "./PlayerQuestion";
import { QuestionContentsTable } from "./QuestionContentsTable";

export interface AssessmentPlayerProps {
  /** Assessment name shown above the contents table. */
  title: string;
  candidate: { id: string; name: string };
  questions: PlayerQuestionData[];
  answers: Answers;
  flagged: string[];
  onAnswerChange: (questionId: string, value: Answer) => void;
  onToggleFlag: (questionId: string) => void;
  /** Clears answers and flags; the player then opens the first question. */
  onStartOver: () => void;
  selectedSetting?: PlayerSetting;
  onGoToSubmission?: () => void;
  onSelectSetting?: (setting: PlayerSetting) => void;
}

const filters: PlayerFilter[] = ["all", "unanswered", "flagged"];

/**
 * Full-window assessment player: contents, one question at a time, and review.
 * Answers and flags are controlled so the host can persist them.
 */
export function AssessmentPlayer({
  title,
  candidate,
  questions,
  answers,
  flagged,
  onAnswerChange,
  onToggleFlag,
  onStartOver,
  selectedSetting,
  onGoToSubmission,
  onSelectSetting,
}: AssessmentPlayerProps) {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<PlayerView>("contents");
  const [filter, setFilter] = useState<PlayerFilter>("all");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const current = questions[index];
  const answeredCount = questions.filter((question) =>
    answerState(answers[question.id]),
  ).length;
  const visibleQuestions = useMemo(
    () =>
      questions.filter((question) =>
        filter === "all"
          ? true
          : filter === "unanswered"
            ? !answerState(answers[question.id])
            : flagged.includes(question.id),
      ),
    [answers, filter, flagged, questions],
  );

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setView("question");
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-secondary text-foreground antialiased">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as PlayerFilter)}
        className="min-h-0 flex-1 gap-0"
      >
        <AssessmentPlayerHeader
          title={title}
          candidate={candidate}
          answeredCount={answeredCount}
          flaggedCount={flagged.length}
          questionCount={questions.length}
          view={view}
          optionsOpen={optionsOpen}
          onOpenOptions={() => setOptionsOpen((open) => !open)}
          onStartOver={() => {
            onStartOver();
            goTo(0);
          }}
        />

        <AssessmentPlayerOptions
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          selectedSetting={selectedSetting}
          onGoToSubmission={onGoToSubmission}
          onSelectSetting={onSelectSetting}
        />

        <main className="min-h-0 w-full flex-1 overflow-y-scroll py-4 pl-4">
          <div className="w-full mx-auto max-w-4xl flex-1">
            {view === "question" && current ? (
              <PlayerQuestion
                question={current}
                questionNumber={index + 1}
                questionCount={questions.length}
                answer={answers[current.id]}
                flagged={flagged.includes(current.id)}
                onAnswerChange={(value) => onAnswerChange(current.id, value)}
                onReset={() => onAnswerChange(current.id, undefined)}
                onToggleFlag={() => onToggleFlag(current.id)}
                className="mx-auto max-w-4xl"
              />
            ) : (
              <section
                aria-labelledby={
                  view === "review" ? "review-heading" : "contents-heading"
                }
              >
                {filters.map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-8">
                    <QuestionContentsTable
                      questions={questions}
                      visibleQuestions={visibleQuestions}
                      answers={answers}
                      flagged={flagged}
                      showFlagColumn={view === "contents"}
                      onOpenQuestion={goTo}
                    />
                  </TabsContent>
                ))}
              </section>
            )}
          </div>
        </main>
      </Tabs>

      <AssessmentPlayerFooter
        answers={answers}
        currentIndex={index}
        flagged={flagged}
        questions={questions}
        view={view}
        onGoTo={goTo}
        onViewChange={setView}
      />
    </div>
  );
}

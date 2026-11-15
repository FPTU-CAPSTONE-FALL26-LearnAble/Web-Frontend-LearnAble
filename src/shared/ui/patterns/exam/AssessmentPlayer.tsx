import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Tabs, TabsContent } from "@/shared/ui/primitives/tabs";
import { vi } from "@/shared/strings/vi";
import {
  answerState,
  type Answer,
  type Answers,
  type PlayerFilter,
  type PlayerQuestion as PlayerQuestionData,
  type PlayerView,
} from "./assessment-player-types";
import { AssessmentPlayerFooter } from "./AssessmentPlayerFooter";
import { AssessmentPlayerOverview } from "./AssessmentPlayerOverview";
import {
  AssessmentPlayerOptions,
  type ContrastOption,
  type PlayerSetting,
  type TextScaleOption,
} from "./AssessmentPlayerOptions";
import { AssessmentPlayerShell } from "./AssessmentPlayerShell";
import { PlayerQuestion } from "./PlayerQuestion";
import { QuestionContentsTable } from "./QuestionContentsTable";

export interface AssessmentPlayerProps {
  /** Assessment name shown above the contents table. */
  title: string;
  candidate: { id: string; name: string };
  /** Optional course/exam code displayed in the top bar. */
  examCode?: string;
  /** Optional remaining time string displayed centered in the top bar. */
  remainingTime?: string;
  questions: PlayerQuestionData[];
  answers: Answers;
  flagged: string[];
  onAnswerChange: (questionId: string, value: Answer) => void;
  onToggleFlag: (questionId: string) => void;
  /** Clears answers and flags; kept optional for host compatibility. */
  onStartOver?: () => void;
  selectedSetting?: PlayerSetting;
  contrast?: ContrastOption;
  onContrastChange?: (contrast: ContrastOption) => void;
  textScale?: TextScaleOption;
  onTextScaleChange?: (textScale: TextScaleOption) => void;
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
  examCode,
  remainingTime,
  questions,
  answers,
  flagged,
  onAnswerChange,
  onToggleFlag,
  selectedSetting,
  contrast,
  onContrastChange,
  textScale,
  onTextScaleChange,
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
    <Tabs
      value={filter}
      onValueChange={(value) => setFilter(value as PlayerFilter)}
      className="gap-0"
    >
      <AssessmentPlayerShell
        candidate={candidate}
        status={vi.exam.player.connected}
        meta={examCode}
        center={remainingTime}
        trailing={
          <Button
            variant="outline"
            size="xl"
            className="rounded"
            aria-label={vi.exam.player.openOptions}
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            <Menu aria-hidden className="size-[calc(1.25rem*var(--text-scale))]" />
            <span>{vi.exam.player.options}</span>
          </Button>
        }
        footer={
          <AssessmentPlayerFooter
            answers={answers}
            currentIndex={index}
            flagged={flagged}
            questions={questions}
            view={view}
            onGoTo={goTo}
            onViewChange={setView}
          />
        }
      >
        <AssessmentPlayerOptions
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          selectedSetting={selectedSetting}
          contrast={contrast}
          onContrastChange={onContrastChange}
          textScale={textScale}
          onTextScaleChange={onTextScaleChange}
          onGoToSubmission={onGoToSubmission}
          onSelectSetting={onSelectSetting}
        />

        <main className="flex min-h-0 w-full flex-1 flex-col px-2 pt-0">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded border border-border bg-background px-4 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-player">
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
                  className="mx-auto max-w-player"
                />
              ) : (
                <section
                  aria-labelledby={
                    view === "review" ? "review-heading" : "contents-heading"
                  }
                >
                  <AssessmentPlayerOverview
                    title={title}
                    answeredCount={answeredCount}
                    flaggedCount={flagged.length}
                    questionCount={questions.length}
                    view={view}
                    onFinishAndSubmit={onGoToSubmission}
                  />
                  {filters.map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-5">
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
          </div>
        </main>
      </AssessmentPlayerShell>
    </Tabs>
  );
}

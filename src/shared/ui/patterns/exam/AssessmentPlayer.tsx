import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  type PlayerNavigation,
} from "./assessment-player-types";
import { AssessmentPlayerFooter } from "./AssessmentPlayerFooter";
import { AssessmentPlayerOverview } from "./AssessmentPlayerOverview";
import {
  AssessmentPlayerOptions,
  type PlayerSetting,
} from "./AssessmentPlayerOptions";
import { AssessmentPlayerShell } from "./AssessmentPlayerShell";
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
  onStartOver?: () => void;
  /** Supply with onNavigationChange for a controlled live attempt. */
  navigation?: PlayerNavigation;
  onNavigationChange?: (navigation: PlayerNavigation) => void;
  /** Omitted until the host knows the actual connection/save state. */
  status?: ReactNode;
  timer?: ReactNode;
  saveStatus?: ReactNode;
  inputModeIndicator?: ReactNode;
  /** Prevent answer, reset and flag changes while submitting or expired. */
  interactionLocked?: boolean;
  /** Disable until the host can durably clear a response on the server. */
  canClearAnswer?: boolean;
  selectedSetting?: PlayerSetting;
  onGoToSubmission?: () => void;
  onSelectSetting?: (setting: PlayerSetting) => void;
  enabledSettings?: PlayerSetting[];
  optionsOpen?: boolean;
  onOptionsOpenChange?: (open: boolean) => void;
  /** Host feedback inside the frame, above the scrolling questions. */
  feedback?: ReactNode;
  /** Focus the recovered view when a full-page host finishes loading it. */
  focusOnMount?: boolean;
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
  navigation,
  onNavigationChange,
  status,
  timer,
  saveStatus,
  inputModeIndicator,
  interactionLocked = false,
  canClearAnswer = true,
  enabledSettings,
  optionsOpen: controlledOptionsOpen,
  onOptionsOpenChange,
  feedback,
  focusOnMount = false,
}: AssessmentPlayerProps) {
  const [localNavigation, setLocalNavigation] = useState<PlayerNavigation>({
    questionId: null, view: "contents", filter: "all",
  });
  const position = navigation ?? localNavigation;
  const { view, filter } = position;
  const index = Math.max(0, questions.findIndex((q) => q.id === position.questionId));
  const navigate = (patch: Partial<PlayerNavigation>) => {
    const next = { ...position, ...patch };
    if (!navigation) setLocalNavigation(next);
    onNavigationChange?.(next);
  };
  const [localOptionsOpen, setLocalOptionsOpen] = useState(false);
  const optionsOpen = controlledOptionsOpen ?? localOptionsOpen;
  const setOptionsOpen = (open: boolean) => {
    if (controlledOptionsOpen === undefined) setLocalOptionsOpen(open);
    onOptionsOpenChange?.(open);
  };
  const current = questions[index];
  const mainRef = useRef<HTMLElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const previousPosition = useRef({ view, questionId: current?.id });
  const initialFocus = useRef(true);
  useEffect(() => {
    const previous = previousPosition.current;
    previousPosition.current = { view, questionId: current?.id };
    const first = initialFocus.current;
    initialFocus.current = false;
    if (!(first && focusOnMount) && previous.view === view && previous.questionId === current?.id) return;
    const heading = view === "question" ? mainRef.current?.querySelector<HTMLElement>("h2")
      : document.getElementById(view === "review" ? "review-heading" : "contents-heading");
    heading?.focus();
  }, [view, current?.id, focusOnMount]);
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
    const question = questions[nextIndex];
    if (question) navigate({ questionId: question.id, view: "question" });
  };

  return (
    <Tabs
      value={filter}
      onValueChange={(value) => navigate({ filter: value as PlayerFilter })}
      className="gap-0"
    >
      <h1 className="sr-only">{title}</h1>
      <AssessmentPlayerShell
        candidate={candidate}
        status={status}
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {timer}
            {saveStatus}
            {inputModeIndicator}
            <Button
              ref={optionsButtonRef}
              data-player-options
              variant="ghost"
              size="icon-xl"
              aria-label={vi.exam.player.openOptions}
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen(!optionsOpen)}
            >
              <Menu aria-hidden />
            </Button>
          </div>
        }
        headerContent={
          <AssessmentPlayerOverview
            title={title}
            answeredCount={answeredCount}
            flaggedCount={questions.filter((question) => flagged.includes(question.id)).length}
            questionCount={questions.length}
            view={view}
            onStartOver={onStartOver ? () => {
              if (interactionLocked) return;
              onStartOver();
              goTo(0);
            } : undefined}
            interactionLocked={interactionLocked}
            onGoToSubmission={onGoToSubmission}
          />
        }
        footer={
          <AssessmentPlayerFooter
            answers={answers}
            currentIndex={index}
            flagged={flagged}
            questions={questions}
            view={view}
            onGoTo={goTo}
            onViewChange={(nextView: PlayerView) => navigate({ view: nextView })}
          />
        }
      >
        <AssessmentPlayerOptions
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          selectedSetting={selectedSetting}
          onGoToSubmission={onGoToSubmission}
          onSelectSetting={onSelectSetting}
          interactionLocked={interactionLocked}
          enabledSettings={enabledSettings}
          onRestoreFocus={() => optionsButtonRef.current?.focus()}
        />
        {feedback}
        <main ref={mainRef} id="main" className="min-h-0 w-full flex-1 overflow-y-scroll py-4 pl-4">
          <div className="w-full mx-auto max-w-4xl flex-1">
            {view === "question" && current ? (
              <fieldset disabled={interactionLocked} lang={current.stemLang} aria-label={current.title} className="min-w-0">
                <PlayerQuestion
                  key={current.id}
                  question={current}
                  questionNumber={index + 1}
                  questionCount={questions.length}
                  answer={answers[current.id]}
                  flagged={flagged.includes(current.id)}
                  onAnswerChange={(value) => {
                    if (!interactionLocked && !optionsOpen && (canClearAnswer || answerState(value))) {
                      onAnswerChange(current.id, value);
                    }
                  }}
                  onReset={canClearAnswer ? () => {
                    if (!interactionLocked && !optionsOpen) onAnswerChange(current.id, undefined);
                  } : undefined}
                  onToggleFlag={() => {
                    if (!interactionLocked && !optionsOpen) onToggleFlag(current.id);
                  }}
                  disabled={interactionLocked}
                  className="mx-auto max-w-4xl"
                />
              </fieldset>
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
      </AssessmentPlayerShell>
    </Tabs>
  );
}

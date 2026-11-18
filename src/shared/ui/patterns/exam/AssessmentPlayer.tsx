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
  type PlayerNavigation,
  type PlayerQuestion as PlayerQuestionData,
  type PlayerView,
} from "./assessment-player-types";
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
import { QuestionNavigatorPanel } from "./QuestionNavigatorPanel";
import { QuestionPager } from "./QuestionPager";
import { ExamTimeBar, formatClock } from "./ExamTimeBar";
import { ExamInfo, type ExamInfoProps } from "./ExamInfo";

export interface AssessmentPlayerProps {
  /** Assessment name shown above the contents table. */
  title: string;
  candidate: { id: string; name: string };
  /** Optional course/exam code displayed in the top bar. Prefer `exam`. */
  examCode?: string;
  /** Exam name, ID and server-issued verification image, shown beside the candidate. */
  exam?: ExamInfoProps;
  /** Optional remaining time string displayed centered in the top bar. */
  remainingTime?: string;
  questions: PlayerQuestionData[];
  answers: Answers;
  flagged: string[];
  onAnswerChange: (questionId: string, value: Answer) => void;
  onToggleFlag: (questionId: string) => void;
  /** Clears answers and flags; kept optional for host compatibility. */
  onStartOver?: () => void;
  /** Supply with onNavigationChange for a controlled live attempt. */
  navigation?: PlayerNavigation;
  onNavigationChange?: (navigation: PlayerNavigation) => void;
  /** Connection/save status label; defaults to "Connected" for standalone demos. */
  status?: ReactNode;
  timer?: ReactNode;
  /** Draws the media-player style time bar in the questions panel; ignored when `timer` is given. */
  timeLimit?: { remainingMs: number; totalMs: number; deadlineAt?: string };
  saveStatus?: ReactNode;
  inputModeIndicator?: ReactNode;
  /** Prevent answer, reset and flag changes while submitting or expired. */
  interactionLocked?: boolean;
  /** Disable until the host can durably clear a response on the server. */
  canClearAnswer?: boolean;
  selectedSetting?: PlayerSetting;
  contrast?: ContrastOption;
  onContrastChange?: (contrast: ContrastOption) => void;
  textScale?: TextScaleOption;
  onTextScaleChange?: (textScale: TextScaleOption) => void;
  onGoToSubmission?: () => void;
  onSelectSetting?: (setting: PlayerSetting) => void;
  enabledSettings?: PlayerSetting[];
  optionsOpen?: boolean;
  onOptionsOpenChange?: (open: boolean) => void;
  /** Host feedback inside the frame, above the scrolling questions. */
  feedback?: ReactNode;
  /** Focus the recovered view when a full-page host finishes loading it. */
  focusOnMount?: boolean;
  /** Admission context read with the first Contents heading only. */
  entryDescription?: string;
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
  exam,
  remainingTime,
  questions,
  answers,
  flagged,
  onAnswerChange,
  onToggleFlag,
  navigation,
  onNavigationChange,
  status = vi.exam.player.connected,
  timer,
  timeLimit,
  saveStatus,
  inputModeIndicator,
  interactionLocked = false,
  canClearAnswer = true,
  selectedSetting,
  contrast,
  onContrastChange,
  textScale,
  onTextScaleChange,
  onGoToSubmission,
  onSelectSetting,
  enabledSettings,
  optionsOpen: controlledOptionsOpen,
  onOptionsOpenChange,
  feedback,
  focusOnMount = false,
  entryDescription,
}: AssessmentPlayerProps) {
  const [localNavigation, setLocalNavigation] = useState<PlayerNavigation>({
    questionId: null,
    view: "contents",
    filter: "all",
  });
  const position = navigation ?? localNavigation;
  const { view, filter } = position;
  const [showEntryDescription, setShowEntryDescription] = useState(true);
  useEffect(() => {
    if (view !== "contents") setShowEntryDescription(false);
  }, [view]);
  const index = Math.max(
    0,
    questions.findIndex((q) => q.id === position.questionId),
  );
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
    if (
      !(first && focusOnMount) &&
      previous.view === view &&
      previous.questionId === current?.id
    ) {
      return;
    }
    const heading =
      view === "question"
        ? mainRef.current?.querySelector<HTMLElement>("h2")
        : document.getElementById(
            view === "review" ? "review-heading" : "contents-heading",
          );
    heading?.focus();
  }, [view, current?.id, focusOnMount]);

  const answeredCount = questions.filter((question) =>
    answerState(answers[question.id]),
  ).length;
  const flaggedCount = questions.filter((question) =>
    flagged.includes(question.id),
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

  const panelTimer =
    timer ??
    (timeLimit ? <ExamTimeBar {...timeLimit} /> : remainingTime);
  const headerTimer =
    timer ??
    (timeLimit
      ? vi.exam.timeBar.left(formatClock(timeLimit.remainingMs))
      : remainingTime);

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
      <AssessmentPlayerShell
        candidate={candidate}
        status={status}
        meta={exam ? undefined : examCode}
        examInfo={exam ? <ExamInfo {...exam} /> : undefined}
        center={
          headerTimer ? (
            // Shown here only while the questions panel is hidden (below lg).
            <div className="lg:hidden">{headerTimer}</div>
          ) : undefined
        }
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {saveStatus}
            {inputModeIndicator}
            <Button
              ref={optionsButtonRef}
              data-player-options
              variant="outline"
              size="xl"
              className="rounded"
              aria-label={vi.exam.player.openOptions}
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen(!optionsOpen)}
            >
              <Menu
                aria-hidden
                className="size-[calc(1.25rem*var(--text-scale))]"
              />
              <span>{vi.exam.player.options}</span>
            </Button>
          </div>
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
          interactionLocked={interactionLocked}
          enabledSettings={enabledSettings}
          onRestoreFocus={() => optionsButtonRef.current?.focus()}
        />
        {feedback}
        {/* DOM order = reading/Tab order: question, its controls, then the navigator. */}
        <div className="flex min-h-0 flex-1 pr-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <main
              ref={mainRef}
              id="main"
              className="flex min-h-0 w-full flex-1 flex-col p-2 pt-0"
            >
              <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded border border-border bg-background px-4 py-8 sm:px-8 sm:py-10">
                <div className="mx-auto w-full max-w-player">
                  {view === "question" && current ? (
                    <fieldset disabled={interactionLocked} className="min-w-0">
                      <PlayerQuestion
                        key={current.id}
                        question={current}
                        questionNumber={index + 1}
                        questionCount={questions.length}
                        answer={answers[current.id]}
                        flagged={flagged.includes(current.id)}
                        onAnswerChange={(value) => {
                          if (
                            !interactionLocked &&
                            !optionsOpen &&
                            (canClearAnswer || answerState(value))
                          ) {
                            onAnswerChange(current.id, value);
                          }
                        }}
                        onReset={
                          canClearAnswer
                            ? () => {
                                if (!interactionLocked && !optionsOpen) {
                                  onAnswerChange(current.id, undefined);
                                }
                              }
                            : undefined
                        }
                        onToggleFlag={() => {
                          if (!interactionLocked && !optionsOpen) {
                            onToggleFlag(current.id);
                          }
                        }}
                        disabled={interactionLocked}
                        className="mx-auto max-w-player"
                      />
                    </fieldset>
                  ) : (
                    <section
                      aria-labelledby={
                        view === "review"
                          ? "review-heading"
                          : "contents-heading"
                      }
                    >
                      <AssessmentPlayerOverview
                        title={title}
                        entryDescription={
                          showEntryDescription ? entryDescription : undefined
                        }
                        answeredCount={answeredCount}
                        flaggedCount={flaggedCount}
                        questionCount={questions.length}
                        view={view}
                        onFinishAndSubmit={onGoToSubmission}
                        interactionLocked={interactionLocked}
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
            <QuestionPager
              currentIndex={index}
              questionCount={questions.length}
              view={view}
              onGoTo={goTo}
              onViewChange={(nextView: PlayerView) =>
                navigate({ view: nextView })
              }
            />
          </div>
          <QuestionNavigatorPanel
            className="mb-2 hidden w-full max-w-navigator shrink-0 lg:flex"
            questions={questions.map((question) => ({
              id: question.id,
              answered: answerState(answers[question.id]),
              flagged: flagged.includes(question.id),
            }))}
            currentIndex={view === "question" ? index : null}
            onNavigate={goTo}
            onReview={() => navigate({ view: "review" })}
            timer={panelTimer}
          />
        </div>
      </AssessmentPlayerShell>
    </Tabs>
  );
}

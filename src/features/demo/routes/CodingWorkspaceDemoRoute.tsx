import { useEffect, useState } from "react";
import { AssessmentPlayer } from "@/shared/ui/patterns/exam/AssessmentPlayer";
import type { ContrastOption } from "@/shared/ui/patterns/exam/AssessmentPlayerOptions";
import type { TextScaleOption } from "@/shared/ui/patterns/exam/AssessmentPlayerTextSizeOptions";
import type {
  Answers,
  PlayerNavigation,
} from "@/shared/ui/patterns/exam/assessment-player-types";
import { assessmentPlayerCandidate } from "@/features/demo/data/assessmentPlayer";
import {
  codingWorkspaceQuestions,
  codingWorkspaceTitle,
  firstCodingQuestionId,
  runDemoCode,
} from "@/features/demo/data/codingWorkspace";

const DEMO_TOTAL_MS = 60 * 60 * 1000;
const DEMO_REMAINING_MS = 35 * 60 * 1000;

/** The assessment player opened on a C coding question, with a mock sandbox. */
export function CodingWorkspaceDemoRoute() {
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [navigation, setNavigation] = useState<PlayerNavigation>({
    questionId: firstCodingQuestionId,
    view: "question",
    filter: "all",
  });
  const [textScale, setTextScale] = useState<TextScaleOption>(100);
  const [contrast, setContrast] = useState<ContrastOption>("default");
  const [remainingMs, setRemainingMs] = useState(DEMO_REMAINING_MS);

  useEffect(() => {
    const id = window.setInterval(
      () => setRemainingMs((ms) => Math.max(0, ms - 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reduceMotion = "true";
    return () => {
      delete root.dataset.reduceMotion;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (textScale === 100) root.style.removeProperty("--text-scale");
    else root.style.setProperty("--text-scale", String(textScale / 100));
    return () => {
      root.style.removeProperty("--text-scale");
    };
  }, [textScale]);

  useEffect(() => {
    const root = document.documentElement;
    if (contrast === "default") delete root.dataset.contrast;
    else root.dataset.contrast = contrast;
    return () => {
      delete root.dataset.contrast;
    };
  }, [contrast]);

  return (
    <AssessmentPlayer
      title={codingWorkspaceTitle}
      candidate={assessmentPlayerCandidate}
      exam={{ name: "PRO192 - Final Exam", id: "07342" }}
      timeLimit={{ remainingMs, totalMs: DEMO_TOTAL_MS }}
      questions={codingWorkspaceQuestions}
      answers={answers}
      flagged={flagged}
      navigation={navigation}
      onNavigationChange={setNavigation}
      contrast={contrast}
      onContrastChange={setContrast}
      textScale={textScale}
      onTextScaleChange={setTextScale}
      onRunCode={runDemoCode}
      onAnswerChange={(questionId, value) =>
        setAnswers((previous) => ({ ...previous, [questionId]: value }))
      }
      onToggleFlag={(questionId) =>
        setFlagged((items) =>
          items.includes(questionId)
            ? items.filter((id) => id !== questionId)
            : [...items, questionId],
        )
      }
      onGoToSubmission={() => {
        setAnswers({});
        setFlagged([]);
      }}
      onStartOver={() => {
        setAnswers({});
        setFlagged([]);
      }}
    />
  );
}

import { useEffect, useState } from "react";
import { AssessmentPlayer } from "@/shared/ui/patterns/exam/AssessmentPlayer";
import type { ContrastOption } from "@/shared/ui/patterns/exam/AssessmentPlayerOptions";
import type { TextScaleOption } from "@/shared/ui/patterns/exam/AssessmentPlayerTextSizeOptions";
import type { Answers } from "@/shared/ui/patterns/exam/assessment-player-types";
import {
  assessmentPlayerCandidate,
  assessmentPlayerQuestions,
  assessmentPlayerTitle,
} from "@/features/demo/data/assessmentPlayer";

export function AssessmentPlayerDemoRoute() {
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [textScale, setTextScale] = useState<TextScaleOption>(100);
  const [contrast, setContrast] = useState<ContrastOption>("default");

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
      title={assessmentPlayerTitle}
      candidate={assessmentPlayerCandidate}
      examCode="PRO192"
      remainingTime="35 minutes left"
      questions={assessmentPlayerQuestions}
      answers={answers}
      flagged={flagged}
      contrast={contrast}
      onContrastChange={setContrast}
      textScale={textScale}
      onTextScaleChange={setTextScale}
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

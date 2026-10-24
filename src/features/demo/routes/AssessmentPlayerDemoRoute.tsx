import { useState } from "react";
import { AssessmentPlayer } from "@/shared/ui/patterns/exam/AssessmentPlayer";
import type { Answers } from "@/shared/ui/patterns/exam/assessment-player-types";
import {
  assessmentPlayerCandidate,
  assessmentPlayerQuestions,
  assessmentPlayerTitle,
} from "@/features/demo/data/assessmentPlayer";

export function AssessmentPlayerDemoRoute() {
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<string[]>([]);

  return (
    <AssessmentPlayer
      title={assessmentPlayerTitle}
      candidate={assessmentPlayerCandidate}
      questions={assessmentPlayerQuestions}
      answers={answers}
      flagged={flagged}
      selectedSetting="contrast"
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
      onStartOver={() => {
        setAnswers({});
        setFlagged([]);
      }}
    />
  );
}

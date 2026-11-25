import type { QuestionType } from "@/api/assessmentAttempt";
import type { PracticeResult, PracticeSession } from "@/api/studentPractice";

/**
 * The student's practice progress, worked out from what the Backend already
 * publishes: the practice sessions and the released result of each. The
 * Backend has no progress endpoint, and its results carry no topic per
 * question, so accuracy is grouped by question type instead of by topic.
 */

export type HistoryItem = {
  sessionId: string;
  name: string | null;
  submittedAt: string | null;
  totalScore: number;
  maxScore: number;
  percent: number;
  scoreOnTen: number | null;
  passed: boolean | null;
};

export type TypeAccuracy = {
  questionType: QuestionType;
  score: number;
  maxScore: number;
  percent: number;
  questions: number;
};

export type ProgressSummary = {
  /** Released attempts with a score. */
  attempts: number;
  /** Mean of each attempt's score as a percentage of its maximum. */
  averagePercent: number | null;
  /** Mean of the scores out of ten, where the Backend gives them. */
  averageOnTen: number | null;
  passed: number;
  byType: TypeAccuracy[];
  /** Newest first. */
  history: HistoryItem[];
  /** Closed sessions whose results the lecturer has not released yet. */
  awaitingResults: number;
};

const TYPE_ORDER: QuestionType[] = ["Single", "Multiple", "Essay", "Coding"];
const percentOf = (score: number, max: number) => Math.round((score / max) * 100);
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function isClosed(session: PracticeSession, now = Date.now()) {
  const status = session.status ?? "Draft";
  if (status === "Open") return now > Date.parse(session.closesAt);
  return status !== "Draft" && status !== "Scheduled";
}

export function summariseProgress(
  sessions: PracticeSession[],
  results: Map<string, PracticeResult>,
  now = Date.now(),
): ProgressSummary {
  const history: HistoryItem[] = [];
  const types = new Map<QuestionType, { score: number; maxScore: number; questions: number }>();

  for (const session of sessions) {
    const result = results.get(session.sessionId);
    const row = result?.result;
    // A released session the student never sat has no attempt and no score.
    if (!result || !row || row.totalScore == null || row.maxScore <= 0 || (!row.attemptId && !row.submittedAt)) continue;
    history.push({
      sessionId: session.sessionId,
      name: session.name?.trim() || null,
      submittedAt: row.submittedAt ?? null,
      totalScore: row.totalScore,
      maxScore: row.maxScore,
      percent: percentOf(row.totalScore, row.maxScore),
      scoreOnTen: row.scoreOnTen ?? null,
      passed: row.passed ?? null,
    });
    for (const grade of result.review) {
      // Only graded questions count; an essay still waiting for its lecturer does not.
      if (grade.score == null || grade.maxScore <= 0) continue;
      const total = types.get(grade.questionType) ?? { score: 0, maxScore: 0, questions: 0 };
      total.score += grade.score;
      total.maxScore += grade.maxScore;
      total.questions += 1;
      types.set(grade.questionType, total);
    }
  }

  history.sort((a, b) => Date.parse(b.submittedAt ?? "") - Date.parse(a.submittedAt ?? "") || 0);
  const averagePercent = mean(history.map((item) => item.percent));
  const averageOnTen = mean(history.flatMap((item) => (item.scoreOnTen == null ? [] : [item.scoreOnTen])));

  return {
    attempts: history.length,
    averagePercent: averagePercent == null ? null : Math.round(averagePercent),
    averageOnTen: averageOnTen == null ? null : Math.round(averageOnTen * 10) / 10,
    passed: history.filter((item) => item.passed).length,
    byType: TYPE_ORDER.flatMap((questionType) => {
      const total = types.get(questionType);
      return total ? [{ questionType, ...total, percent: percentOf(total.score, total.maxScore) }] : [];
    }),
    history,
    awaitingResults: sessions.filter((session) => isClosed(session, now) && !session.releasedAt).length,
  };
}

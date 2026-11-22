export type ExamPlan = { plannedQuestionCount: number; pointsPerQuestion: number; passScore: number };

export type PlanSummary = {
  /** Both numbers are set, so a total can be worked out. */
  complete: boolean;
  totalScore: number;
  /** The pass score as a share of the planned total, when there is a total. */
  passPercent: number | null;
  warnings: string[];
};

/** The shared score when every question is worth the same, otherwise 0 (no single value to plan with). */
export function commonScore(scores: number[]): number {
  return scores.length > 0 && scores.every((score) => score === scores[0]) ? scores[0] : 0;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * What the paper adds up to if it holds the planned number of questions at the planned points each.
 * The Backend only learns the real total from the questions chosen later, so this is the examiner's plan.
 */
export function summarisePlan({ plannedQuestionCount, pointsPerQuestion, passScore }: ExamPlan): PlanSummary {
  const complete = plannedQuestionCount > 0 && pointsPerQuestion > 0;
  const totalScore = complete ? round2(plannedQuestionCount * pointsPerQuestion) : 0;
  const warnings: string[] = [];
  if (complete && Number.isFinite(passScore) && passScore > totalScore) {
    warnings.push(`The pass score (${passScore}) is higher than the planned total (${totalScore}), so nobody could pass.`);
  }
  return {
    complete,
    totalScore,
    passPercent: complete && totalScore > 0 && Number.isFinite(passScore) ? Math.round((passScore / totalScore) * 100) : null,
    warnings,
  };
}

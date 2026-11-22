export type BalanceQuestion = { questionId: string; difficulty?: string | null; questionType?: string | null; defaultScore: number };
export type BalanceSelection = { questionId: string; maxScore: number };

export type BalanceSlice = {
  key: string;
  label: string;
  /** Questions of this kind in the paper. */
  count: number;
  /** Points of this kind in the paper. */
  score: number;
  countPercent: number;
  scorePercent: number;
  /** Eligible questions of this kind still in the bank, selected or not. */
  available: number;
};

export type PaperBalance = {
  count: number;
  totalScore: number;
  difficulty: BalanceSlice[];
  type: BalanceSlice[];
};

export const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"] as const;
export const TYPE_ORDER = ["Single", "Multiple", "Essay"] as const;
export const TYPE_LABELS: Record<string, string> = { Single: "Single choice", Multiple: "Multiple choice", Essay: "Essay" };

/** The mix people usually aim for; only a starting point the examiner can change. */
export const DEFAULT_DIFFICULTY_TARGET: Record<(typeof DIFFICULTY_ORDER)[number], number> = { Easy: 30, Medium: 50, Hard: 20 };

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function slices(
  order: readonly string[],
  labelOf: (key: string) => string,
  pick: (question: BalanceQuestion | undefined) => string,
  selected: BalanceSelection[],
  bank: Map<string, BalanceQuestion>,
  eligible: BalanceQuestion[],
  totalScore: number,
): BalanceSlice[] {
  const counted = new Map<string, { count: number; score: number }>();
  for (const item of selected) {
    const key = pick(bank.get(item.questionId));
    const entry = counted.get(key) ?? { count: 0, score: 0 };
    entry.count += 1;
    entry.score += item.maxScore;
    counted.set(key, entry);
  }
  const available = new Map<string, number>();
  for (const question of eligible) available.set(pick(question), (available.get(pick(question)) ?? 0) + 1);
  // A value the Backend adds later still shows up, after the known ones.
  const keys = [...order, ...[...counted.keys(), ...available.keys()].filter((key) => !order.includes(key))];
  return [...new Set(keys)].map((key) => {
    const entry = counted.get(key) ?? { count: 0, score: 0 };
    return {
      key,
      label: labelOf(key),
      count: entry.count,
      score: entry.score,
      countPercent: percent(entry.count, selected.length),
      scorePercent: percent(entry.score, totalScore),
      available: available.get(key) ?? 0,
    };
  });
}

/** How the chosen questions split by difficulty and by type, in questions and in points. */
export function computePaperBalance(selected: BalanceSelection[], bank: BalanceQuestion[], eligible: BalanceQuestion[]): PaperBalance {
  const byId = new Map(bank.map((question) => [question.questionId, question]));
  const totalScore = selected.reduce((sum, item) => sum + item.maxScore, 0);
  const difficultyOf = (question: BalanceQuestion | undefined) => question?.difficulty || "Other";
  const typeOf = (question: BalanceQuestion | undefined) => question?.questionType || "Other";
  return {
    count: selected.length,
    totalScore,
    difficulty: slices(DIFFICULTY_ORDER, (key) => key, difficultyOf, selected, byId, eligible, totalScore),
    type: slices(TYPE_ORDER, (key) => TYPE_LABELS[key] ?? key, typeOf, selected, byId, eligible, totalScore),
  };
}

/** Plain-language hints. They point out a lopsided paper; they never block saving. */
export function balanceHints(balance: PaperBalance, target: Record<string, number>): string[] {
  if (!balance.count) return [];
  const hints: string[] = [];
  const targetTotal = DIFFICULTY_ORDER.reduce((sum, key) => sum + (target[key] ?? 0), 0);
  if (targetTotal !== 100) hints.push(`The targets add up to ${targetTotal}%, not 100%.`);
  for (const slice of balance.difficulty) {
    const goal = target[slice.key];
    if (goal === undefined) continue;
    const gap = slice.countPercent - goal;
    if (slice.count === 0 && goal > 0) {
      hints.push(`No ${slice.label} questions yet${slice.available ? ` (${slice.available} eligible available)` : " and none are eligible"}.`);
    } else if (Math.abs(gap) >= 15) {
      hints.push(`${slice.label} is ${Math.abs(gap)} points ${gap > 0 ? "above" : "below"} its ${goal}% target.`);
    }
  }
  const used = balance.type.filter((slice) => slice.count > 0);
  if (used.length === 1 && balance.count > 1) hints.push(`Every question is ${used[0].label.toLowerCase()}.`);
  return hints;
}

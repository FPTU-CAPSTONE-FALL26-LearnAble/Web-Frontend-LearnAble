import { DIFFICULTY_ORDER } from "@/features/examiner/workflow/paperBalance";

export type PickCandidate = { questionId: string; difficulty?: string | null };
export type Level = (typeof DIFFICULTY_ORDER)[number];

export type AutoPickResult = {
  /** Question ids to add, in the order they were picked. */
  picks: string[];
  /** How many were added per difficulty. */
  added: Record<Level, number>;
  /** Levels that could not give their share, and how many were wanted against how many were available. */
  shortages: Array<{ level: Level; wanted: number; got: number }>;
  /** Slots left empty because there were not enough eligible questions in total. */
  unfilled: number;
  /** The paper already holds the wanted number of questions, so nothing was added. */
  alreadyFull: boolean;
};

const levels = DIFFICULTY_ORDER;
const blank = (): Record<Level, number> => ({ Easy: 0, Medium: 0, Hard: 0 });

/** Splits a total across the targets so the parts add up exactly (largest remainder). */
export function allocateQuota(total: number, target: Record<string, number>): Record<Level, number> {
  const weight = levels.map((level) => Math.max(0, target[level] ?? 0));
  const sum = weight.reduce((a, b) => a + b, 0);
  const quota = blank();
  if (total <= 0 || sum <= 0) return quota;
  const exact = weight.map((value) => (value / sum) * total);
  levels.forEach((level, index) => { quota[level] = Math.floor(exact[index]); });
  let left = total - levels.reduce((acc, level) => acc + quota[level], 0);
  // The biggest fractions get the spare questions; a tie goes to the larger target.
  const order = levels
    .map((level, index) => ({ level, fraction: exact[index] - Math.floor(exact[index]), weight: weight[index] }))
    .sort((a, b) => b.fraction - a.fraction || b.weight - a.weight);
  for (const { level } of order) {
    if (left <= 0) break;
    quota[level] += 1;
    left -= 1;
  }
  return quota;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * Chooses eligible questions so the paper reaches `total` questions in the proportions of `target`.
 * Questions already in the paper stay; only the missing share is added. If a level runs out, the
 * gap is filled from the other levels, biggest target first, and reported.
 */
export function autoPick({ candidates, selected, total, target, random = Math.random }: {
  candidates: PickCandidate[];
  selected: PickCandidate[];
  total: number;
  target: Record<string, number>;
  random?: () => number;
}): AutoPickResult {
  const added = blank();
  const result: AutoPickResult = { picks: [], added, shortages: [], unfilled: 0, alreadyFull: false };
  const slots = Math.max(0, total - selected.length);
  if (slots === 0) return { ...result, alreadyFull: total > 0 };

  const chosen = new Set(selected.map((item) => item.questionId));
  const have = blank();
  for (const item of selected) if ((levels as readonly string[]).includes(item.difficulty ?? "")) have[item.difficulty as Level] += 1;

  const quota = allocateQuota(total, target);
  const pools = Object.fromEntries(levels.map((level) => [level, shuffled(candidates.filter((item) => item.difficulty === level && !chosen.has(item.questionId)), random)])) as Record<Level, PickCandidate[]>;
  const take = (level: Level, count: number) => {
    const got = pools[level].splice(0, count);
    got.forEach((item) => result.picks.push(item.questionId));
    added[level] += got.length;
    return got.length;
  };

  // First each level's own missing share...
  const needed = Object.fromEntries(levels.map((level) => [level, Math.max(0, quota[level] - have[level])])) as Record<Level, number>;
  let free = slots;
  for (const level of levels) {
    const want = Math.min(needed[level], free);
    const got = take(level, want);
    free -= got;
    if (got < want) result.shortages.push({ level, wanted: want, got });
  }
  // ...then any slot still free, from the levels that still have questions, biggest target first.
  const byTarget = [...levels].sort((a, b) => (target[b] ?? 0) - (target[a] ?? 0));
  while (free > 0) {
    const level = byTarget.find((candidate) => pools[candidate].length > 0);
    if (!level) break;
    free -= take(level, 1);
  }
  result.unfilled = free;
  return result;
}

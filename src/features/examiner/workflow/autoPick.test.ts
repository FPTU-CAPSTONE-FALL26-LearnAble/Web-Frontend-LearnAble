import { allocateQuota, autoPick, type PickCandidate } from "./autoPick";

const make = (level: string, count: number): PickCandidate[] => Array.from({ length: count }, (_, index) => ({ questionId: `${level}-${index}`, difficulty: level }));
const target = { Easy: 30, Medium: 50, Hard: 20 };
// A fixed "random" so the picks are repeatable.
const noShuffle = () => 0.999;

describe("allocateQuota", () => {
  it("splits a total by the targets and adds up exactly", () => {
    expect(allocateQuota(40, target)).toEqual({ Easy: 12, Medium: 20, Hard: 8 });
    expect(allocateQuota(10, target)).toEqual({ Easy: 3, Medium: 5, Hard: 2 });
    const odd = allocateQuota(7, target);
    expect(odd.Easy + odd.Medium + odd.Hard).toBe(7);
  });

  it("treats targets that do not add up to 100 as shares of whatever they add up to", () => {
    expect(allocateQuota(10, { Easy: 1, Medium: 1, Hard: 0 })).toEqual({ Easy: 5, Medium: 5, Hard: 0 });
  });

  it("gives nothing when there is nothing to split", () => {
    expect(allocateQuota(0, target)).toEqual({ Easy: 0, Medium: 0, Hard: 0 });
    expect(allocateQuota(10, { Easy: 0, Medium: 0, Hard: 0 })).toEqual({ Easy: 0, Medium: 0, Hard: 0 });
  });
});

describe("autoPick", () => {
  const candidates = [...make("Easy", 25), ...make("Medium", 11), ...make("Hard", 4)];

  it("fills the paper in the proportions of the targets", () => {
    const result = autoPick({ candidates, selected: [], total: 20, target, random: noShuffle });
    expect(result.added).toEqual({ Easy: 6, Medium: 10, Hard: 4 });
    expect(result.picks).toHaveLength(20);
    expect(new Set(result.picks).size).toBe(20);
    expect(result.shortages).toEqual([]);
    expect(result.unfilled).toBe(0);
  });

  it("keeps what is already chosen and adds only the missing share", () => {
    const selected = [...make("Medium", 10)].map((item) => ({ ...item, questionId: `kept-${item.questionId}` }));
    const result = autoPick({ candidates: [...candidates, ...selected], selected, total: 20, target, random: noShuffle });
    expect(result.picks.every((id) => !id.startsWith("kept-"))).toBe(true);
    expect(result.added).toEqual({ Easy: 6, Medium: 0, Hard: 4 });
  });

  it("does nothing when the paper already has the wanted number", () => {
    const selected = make("Easy", 5);
    const result = autoPick({ candidates, selected, total: 5, target, random: noShuffle });
    expect(result).toMatchObject({ picks: [], alreadyFull: true, unfilled: 0 });
  });

  it("reports a level that runs out and fills the gap from the others", () => {
    const result = autoPick({ candidates: [...make("Easy", 20), ...make("Medium", 20), ...make("Hard", 2)], selected: [], total: 20, target, random: noShuffle });
    expect(result.shortages).toEqual([{ level: "Hard", wanted: 4, got: 2 }]);
    expect(result.picks).toHaveLength(20);
    expect(result.added.Hard).toBe(2);
    expect(result.unfilled).toBe(0);
  });

  it("reports slots it cannot fill when the bank is too small", () => {
    const result = autoPick({ candidates: make("Easy", 3), selected: [], total: 10, target, random: noShuffle });
    expect(result.picks).toHaveLength(3);
    expect(result.unfilled).toBe(7);
  });

  it("never picks the same question twice, nor one that is not a candidate level", () => {
    const result = autoPick({ candidates: [...make("Easy", 5), { questionId: "odd", difficulty: "Other" }], selected: [], total: 10, target: { Easy: 100, Medium: 0, Hard: 0 }, random: noShuffle });
    expect(result.picks).not.toContain("odd");
    expect(new Set(result.picks).size).toBe(result.picks.length);
  });

  it("picks different questions when the random source differs", () => {
    const pool = make("Easy", 30);
    const a = autoPick({ candidates: pool, selected: [], total: 5, target: { Easy: 100, Medium: 0, Hard: 0 }, random: () => 0.1 });
    const b = autoPick({ candidates: pool, selected: [], total: 5, target: { Easy: 100, Medium: 0, Hard: 0 }, random: () => 0.9 });
    expect(a.picks).not.toEqual(b.picks);
  });
});

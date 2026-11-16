import { balanceHints, computePaperBalance, DEFAULT_DIFFICULTY_TARGET } from "./paperBalance";

const bank = [
  { questionId: "a", difficulty: "Easy", questionType: "Single", defaultScore: 1 },
  { questionId: "b", difficulty: "Medium", questionType: "Single", defaultScore: 1 },
  { questionId: "c", difficulty: "Medium", questionType: "Multiple", defaultScore: 2 },
  { questionId: "d", difficulty: "Hard", questionType: "Essay", defaultScore: 4 },
  { questionId: "e", difficulty: "Hard", questionType: "Essay", defaultScore: 4 },
];

describe("computePaperBalance", () => {
  it("splits the chosen questions by difficulty and type, in questions and in points", () => {
    const balance = computePaperBalance(
      [{ questionId: "a", maxScore: 1 }, { questionId: "b", maxScore: 1 }, { questionId: "c", maxScore: 2 }, { questionId: "d", maxScore: 4 }],
      bank,
      bank,
    );
    expect(balance.count).toBe(4);
    expect(balance.totalScore).toBe(8);
    const medium = balance.difficulty.find((slice) => slice.key === "Medium");
    expect(medium).toMatchObject({ count: 2, score: 3, countPercent: 50, scorePercent: 38, available: 2 });
    expect(balance.difficulty.map((slice) => slice.key)).toEqual(["Easy", "Medium", "Hard"]);
    expect(balance.type.find((slice) => slice.key === "Essay")).toMatchObject({ count: 1, countPercent: 25, scorePercent: 50, available: 2 });
  });

  it("uses the score set in the paper, not the default score", () => {
    const balance = computePaperBalance([{ questionId: "d", maxScore: 10 }], bank, bank);
    expect(balance.totalScore).toBe(10);
  });

  it("files a question it cannot find under Other instead of dropping it", () => {
    const balance = computePaperBalance([{ questionId: "gone", maxScore: 1 }], bank, []);
    expect(balance.difficulty.find((slice) => slice.key === "Other")).toMatchObject({ count: 1, countPercent: 100 });
  });

  it("shows zeros for an empty paper", () => {
    const balance = computePaperBalance([], bank, bank);
    expect(balance.count).toBe(0);
    expect(balance.difficulty.every((slice) => slice.countPercent === 0)).toBe(true);
  });
});

describe("balanceHints", () => {
  it("says nothing for an empty paper", () => {
    expect(balanceHints(computePaperBalance([], bank, bank), DEFAULT_DIFFICULTY_TARGET)).toEqual([]);
  });

  it("points out a missing level, and what is available for it", () => {
    const balance = computePaperBalance([{ questionId: "a", maxScore: 1 }, { questionId: "b", maxScore: 1 }], bank, bank);
    expect(balanceHints(balance, DEFAULT_DIFFICULTY_TARGET)).toContain("No Hard questions yet (2 eligible available).");
  });

  it("points out a level far from its target", () => {
    const balance = computePaperBalance([{ questionId: "b", maxScore: 1 }, { questionId: "c", maxScore: 1 }], bank, bank);
    const hints = balanceHints(balance, DEFAULT_DIFFICULTY_TARGET);
    expect(hints).toContain("Medium is 50 points above its 50% target.");
  });

  it("warns when the targets do not add up to 100", () => {
    const balance = computePaperBalance([{ questionId: "a", maxScore: 1 }], bank, bank);
    expect(balanceHints(balance, { Easy: 30, Medium: 50, Hard: 10 })).toContain("The targets add up to 90%, not 100%.");
  });

  it("notes a paper made of one question type", () => {
    const balance = computePaperBalance([{ questionId: "a", maxScore: 1 }, { questionId: "b", maxScore: 1 }], bank, bank);
    expect(balanceHints(balance, DEFAULT_DIFFICULTY_TARGET)).toContain("Every question is single choice.");
  });
});

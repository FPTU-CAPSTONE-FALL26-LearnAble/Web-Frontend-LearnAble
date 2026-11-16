import { summarisePlan } from "./examPlan";

describe("summarisePlan", () => {
  it("multiplies the questions by the points each, and relates the pass score to the total", () => {
    expect(summarisePlan({ plannedQuestionCount: 40, pointsPerQuestion: 0.25, passScore: 5 })).toEqual({
      complete: true,
      totalScore: 10,
      passPercent: 50,
      warnings: [],
    });
  });

  it("avoids floating point noise in the total", () => {
    expect(summarisePlan({ plannedQuestionCount: 3, pointsPerQuestion: 0.1, passScore: 0 }).totalScore).toBe(0.3);
  });

  it("warns when nobody could reach the pass score", () => {
    const plan = summarisePlan({ plannedQuestionCount: 10, pointsPerQuestion: 0.25, passScore: 5 });
    expect(plan.warnings).toEqual(["The pass score (5) is higher than the planned total (2.5), so nobody could pass."]);
  });

  it("is incomplete until both numbers are set", () => {
    expect(summarisePlan({ plannedQuestionCount: 0, pointsPerQuestion: 1, passScore: 5 })).toMatchObject({ complete: false, totalScore: 0, passPercent: null, warnings: [] });
    expect(summarisePlan({ plannedQuestionCount: 10, pointsPerQuestion: 0, passScore: 5 }).complete).toBe(false);
  });
});

describe("commonScore", () => {
  it("returns the shared score, or 0 when the questions are worth different amounts", async () => {
    const { commonScore } = await import("./examPlan");
    expect(commonScore([0.25, 0.25, 0.25])).toBe(0.25);
    expect(commonScore([1, 2])).toBe(0);
    expect(commonScore([])).toBe(0);
  });
});

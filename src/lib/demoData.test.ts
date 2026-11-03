import { afterEach, describe, expect, it } from "vitest";
import {
  getDemoApiResponse,
  isDemoDataEnabled,
  setDemoDataEnabled,
} from "./demoData";
import { getMyExamSchedules } from "@/api/exams";
import { getMaterials, getQuestions } from "@/api/lecturer";

describe("staff demo data", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("uses the live Backend until demo mode is enabled", () => {
    expect(isDemoDataEnabled()).toBe(false);
    expect(getDemoApiResponse("/Questions?pageNumber=1&pageSize=10")).toBeUndefined();
  });

  it("returns API-shaped data without contacting the Backend", () => {
    setDemoDataEnabled(true);

    expect(isDemoDataEnabled()).toBe(true);
    expect(getDemoApiResponse("/Questions?pageNumber=1&pageSize=10")).toMatchObject({
      success: true,
      data: {
        totalCount: 10,
        items: expect.arrayContaining([
          expect.objectContaining({ status: "Active" }),
          expect.objectContaining({ status: "Draft" }),
        ]),
      },
    });
  });

  it("provides schedules and attendance data for both staff roles", () => {
    setDemoDataEnabled(true);

    expect(getDemoApiResponse("/ExamSchedules?pageNumber=1&pageSize=20")).toMatchObject({
      success: true,
      data: { totalCount: 3 },
    });
    expect(getDemoApiResponse("/lecturer/exam-schedules/demo-schedule/students")).toMatchObject({
      success: true,
      data: { totalCount: 28 },
    });
  });

  it("matches the Lecturer schedule API schema", async () => {
    setDemoDataEnabled(true);

    const result = await getMyExamSchedules();

    expect(result.totalCount).toBe(3);
    expect(result.items.map((item) => item.invigilatorRole)).toEqual([
      "Chief",
      "Assistant",
      "Assistant",
    ]);
  });

  it("matches every API schema used by the Lecturer dashboard", async () => {
    setDemoDataEnabled(true);

    const [questionResult, materialResult, scheduleResult] = await Promise.all([
      getQuestions({ PageNumber: 1, PageSize: 100 }),
      getMaterials({ PageNumber: 1, PageSize: 100 }),
      getMyExamSchedules(),
    ]);

    expect(questionResult.totalCount).toBe(10);
    expect(materialResult.totalCount).toBe(4);
    expect(scheduleResult.totalCount).toBe(3);
  });
});

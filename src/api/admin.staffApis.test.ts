import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

import {
  activateUser,
  changeUserRole,
  getCurriculumSubjects,
  getUniversityExamPolicy,
  readCurriculumSubjects,
  resetUserPassword,
  setCurriculumSubjects,
  updateStudentAcademic,
  updateUniversityExamPolicy,
} from "./admin";

const userId = "11111111-1111-4111-8111-111111111111";
const revision = "22222222-2222-4222-8222-222222222222";
const tag = '"11111111111141118111111111111111-22222222222242228222222222222222"';
const ok = { success: true, message: null, errors: null, data: null };
const calls = () => client.request.mock.calls.map(([path, , init]) => ({ path: path as string, init: init as RequestInit & { json?: unknown } }));

describe("Staff account and academic writes", () => {
  beforeEach(() => {
    client.request.mockReset();
    client.request.mockResolvedValue(ok);
  });

  it("reactivates an account with the revision as an If-Match tag", async () => {
    await activateUser(userId, revision);
    expect(calls()[0]).toEqual({ path: `/Users/${userId}/activate`, init: { method: "PATCH", headers: { "If-Match": tag } } });
  });

  it("sends no If-Match header when the revision is unknown", async () => {
    await activateUser(userId);
    expect(calls()[0].init).toEqual({ method: "PATCH" });
    await activateUser(userId, null);
    expect(calls()[1].init).toEqual({ method: "PATCH" });
  });

  it("resets a password with the temporary password and the reason", async () => {
    await resetUserPassword(userId, { temporaryPassword: "Temp#1234", reason: "Locked out" }, revision);
    expect(calls()[0]).toEqual({ path: `/Users/${userId}/reset-password`, init: { method: "POST", headers: { "If-Match": tag }, json: { temporaryPassword: "Temp#1234", reason: "Locked out" } } });
  });

  it("changes a role with the reason", async () => {
    await changeUserRole(userId, { role: "Lecturer", reason: "Moved to teaching" }, revision);
    expect(calls()[0]).toEqual({ path: `/Users/${userId}/role`, init: { method: "PATCH", headers: { "If-Match": tag }, json: { role: "Lecturer", reason: "Moved to teaching" } } });
  });

  it("updates the academic record using the academic revision", async () => {
    await updateStudentAcademic(userId, { majorId: "m", curriculumId: "c", intakeYear: 2026 }, revision);
    expect(calls()[0]).toEqual({ path: `/StudentProfiles/${userId}`, init: { method: "PUT", headers: { "If-Match": tag }, json: { majorId: "m", curriculumId: "c", intakeYear: 2026 } } });
  });

  it("reports a rejected write instead of treating it as saved", async () => {
    client.request.mockResolvedValue({ success: false, message: "Resource changed. Reload and retry.", errors: null });
    await expect(activateUser(userId, revision)).rejects.toThrow();
  });
});

describe("Default exam policy", () => {
  const policy = { defaultDurationMinutes: 90, shuffleQuestions: true, shuffleOptions: false, scoringPolicy: "AllOrNothing", cameraRequired: true, cameraUnavailablePolicy: "AllowWithFlag" };
  beforeEach(() => client.request.mockReset());

  it("returns null until the university has saved a policy", async () => {
    client.request.mockResolvedValue(ok);
    await expect(getUniversityExamPolicy("u1")).resolves.toBeNull();
  });

  it("returns the saved policy", async () => {
    client.request.mockResolvedValue({ ...ok, data: { ...policy, revision } });
    await expect(getUniversityExamPolicy("u1")).resolves.toEqual({ ...policy, revision });
    expect(calls()[0].path).toBe("/Universities/u1/default-exam-policy");
  });

  it("fails when the Backend reports a failure", async () => {
    client.request.mockResolvedValue({ success: false, message: "Forbidden", errors: null, data: null });
    await expect(getUniversityExamPolicy("u1")).rejects.toThrow();
  });

  it("saves the policy keyed by the university", async () => {
    client.request.mockResolvedValue(ok);
    await updateUniversityExamPolicy(userId, { ...policy, scoringPolicy: "AllOrNothing", cameraUnavailablePolicy: "Block" }, revision);
    expect(calls()[0].path).toBe(`/Universities/${userId}/default-exam-policy`);
    expect(calls()[0].init).toMatchObject({ method: "PUT", headers: { "If-Match": tag }, json: { defaultDurationMinutes: 90, cameraUnavailablePolicy: "Block" } });
  });
});

describe("Curriculum subjects", () => {
  beforeEach(() => client.request.mockReset());

  it("reads a bare list of ids", () => {
    expect(readCurriculumSubjects(["a", "b", "a"])).toEqual({ subjectIds: ["a", "b"], revision: null });
  });

  it.each([["subjectIds", ["a", "b"]], ["subjects", [{ subjectId: "a" }, { subjectId: "b" }]], ["items", [{ subjectId: "a" }, "b"]]])("reads a list held under %s together with its revision", (key, list) => {
    expect(readCurriculumSubjects({ [key]: list, revision })).toEqual({ subjectIds: ["a", "b"], revision });
  });

  it("treats a missing payload as an empty assignment", () => {
    expect(readCurriculumSubjects(null)).toEqual({ subjectIds: [], revision: null });
    expect(readCurriculumSubjects([])).toEqual({ subjectIds: [], revision: null });
  });

  it("refuses a shape it cannot read rather than showing an empty set", () => {
    expect(() => readCurriculumSubjects({ something: "else" })).toThrow();
    expect(() => readCurriculumSubjects("text")).toThrow();
    expect(() => readCurriculumSubjects([{ id: "a" }])).toThrow();
    expect(() => readCurriculumSubjects(["a", { name: "no id" }])).toThrow();
  });

  it("loads the assigned subjects of a curriculum", async () => {
    client.request.mockResolvedValue({ success: true, data: { subjectIds: ["a"], revision } });
    await expect(getCurriculumSubjects("c1")).resolves.toEqual({ subjectIds: ["a"], revision });
    expect(calls()[0].path).toBe("/Curriculums/c1/subjects");
  });

  it("replaces the whole set with the full id list", async () => {
    client.request.mockResolvedValue(ok);
    await setCurriculumSubjects(userId, ["a", "b"], revision);
    expect(calls()[0]).toEqual({ path: `/Curriculums/${userId}/subjects`, init: { method: "PUT", headers: { "If-Match": tag }, json: { subjectIds: ["a", "b"] } } });
  });
});

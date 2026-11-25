import { getMyExamResult } from "./results";

const id = "5d000000-0000-4000-8000-000000000004";
const reply = (data: unknown, status = 200, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Refused.", data, errors: null }), { status });

describe("student exam result API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the result of one schedule from /me/exam-schedules/{id}/result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({ totalScore: 8, maxScore: 10, gradingStatus: "Complete", submittedAt: "2026-11-04T02:20:00Z", releasedAt: "2026-11-07T03:00:00Z" }),
    );
    expect(await getMyExamResult(id)).toEqual({
      scheduleId: id,
      score: 8,
      maxScore: 10,
      scoreOnTen: null,
      passed: null,
      status: "graded",
      submittedAt: "2026-11-04T02:20:00Z",
      releasedAt: "2026-11-07T03:00:00Z",
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(new RegExp(`/me/exam-schedules/${id}/result$`));
  });

  it("reports grading that is not complete as pending", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ totalScore: 6.5, maxScore: 10, gradingStatus: "NeedsManual" }));
    expect(await getMyExamResult(id)).toMatchObject({ score: 6.5, status: "pending" });
  });

  it("tolerates a body without the expected fields instead of failing the page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ somethingElse: true }));
    expect(await getMyExamResult(id)).toEqual({
      scheduleId: id, score: null, maxScore: null, scoreOnTen: null, passed: null, status: "pending", submittedAt: null, releasedAt: null,
    });
  });

  it("reads the score nested in `result`, as the practice result sends it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        result: { totalScore: 7.5, maxScore: 10, scoreOnTen: 7.5, passed: true, gradingStatus: "Completed", submittedAt: "2026-11-04T02:20:00Z" },
        review: [],
        releasedAt: "2026-11-07T03:00:00Z",
      }),
    );
    expect(await getMyExamResult(id)).toEqual({
      scheduleId: id,
      score: 7.5,
      maxScore: 10,
      scoreOnTen: 7.5,
      passed: true,
      status: "graded",
      submittedAt: "2026-11-04T02:20:00Z",
      releasedAt: "2026-11-07T03:00:00Z",
    });
  });

  it.each([404, 403, 409])("treats %i as a result that is not available yet", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, status, false));
    expect(await getMyExamResult(id)).toBeNull();
  });

  it("still fails on a server error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, 500, false));
    await expect(getMyExamResult(id)).rejects.toMatchObject({ detail: { kind: "server", status: 500 } });
  });
});

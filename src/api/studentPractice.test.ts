import {
  listMyPracticeSessions,
  savePracticeAnswer,
  startPracticeAttempt,
  submitPracticeAttempt,
} from "./studentPractice";

const reply = (data: unknown, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Not open.", data, errors: null }));
const attempt = {
  attemptId: "a-1",
  sessionId: "s-1",
  status: "Active",
  startedAt: "2026-11-25T08:00:00Z",
  deadlineAt: "2026-11-25T08:30:00Z",
  serverNow: "2026-11-25T08:00:05Z",
  questions: null,
  answers: null,
};
const operation = {
  operationId: "op-1",
  attemptQuestionId: "q-1",
  baseRevision: 2,
  revision: 3,
  answer: { kind: "Single" as const, selectedOptionIds: ["o-1"] },
};

describe("student practice API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the student's sessions from /me/practice-sessions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply([]));
    expect(await listMyPracticeSessions()).toEqual([]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me\/practice-sessions$/);
  });

  it("starts or resumes the attempt with a POST and reads empty lists as empty", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(attempt));
    const started = await startPracticeAttempt("s-1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me\/practice-sessions\/s-1\/attempt$/);
    expect(started.questions).toEqual([]);
    expect(started.answers).toEqual([]);
  });

  it("saves one answer as a FinalAnswerRequestModel", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        attemptId: "a-1",
        attemptQuestionId: "q-1",
        operationId: "op-1",
        acceptedRevision: 3,
        serverSavedAt: "",
        serverNow: "",
        deadlineAt: "",
        status: "Active",
      }),
    );
    expect((await savePracticeAnswer("s-1", operation)).acceptedRevision).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/practice-sessions\/s-1\/answers$/);
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual(operation);
  });

  it("submits with an operation id and every final answer", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply({ ...attempt, status: "Submitted", submittedAt: "2026-11-25T08:10:00Z" }));
    await submitPracticeAttempt("s-1", [operation]);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.operationId).toEqual(expect.any(String));
    expect(body.finalAnswers).toEqual([operation]);
  });

  it("fails with the Backend's message when it refuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, false));
    await expect(startPracticeAttempt("s-1")).rejects.toMatchObject({ serverMessage: "Not open." });
  });
});

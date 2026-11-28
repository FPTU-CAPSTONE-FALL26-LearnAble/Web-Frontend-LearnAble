import { setupServer } from "msw/node";
import { studentPracticeHandlers } from "./studentPractice";

/** The offline practice mock runs C programs by script, as the desktop mock does. */

const server = setupServer(...studentPracticeHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => vi.useRealTimers());

const OPEN = "7b000000-0000-4000-8000-000000000001";
const RELEASED = "7b000000-0000-4000-8000-000000000003";
const base = `http://localhost/api/v1/me/practice-sessions/${OPEN}`;

const call = async (url: string, method = "GET", json?: unknown) => {
  const response = await fetch(url, {
    method,
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
  });
  return { status: response.status, body: await response.json() };
};

let revision = 0;
async function saveAndRun(attemptId: string, sourceCode: string) {
  revision += 1;
  await call(`${base}/answers`, "PUT", {
    operationId: crypto.randomUUID(),
    attemptQuestionId: "q-4",
    baseRevision: revision - 1,
    revision,
    answer: { kind: "Coding", sourceCode, languageCode: "c-gcc-9.2.0" },
  });
  return call(`${base}/attempts/${attemptId}/questions/q-4/code-runs`, "POST", {
    operationId: crypto.randomUUID(),
    expectedRevision: revision,
  });
}

describe("practice mock: coding", () => {
  it("runs a saved C program: queued, running, then the scripted result, up to the run limit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { body: started } = await call(`${base}/attempt`, "POST");
    const coding = started.data.questions.find((q: { questionType: string }) => q.questionType === "Coding");
    expect(coding.coding).toMatchObject({ languageCode: "c-gcc-9.2.0", examples: expect.any(Array) });

    const run = await saveAndRun(started.data.attemptId, "int main(void) { return x % 2; }");
    expect(run.status).toBe(202);
    const job = `http://localhost/api/v1/me/coding-jobs/${run.body.data.submissionId}`;
    expect(run.body.data.status).toBe("Pending");
    vi.advanceTimersByTime(1000);
    expect((await call(job)).body.data.status).toBe("Running");
    vi.advanceTimersByTime(1000);
    const done = (await call(job)).body.data;
    expect(done.status).toBe("Completed");
    expect(done.publicResults.map((r: { verdict: string }) => r.verdict)).toEqual(["Accepted", "Accepted", "Accepted"]);

    const broken = await saveAndRun(started.data.attemptId, "int main(void) {\n#error missing semicolon\n}");
    vi.advanceTimersByTime(2000);
    const compile = (await call(`http://localhost/api/v1/me/coding-jobs/${broken.body.data.submissionId}`)).body.data;
    expect(compile.publicResults[0]).toMatchObject({ verdict: "CompilationError", compilationOutput: expect.stringContaining("main.c:2:2") });

    for (let i = 3; i <= 10; i++) expect((await saveAndRun(started.data.attemptId, "int x;")).status).toBe(202);
    const refused = await saveAndRun(started.data.attemptId, "int x;");
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      message: "The Coding limit for this question has been reached.",
      errors: ["CODING_REQUEST_REJECTED"],
    });
    // Eleven runs at the mock's own delays.
  }, 20_000);

  it("keeps the released session's saved program for its review", async () => {
    const { body } = await call(`http://localhost/api/v1/me/practice-sessions/${RELEASED}/attempt`);
    expect(body.data.status).toBe("Submitted");
    expect(body.data.answers[0]).toMatchObject({ attemptQuestionId: "q-4", answer: { kind: "Coding", sourceCode: expect.stringContaining("scanf") } });
    const { body: result } = await call(`http://localhost/api/v1/me/practice-sessions/${RELEASED}/result`);
    expect(result.data.result.gradingStatus).toBe("Complete");
    expect(result.data.review.find((q: { questionType: string }) => q.questionType === "Coding")).toMatchObject({
      score: 0,
      referenceAnswer: expect.stringContaining("x % 2 == 0"),
    });
  });
});

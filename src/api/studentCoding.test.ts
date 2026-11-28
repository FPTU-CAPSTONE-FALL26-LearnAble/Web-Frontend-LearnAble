import { studentQuestionSchema } from "@/api/assessmentAttempt";
import {
  CODE_RUN_LIMIT_MS,
  CodeRunFailed,
  codeRunPollDelay,
  getCodingJob,
  runPracticeCode,
  startPracticeCodeRun,
} from "@/api/studentCoding";

const target = { sessionId: "s-1", attemptId: "a-1", questionId: "q-1" };
const runUrl = "/api/v1/me/practice-sessions/s-1/attempts/a-1/questions/q-1/code-runs";
const jobUrl = (id: string) => `/api/v1/me/coding-jobs/${id}`;

const ok = (data: unknown) => JSON.stringify({ success: true, message: null, data, errors: null });
const job = (status: string, publicResults: unknown = null) => ({ submissionId: "job-1", status, publicResults });
const passed = { verdict: "Accepted", stdout: "6\n", stderr: null, compilationOutput: null };
const limitReached = JSON.stringify({
  success: false,
  message: "The Coding limit for this question has been reached.",
  data: null,
  errors: ["CODING_REQUEST_REJECTED"],
});

/** Answers each fetch with the next body; the last one repeats. An Error is thrown as a lost request. */
function respond(...bodies: (string | Error | { status: number; body: string })[]) {
  const fetcher = vi.fn<typeof fetch>(async () => {
    const next = bodies.length > 1 ? bodies.shift()! : bodies[0];
    if (next instanceof Error) throw next;
    if (typeof next === "string") return new Response(next, { status: 200 });
    return new Response(next.body, { status: next.status });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

/** A fake clock the waits advance, so the poll schedule can be read back. */
function clock() {
  let time = 0;
  const waits: number[] = [];
  return {
    waits,
    now: () => time,
    wait: vi.fn(async (ms: number) => {
      waits.push(ms);
      time += ms;
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("coding question in the attempt", () => {
  const question = {
    attemptQuestionId: "q-1",
    questionType: "Coding",
    position: 1,
    content: "Sum the even numbers.",
    options: [],
  };
  const coding = {
    languageCode: "c-gcc-9.2.0",
    starterCode: "int main(void) { return 0; }",
    starterCodes: { "c-gcc-9.2.0": "int main(void) { return 0; }", "c-clang-7.0.1": "int main(void) {}" },
    inputDescription: "n, then n integers.",
    outputDescription: "The sum.",
    constraints: "1 ≤ n ≤ 1000",
    cpuSeconds: 2,
    wallSeconds: 5,
    memoryKb: 128000,
    examples: [{ input: "5\n1 2 3 4 5\n", expectedOutput: "6\n" }],
  };

  it("keeps the problem's samples, starter code and limits", () => {
    expect(studentQuestionSchema.parse({ ...question, coding }).coding).toEqual(coding);
  });

  it("reads a question without coding, as every other type is sent", () => {
    expect(studentQuestionSchema.parse({ ...question, questionType: "Single" }).coding).toBeUndefined();
    expect(studentQuestionSchema.parse({ ...question, coding: null }).coding).toBeNull();
  });
});

describe("practice code-run contract", () => {
  it("starts a run of the saved revision at the practice route", async () => {
    const fetcher = respond({ status: 202, body: ok(job("Pending")) });
    await expect(startPracticeCodeRun(target, "op-1", 3)).resolves.toEqual(job("Pending"));
    const [url, init] = fetcher.mock.calls[0];
    expect([String(url), init?.method]).toEqual([runUrl, "POST"]);
    expect(JSON.parse(String(init?.body))).toEqual({ operationId: "op-1", expectedRevision: 3 });
  });

  it("turns a refusal into a refused run with only the Backend's reason", async () => {
    respond({ status: 409, body: limitReached });
    const refused = startPracticeCodeRun(target, "op-1", 3);
    await expect(refused).rejects.toBeInstanceOf(CodeRunFailed);
    await expect(refused).rejects.toMatchObject({
      reason: "refused",
      serverMessage: "The Coding limit for this question has been reached.",
    });
  });

  it("leaves other failures as they are", async () => {
    respond({ status: 400, body: JSON.stringify({ success: false, message: "Invalid revision.", errors: null }) });
    await expect(startPracticeCodeRun(target, "op-1", 0)).rejects.toMatchObject({
      detail: { kind: "server", status: 400 },
    });
  });

  it.each([
    ["pending", job("Pending")],
    ["running", job("Running")],
    ["completed", job("Completed", [passed])],
    ["compile error", job("Completed", [{ ...passed, verdict: "CompilationError", stdout: null, compilationOutput: "main.c:1:1: error: x" }])],
    ["infrastructure failure", job("InfrastructureFailed")],
  ])("reads a %s poll", async (_name, polled) => {
    const fetcher = respond(ok(polled));
    await expect(getCodingJob("job-1")).resolves.toEqual(polled);
    expect(String(fetcher.mock.calls[0][0])).toBe(jobUrl("job-1"));
  });

  it.each<[string, Record<string, unknown>]>([
    ["results before the run completes", job("Running", [passed])],
    ["a completed run without results", job("Completed", null)],
    ["an unknown verdict", job("Completed", [{ ...passed, verdict: "MemoryLimitExceeded" }])],
    ["a graded submission's status", job("Submitted")],
    ["another job's identity", { ...job("Running"), submissionId: "job-2" }],
  ])("rejects %s", async (_name, polled) => {
    respond(ok(polled));
    await expect(getCodingJob("job-1")).rejects.toMatchObject({ detail: { kind: "parse" } });
  });
});

describe("a practice run from start to results", () => {
  it("polls the queued run until it completes, every second at first", async () => {
    const done = job("Completed", [passed]);
    const fetcher = respond(ok(job("Pending")), ok(job("Pending")), ok(job("Running")), ok(done));
    const time = clock();
    await expect(runPracticeCode(target, 1, time)).resolves.toEqual(done);
    expect(time.waits).toEqual([1_000, 1_000, 1_000]);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([runUrl, ...Array(3).fill(jobUrl("job-1"))]);
  });

  it("slows to every two seconds after five and gives up at thirty, telling which run it left", async () => {
    respond(ok(job("Pending")));
    const time = clock();
    const failure = runPracticeCode(target, 1, time);
    await expect(failure).rejects.toMatchObject({ reason: "timeout", submissionId: "job-1" });
    expect(time.waits).toEqual([...Array(5).fill(1_000), ...Array(12).fill(2_000), 1_000]);
    expect(time.now()).toBe(CODE_RUN_LIMIT_MS);
    expect([0, 4_999, 5_000].map(codeRunPollDelay)).toEqual([1_000, 1_000, 2_000]);
  });

  it("reports a sandbox failure as a run that couldn't finish", async () => {
    respond(ok(job("Pending")), ok(job("InfrastructureFailed")));
    await expect(runPracticeCode(target, 1, clock())).rejects.toMatchObject({ reason: "infrastructure" });
  });

  it("sends a lost start again as the same run and keeps polling through a lost poll", async () => {
    const fetcher = respond(
      new TypeError("offline"),
      ok(job("Pending")),
      new TypeError("offline"),
      ok(job("Completed", [passed])),
    );
    await expect(runPracticeCode(target, 1, { ...clock(), operationId: "op-1" })).resolves.toMatchObject({
      status: "Completed",
    });
    const starts = fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(starts.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      { operationId: "op-1", expectedRevision: 1 },
      { operationId: "op-1", expectedRevision: 1 },
    ]);
  });

  it("passes a refusal straight through without polling", async () => {
    const fetcher = respond({ status: 409, body: limitReached });
    await expect(runPracticeCode(target, 1, clock())).rejects.toMatchObject({ reason: "refused" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("stops waiting when the run is abandoned", async () => {
    respond(ok(job("Pending")));
    const controller = new AbortController();
    const running = runPracticeCode(target, 1, { signal: controller.signal });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await expect(running).rejects.toMatchObject({ name: "AbortError" });
  });
});

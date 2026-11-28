import { HttpResponse, delay, http } from "msw";

/**
 * Offline stand-in for `StudentPracticeSessions` (see `src/api/studentPractice.ts`),
 * used only when `VITE_USE_MSW=true`. Bodies follow the OpenAPI response models;
 * grading is computed here only so the result screen has something to show.
 */

const ok = <T,>(data: T) => HttpResponse.json({ success: true, message: null, data, errors: null });
const fail = (status: number, message: string, errors: string[] | null = null) =>
  HttpResponse.json({ success: false, message, data: null, errors }, { status });

const hour = 60 * 60 * 1000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const OPEN = "7b000000-0000-4000-8000-000000000001";
const UPCOMING = "7b000000-0000-4000-8000-000000000002";
const RELEASED = "7b000000-0000-4000-8000-000000000003";

const sessions = () => [
  {
    sessionId: OPEN, examSubjectId: "s-1", examPaperId: "p-1", name: "PRO192 · Object-oriented basics",
    status: "Open", opensAt: iso(-hour), closesAt: iso(3 * hour), durationMinutes: 30, registered: 40,
    revision: "1", releasedAt: null,
  },
  {
    sessionId: UPCOMING, examSubjectId: "s-2", examPaperId: "p-2", name: "MAD101 · Sets and relations",
    status: "Scheduled", opensAt: iso(24 * hour), closesAt: iso(26 * hour), durationMinutes: 45, registered: 38,
    revision: "1", releasedAt: null,
  },
  {
    sessionId: RELEASED, examSubjectId: "s-1", examPaperId: "p-1", name: "PRO192 · Warm-up quiz",
    status: "Completed", opensAt: iso(-72 * hour), closesAt: iso(-70 * hour), durationMinutes: 20, registered: 40,
    revision: "3", releasedAt: iso(-48 * hour),
  },
];

const option = (id: string, position: number, content: string) => ({
  optionId: id, position, label: String.fromCharCode(64 + position), content, audio: null,
});

const CODING = "q-4";
const CODING_STARTER = "#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n";
const CODING_REFERENCE = [
  "#include <stdio.h>",
  "",
  "int main(void) {",
  "    int n, x;",
  "    long sum = 0;",
  "    scanf(\"%d\", &n);",
  "    for (int i = 0; i < n; i++) {",
  "        scanf(\"%d\", &x);",
  "        if (x % 2 == 0) sum += x;",
  "    }",
  "    printf(\"%ld\\n\", sum);",
  "    return 0;",
  "}",
  "",
].join("\n");
const CODING_EXAMPLES = [
  { input: "5\n1 2 3 4 5", expectedOutput: "6" },
  { input: "3\n7 9 11", expectedOutput: "0" },
  { input: "4\n-2 4 0 3", expectedOutput: "2" },
];

const questions = [
  {
    attemptQuestionId: "q-1", questionType: "Single", position: 1, maxWords: null, audio: null, images: [], answerFormat: null,
    content: "Which keyword creates a new object in Java?",
    options: [option("q1-a", 1, "new"), option("q1-b", 2, "create"), option("q1-c", 3, "make"), option("q1-d", 4, "object")],
  },
  {
    attemptQuestionId: "q-2", questionType: "Multiple", position: 2, maxWords: null, audio: null, images: [], answerFormat: null,
    content: "Which of these are access modifiers in Java? Choose all that apply.",
    options: [option("q2-a", 1, "public"), option("q2-b", 2, "private"), option("q2-c", 3, "static"), option("q2-d", 4, "protected")],
  },
  {
    attemptQuestionId: "q-3", questionType: "Essay", position: 3, maxWords: 150, audio: null, images: [], answerFormat: null, options: [],
    content: "In two or three sentences, explain the difference between a class and an object.",
  },
  {
    // C, as on the desktop mock (`fixtures/backend-mock/server.mjs`). Only the public tests are sent, as examples.
    attemptQuestionId: CODING, questionType: "Coding", position: 4, maxWords: null, audio: null, images: [], answerFormat: null, options: [],
    content: "Read a whole number `n`, then `n` integers. Print the sum of the integers that are **even**.\n\nNegative numbers and 0 count too.",
    coding: {
      languageCode: "c-gcc-9.2.0",
      starterCode: CODING_STARTER,
      starterCodes: { "c-gcc-9.2.0": CODING_STARTER },
      inputDescription: "The first line holds `n`. The second line holds `n` integers separated by spaces.",
      outputDescription: "One line with the sum of the even integers.",
      constraints: "1 <= n <= 1000; each integer is between -1000000 and 1000000.",
      cpuSeconds: 1,
      wallSeconds: 2,
      memoryKb: 65536,
      examples: CODING_EXAMPLES,
    },
  },
];
const correct: Record<string, string[]> = { "q-1": ["q1-a"], "q-2": ["q2-a", "q2-b", "q2-d"] };

type Stored = { attemptQuestionId: string; answer: Record<string, unknown>; revision: number; lastOperationId: string; serverSavedAt: string };
let attempt: { attemptId: string; startedAt: string; deadlineAt: string; submittedAt: string | null; answers: Map<string, Stored> } | null = null;

const attemptBody = () => ({
  attemptId: attempt!.attemptId, sessionId: OPEN, status: attempt!.submittedAt ? "Submitted" : "Active",
  startedAt: attempt!.startedAt, deadlineAt: attempt!.deadlineAt, submittedAt: attempt!.submittedAt,
  submissionReason: attempt!.submittedAt ? "Student" : null, serverNow: new Date().toISOString(),
  questions, answers: [...attempt!.answers.values()],
});

function store(operation: { operationId: string; attemptQuestionId: string; revision?: number; answer: Record<string, unknown> }) {
  const saved = {
    attemptQuestionId: operation.attemptQuestionId, answer: operation.answer,
    revision: operation.revision ?? (attempt!.answers.get(operation.attemptQuestionId)?.revision ?? 0) + 1,
    lastOperationId: operation.operationId, serverSavedAt: new Date().toISOString(),
  };
  attempt!.answers.set(operation.attemptQuestionId, saved);
  return saved;
}

const review = (selected: (id: string) => string[], text: (id: string) => string | null) =>
  questions.map((q) => {
    const chosen = selected(q.attemptQuestionId);
    const right = correct[q.attemptQuestionId];
    const auto = Boolean(right);
    const score = auto ? (right.length === chosen.length && right.every((id) => chosen.includes(id)) ? 1 : 0) : null;
    return {
      attemptQuestionId: q.attemptQuestionId, position: q.position, questionType: q.questionType, content: q.content,
      answerText: text(q.attemptQuestionId),
      referenceAnswer: q.questionType === "Essay" ? "A class is a blueprint; an object is one instance built from it."
        : q.questionType === "Coding" ? CODING_REFERENCE : null,
      gradingCriteria: null, maxScore: 1, score, gradingMethod: auto ? "Automatic" : "Manual", gradedBy: null, gradedAt: null,
      feedback: null, selectedOptionIds: chosen, images: [], answerFormat: null,
      options: q.options.map((o) => ({ optionId: o.optionId, position: o.position, content: o.content, isCorrect: right?.includes(o.optionId) ?? false })),
    };
  });

/**
 * Scripted sandbox results, chosen by what the program contains (there is no compiler here), as on the desktop mock:
 * `#error` → compile error at that line; `MOCK_INFRA` → sandbox failure; `for (;;)` or `while (1)` → time limit;
 * `NULL` → runtime error; `% 2` → every example passes; anything else prints nothing, so examples expecting output fail.
 */
function scriptRun(sourceCode: string) {
  const every = (result: object) => CODING_EXAMPLES.map(() => ({ stdout: null, stderr: null, compilationOutput: null, ...result }));
  const lines = sourceCode.split("\n");
  const errorLine = lines.findIndex((line) => line.includes("#error"));
  if (errorLine >= 0) {
    const column = lines[errorLine].indexOf("#error") + 2;
    return { status: "Completed", publicResults: every({ verdict: "CompilationError",
      compilationOutput: `main.c: In function 'main':\nmain.c:${errorLine + 1}:${column}: error: #error ${lines[errorLine].split("#error")[1].trim()}\n` }) };
  }
  if (sourceCode.includes("MOCK_INFRA")) return { status: "InfrastructureFailed", publicResults: null };
  if (/for\s*\(\s*;\s*;\s*\)|while\s*\(\s*1\s*\)/.test(sourceCode)) return { status: "Completed", publicResults: every({ verdict: "TimeLimitExceeded" }) };
  if (sourceCode.includes("NULL")) return { status: "Completed", publicResults: every({ verdict: "RuntimeError", stderr: "Segmentation fault (core dumped)\n" }) };
  const solved = sourceCode.includes("% 2");
  return { status: "Completed", publicResults: CODING_EXAMPLES.map((example) => {
    const stdout = solved ? `${example.expectedOutput}\n` : "";
    return { verdict: stdout.trim() === example.expectedOutput ? "Accepted" : "WrongAnswer", stdout, stderr: null, compilationOutput: null };
  }) };
}

const CODE_RUN_LIMIT = 10;
type Job = { operationId: string; revision: number; createdAt: number; result: ReturnType<typeof scriptRun> };
const jobs = new Map<string, Job>();

/** A run as the student polls it: queued, running, then its scripted result. */
function jobView(submissionId: string, job: Job) {
  const elapsed = Date.now() - job.createdAt;
  const status = elapsed < 700 ? "Pending" : elapsed < 1500 ? "Running" : job.result.status;
  return { submissionId, status, publicResults: status === "Completed" ? job.result.publicResults : null };
}
const accepted = <T,>(data: T) => HttpResponse.json({ success: true, message: null, data, errors: null }, { status: 202 });

/** The released session's submitted attempt: the review reads the saved program from it. */
const RELEASED_PROGRAM = "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    printf(\"%d\\n\", n);\n    return 0;\n}\n";
const releasedAttempt = () => ({
  attemptId: "8c000000-0000-4000-8000-000000000003", sessionId: RELEASED, status: "Submitted",
  startedAt: iso(-71.5 * hour), deadlineAt: iso(-71 * hour), submittedAt: iso(-71 * hour), submissionReason: "Student",
  serverNow: new Date().toISOString(), questions,
  answers: [{
    attemptQuestionId: CODING, answer: { kind: "Coding", sourceCode: RELEASED_PROGRAM, languageCode: "c-gcc-9.2.0" },
    revision: 6, lastOperationId: "8c000000-0000-4000-8000-0000000000aa", serverSavedAt: iso(-71 * hour),
  }],
});

export const studentPracticeHandlers = [
  http.get("*/me/practice-sessions", async () => {
    await delay(250);
    return ok(sessions());
  }),

  http.post("*/me/practice-sessions/:id/attempt", async ({ params }) => {
    await delay(300);
    if (params.id !== OPEN) return fail(409, "This practice session is not open.");
    attempt ??= {
      attemptId: "8c000000-0000-4000-8000-000000000001", startedAt: new Date().toISOString(),
      deadlineAt: iso(30 * 60 * 1000), submittedAt: null, answers: new Map(),
    };
    return ok(attemptBody());
  }),

  http.get("*/me/practice-sessions/:id/attempt", async ({ params }) => {
    await delay(200);
    if (params.id === RELEASED) return ok(releasedAttempt());
    return attempt && params.id === OPEN ? ok(attemptBody()) : fail(404, "No attempt has been started.");
  }),

  // Run the saved program against the examples (CodingAttemptController), then poll the job.
  http.post("*/me/practice-sessions/:id/attempts/:attemptId/questions/:questionId/code-runs", async ({ params, request }) => {
    await delay(200);
    if (!attempt || params.id !== OPEN || params.attemptId !== attempt.attemptId) return fail(404, "Attempt not found.");
    if (params.questionId !== CODING) return fail(400, "Select a Coding question.");
    const body = (await request.json()) as { operationId: string; expectedRevision: number };
    const existing = [...jobs.entries()].find(([, job]) => job.operationId === body.operationId);
    if (existing) {
      return existing[1].revision === body.expectedRevision
        ? accepted(jobView(...existing))
        : fail(409, "Operation ID was already used for a different request.", ["CODING_REQUEST_REJECTED"]);
    }
    const saved = attempt.answers.get(CODING);
    const sourceCode = typeof saved?.answer.sourceCode === "string" ? saved.answer.sourceCode : "";
    const refusal = attempt.submittedAt || Date.now() > Date.parse(attempt.deadlineAt) ? "The attempt is no longer accepting code."
      : !saved || saved.revision !== body.expectedRevision || !sourceCode.trim() ? "Save a valid Coding answer before running or submitting."
      : jobs.size >= CODE_RUN_LIMIT ? "The Coding limit for this question has been reached." : null;
    if (refusal) return fail(409, refusal, ["CODING_REQUEST_REJECTED"]);
    const submissionId = crypto.randomUUID();
    const job = { operationId: body.operationId, revision: body.expectedRevision, createdAt: Date.now(), result: scriptRun(sourceCode) };
    jobs.set(submissionId, job);
    return accepted(jobView(submissionId, job));
  }),

  http.get("*/me/coding-jobs/:id", async ({ params }) => {
    await delay(150);
    const job = jobs.get(String(params.id));
    return job ? ok(jobView(String(params.id), job)) : fail(404, "Coding submission not found.");
  }),

  http.put("*/me/practice-sessions/:id/answers", async ({ request }) => {
    await delay(250);
    if (!attempt || attempt.submittedAt) return fail(409, "The attempt is not active.");
    const saved = store((await request.json()) as Parameters<typeof store>[0]);
    return ok({
      attemptId: attempt.attemptId, attemptQuestionId: saved.attemptQuestionId, operationId: saved.lastOperationId,
      acceptedRevision: saved.revision, serverSavedAt: saved.serverSavedAt, serverNow: new Date().toISOString(),
      deadlineAt: attempt.deadlineAt, status: "Active",
    });
  }),

  http.post("*/me/practice-sessions/:id/submit", async ({ request }) => {
    await delay(400);
    if (!attempt) return fail(404, "No attempt has been started.");
    const body = (await request.json()) as { finalAnswers?: Parameters<typeof store>[0][] };
    body.finalAnswers?.forEach(store);
    attempt.submittedAt = new Date().toISOString();
    return ok(attemptBody());
  }),

  http.get("*/me/practice-sessions/:id/result", async ({ params }) => {
    await delay(250);
    if (params.id === RELEASED) {
      const items = review((id) => (id === "q-1" ? ["q1-a"] : id === "q-2" ? ["q2-a", "q2-c"] : []), (id) => (id === "q-3" ? "A class describes objects." : null));
      return ok({
        result: { studentId: "me", attemptId: "old", participation: "Submitted", submittedAt: iso(-71 * hour), gradingStatus: "Complete", autoScore: 1, manualScore: 1, totalScore: 2, maxScore: 4, scoreOnTen: 5, passed: true },
        review: items.map((item) =>
          item.questionType === "Essay" ? { ...item, score: 1, feedback: "Clear and correct." }
            // The saved program prints `n`, so the hidden tests fail.
            : item.questionType === "Coding" ? { ...item, score: 0 } : item,
        ),
      });
    }
    return fail(403, "Your lecturer has not released the results of this session yet.");
  }),
];

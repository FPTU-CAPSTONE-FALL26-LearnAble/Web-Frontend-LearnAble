import { ApiFailure } from "@/api/client";
import type { CodingPublicResult, CodingRunJob } from "@/api/studentCoding";
import { parseCompilerErrors, runSavedPracticeCode, toCodeRunResult } from "./codeRun";

const examples = [
  { input: "2\n1 2\n", expectedOutput: "3\n" },
  { input: "3\n1 2 3\n", expectedOutput: "6\n" },
];
const result = (patch: Partial<CodingPublicResult> = {}): CodingPublicResult => ({
  verdict: "Accepted",
  stdout: null,
  stderr: null,
  compilationOutput: null,
  ...patch,
});
const completed = (...publicResults: CodingPublicResult[]): CodingRunJob => ({
  submissionId: "job-1",
  status: "Completed",
  publicResults,
});
const sample = (index: number) => ({
  index: index + 1,
  input: examples[index].input,
  expectedOutput: examples[index].expectedOutput,
});

afterEach(() => vi.unstubAllGlobals());

describe("code run results as the player shows them", () => {
  it("passes every example", () => {
    expect(toCodeRunResult(completed(result({ stdout: "3\n" }), result({ stdout: "6\n" })), examples)).toEqual({
      status: "compiled",
      tests: [
        { ...sample(0), outcome: "passed", actualOutput: "3\n" },
        { ...sample(1), outcome: "passed", actualOutput: "6\n" },
      ],
    });
  });

  it("shows a wrong answer next to what was expected", () => {
    const run = completed(result({ stdout: "3\n" }), result({ verdict: "WrongAnswer", stdout: "-14\n" }));
    expect(toCodeRunResult(run, examples)).toMatchObject({
      status: "compiled",
      tests: [{ outcome: "passed" }, { ...sample(1), outcome: "failed", actualOutput: "-14\n" }],
    });
  });

  it("gives a runtime error its message and a time limit none", () => {
    const crashed = completed(
      result({ stdout: "3\n" }),
      result({ verdict: "RuntimeError", stderr: "Segmentation fault (core dumped)\n" }),
    );
    expect(toCodeRunResult(crashed, examples)).toMatchObject({
      tests: [
        { outcome: "passed" },
        { outcome: "runtimeError", actualOutput: "", message: "Segmentation fault (core dumped)" },
      ],
    });
    const slow = completed(result({ verdict: "TimeLimitExceeded" }), result({ verdict: "TimeLimitExceeded" }));
    expect(toCodeRunResult(slow, examples)).toEqual({
      status: "compiled",
      tests: [0, 1].map((i) => ({ ...sample(i), outcome: "timeLimitExceeded", actualOutput: "" })),
    });
  });

  it("turns a compile error into located errors once, however many examples repeat it", () => {
    const output = "main.c: In function 'main':\nmain.c:6:30: error: expected ';' before 'return'\n";
    const failed = result({ verdict: "CompilationError", compilationOutput: output });
    expect(toCodeRunResult(completed(failed, failed), examples)).toEqual({
      status: "compileError",
      errors: [{ line: 6, column: 30, message: "expected ';' before 'return'" }],
    });
  });

  it("refuses results that do not line up with the examples", () => {
    expect(() => toCodeRunResult(completed(result(), result()), examples.slice(0, 1))).toThrow(ApiFailure);
    expect(() =>
      toCodeRunResult({ submissionId: "job-1", status: "Running", publicResults: null }, examples),
    ).toThrow(ApiFailure);
  });

  it.each<[string, string | null, ReturnType<typeof parseCompilerErrors>]>([
    [
      "gcc with columns",
      "main.c: In function 'main':\nmain.c:4:5: error: unknown type name 'itn'\nmain.c:9:1: error: expected declaration or statement at end of input\n",
      [
        { line: 4, column: 5, message: "unknown type name 'itn'" },
        { line: 9, column: 1, message: "expected declaration or statement at end of input" },
      ],
    ],
    ["a line without a column", "main.c:3: error: stray '\\302' in program", [{ line: 3, message: "stray '\\302' in program" }]],
    [
      "a fatal error",
      "main.c:1:10: fatal error: stdoi.h: No such file or directory\ncompilation terminated.",
      [{ line: 1, column: 10, message: "stdoi.h: No such file or directory" }],
    ],
    [
      "warnings and notes left out",
      "main.c:5:3: warning: unused variable 'x'\nmain.c:7:12: error: 'y' undeclared (first use in this function)\nmain.c:7:12: note: each undeclared identifier is reported only once",
      [{ line: 7, column: 12, message: "'y' undeclared (first use in this function)" }],
    ],
    ["Windows line endings", "main.c:2:1: error: expected ';'\r\n", [{ line: 2, column: 1, message: "expected ';'" }]],
    [
      "a linker error with no line",
      "/usr/bin/ld: /tmp/main.o: in function `main':\nmain.c:(.text+0x1e): undefined reference to `prinf'\ncollect2: error: ld returned 1 exit status",
      [{ line: 1, message: "main.c:(.text+0x1e): undefined reference to `prinf'" }],
    ],
    ["no output at all", null, [{ line: 1, message: "The program did not compile." }]],
  ])("reads compiler output: %s", (_name, output, errors) => {
    expect(parseCompilerErrors(output)).toEqual(errors);
  });
});

it("runs the saved answer and hands the player its results", async () => {
  const envelope = (data: unknown) => JSON.stringify({ success: true, message: null, data, errors: null });
  const bodies = [
    envelope({ submissionId: "job-1", status: "Pending", publicResults: null }),
    envelope(completed(result({ stdout: "3\n" }), result({ verdict: "WrongAnswer", stdout: "5\n" }))),
  ];
  const fetcher = vi.fn<typeof fetch>(async () => new Response(bodies.shift()));
  vi.stubGlobal("fetch", fetcher);
  const target = { sessionId: "s-1", attemptId: "a-1", questionId: "q-1" };
  await expect(
    runSavedPracticeCode(target, 4, examples, { wait: async () => {}, now: () => 0 }),
  ).resolves.toMatchObject({ status: "compiled", tests: [{ outcome: "passed" }, { outcome: "failed" }] });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ expectedRevision: 4 });
});

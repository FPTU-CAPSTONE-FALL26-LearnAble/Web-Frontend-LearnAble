import { renderHook } from "@testing-library/react";
import type { StudentQuestion } from "@/api/assessmentAttempt";
import { CodeRunFailure } from "@/shared/ui/patterns/exam/assessment-player-types";
import { useCodeRuns } from "./useCodeRuns";

const examples = [{ input: "1\n", expectedOutput: "1\n" }];
const question = (attemptQuestionId: string, languageCode = "c-gcc-9.2.0"): StudentQuestion => ({
  attemptQuestionId,
  questionType: "Coding",
  position: 1,
  content: "Echo n.",
  maxWords: null,
  audio: null,
  options: [],
  images: [],
  answerFormat: null,
  coding: {
    languageCode,
    starterCode: "",
    starterCodes: { [languageCode]: "" },
    inputDescription: "",
    outputDescription: "",
    constraints: "",
    cpuSeconds: 1,
    wallSeconds: 2,
    memoryKb: 65536,
    examples,
  },
});
const envelope = (data: unknown, success = true, message: string | null = null, errors: string[] | null = null) =>
  JSON.stringify({ success, message, data, errors });
const completed = envelope({
  submissionId: "job-1",
  status: "Completed",
  publicResults: [{ verdict: "Accepted", stdout: "1\n", stderr: null, compilationOutput: null }],
});

afterEach(() => vi.unstubAllGlobals());

function setup(savedRevision: (questionId: string, code: string) => Promise<number | null>, response = () => new Response(completed)) {
  const fetcher = vi.fn<typeof fetch>(async () => response());
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() =>
    useCodeRuns({ sessionId: "s-1", attemptId: "a-1", questions: [question("c"), question("py", "python3")], savedRevision }),
  );
  return { run: result.current, fetcher };
}

describe("useCodeRuns", () => {
  it("runs the saved revision of the question against its examples", async () => {
    const savedRevision = vi.fn(async () => 5);
    const { run, fetcher } = setup(savedRevision);
    await expect(run("c", "int main(void) {}")).resolves.toEqual({
      status: "compiled",
      tests: [{ index: 1, outcome: "passed", input: "1\n", expectedOutput: "1\n", actualOutput: "1\n" }],
    });
    expect(savedRevision).toHaveBeenCalledWith("c", "int main(void) {}");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("/api/v1/me/practice-sessions/s-1/attempts/a-1/questions/c/code-runs");
    expect(JSON.parse(String(init?.body))).toMatchObject({ expectedRevision: 5 });
  });

  it("tells the student the editor is empty, without asking the Backend", async () => {
    const { run, fetcher } = setup(async () => null);
    const failure = run("c", "int main(void) {}");
    await expect(failure).rejects.toBeInstanceOf(CodeRunFailure);
    await expect(failure).rejects.toMatchObject({
      reason: "The editor is empty. Write your program, then run it.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes on the Backend's reason when it refuses the run", async () => {
    const { run } = setup(
      async () => 5,
      () =>
        new Response(
          envelope(null, false, "The Coding limit for this question has been reached.", ["CODING_REQUEST_REJECTED"]),
          { status: 409 },
        ),
    );
    await expect(run("c", "int main(void) {}")).rejects.toMatchObject({
      name: "CodeRunFailure",
      reason: "The Coding limit for this question has been reached.",
    });
  });

  it("leaves other failures to the player's generic text", async () => {
    const { run } = setup(async () => 5, () => new Response("oops", { status: 500 }));
    const failure = run("c", "int main(void) {}");
    await expect(failure).rejects.not.toBeInstanceOf(CodeRunFailure);
    await expect(failure).rejects.toMatchObject({ detail: { kind: "server", status: 500 } });
  });

  it("runs nothing for a question the web editor cannot edit", async () => {
    const savedRevision = vi.fn(async () => 5);
    const { run, fetcher } = setup(savedRevision);
    await expect(run("py", "print(1)")).rejects.not.toBeInstanceOf(CodeRunFailure);
    expect(savedRevision).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

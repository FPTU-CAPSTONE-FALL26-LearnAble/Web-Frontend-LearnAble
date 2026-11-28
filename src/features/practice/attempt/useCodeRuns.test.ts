import { renderHook } from "@testing-library/react";
import type { StudentQuestion } from "@/api/assessmentAttempt";
import { CodeNotSaved, useCodeRuns } from "./useCodeRuns";

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
const envelope = (data: unknown) => JSON.stringify({ success: true, message: null, data, errors: null });

afterEach(() => vi.unstubAllGlobals());

function setup(savedRevision: (questionId: string) => Promise<number | null>) {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(
        envelope({
          submissionId: "job-1",
          status: "Completed",
          publicResults: [{ verdict: "Accepted", stdout: "1\n", stderr: null, compilationOutput: null }],
        }),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  const { result, unmount } = renderHook(() =>
    useCodeRuns({ sessionId: "s-1", attemptId: "a-1", questions: [question("c"), question("py", "python3")], savedRevision }),
  );
  return { run: result.current, fetcher, unmount };
}

describe("useCodeRuns", () => {
  it("runs the saved revision of the question against its examples", async () => {
    const savedRevision = vi.fn(async () => 5);
    const { run, fetcher } = setup(savedRevision);
    await expect(run("c")).resolves.toEqual({
      status: "compiled",
      tests: [{ index: 1, outcome: "passed", input: "1\n", expectedOutput: "1\n", actualOutput: "1\n" }],
    });
    expect(savedRevision).toHaveBeenCalledWith("c");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("/api/v1/me/practice-sessions/s-1/attempts/a-1/questions/c/code-runs");
    expect(JSON.parse(String(init?.body))).toMatchObject({ expectedRevision: 5 });
  });

  it("runs nothing when no program is saved", async () => {
    const { run, fetcher } = setup(async () => null);
    await expect(run("c")).rejects.toBeInstanceOf(CodeNotSaved);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("runs nothing for a question the web editor cannot edit", async () => {
    const savedRevision = vi.fn(async () => 5);
    const { run, fetcher } = setup(savedRevision);
    await expect(run("py")).rejects.toBeInstanceOf(CodeNotSaved);
    expect(savedRevision).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from "@testing-library/react";
import type { AnswerOperation, StudentQuestion } from "@/api/assessmentAttempt";
import { formatRemaining, useAttemptAnswers } from "./useAttemptAnswers";

const question = (attemptQuestionId: string, questionType: StudentQuestion["questionType"]): StudentQuestion => ({
  attemptQuestionId,
  questionType,
  position: 1,
  content: "Stem",
  maxWords: null,
  audio: null,
  options: [],
  images: [],
  answerFormat: null,
});
const questions = [question("single", "Single"), question("essay", "Essay"), question("code", "Coding")];
const STARTER = "int main(void) {\n  return 0;\n}\n";
const cQuestion: StudentQuestion = {
  ...question("c", "Coding"),
  coding: {
    languageCode: "c-gcc-9.2.0",
    starterCode: STARTER,
    starterCodes: { "c-gcc-9.2.0": STARTER, "c-clang-7.0.1": STARTER },
    inputDescription: "",
    outputDescription: "",
    constraints: "",
    cpuSeconds: 2,
    wallSeconds: 5,
    memoryKb: 131072,
    examples: [{ input: "1\n", expectedOutput: "1\n" }],
  },
};
const accepted = (operation: AnswerOperation) => ({
  attemptId: "a",
  attemptQuestionId: operation.attemptQuestionId,
  operationId: operation.operationId,
  acceptedRevision: operation.revision,
  serverSavedAt: "",
  serverNow: "",
  deadlineAt: "",
  status: "Active",
});

describe("useAttemptAnswers", () => {
  afterEach(() => vi.useRealTimers());

  it("saves a choice at once, on top of the stored revision", async () => {
    const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
    const stored = [
      {
        attemptQuestionId: "single",
        answer: { kind: "Single" as const, selectedOptionIds: ["a"] },
        revision: 4,
        lastOperationId: "old",
        serverSavedAt: "",
      },
    ];
    const { result } = renderHook(() => useAttemptAnswers({ questions, stored, save }));
    expect(result.current.answers).toEqual({ single: "a" });

    await act(async () => result.current.change("single", "b"));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptQuestionId: "single",
        baseRevision: 4,
        revision: 5,
        answer: { kind: "Single", selectedOptionIds: ["b"] },
      }),
    );
    expect(result.current.saveState).toBe("saved");

    // The next change builds on the revision the Backend accepted.
    await act(async () => result.current.change("single", "c"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ baseRevision: 5, revision: 6 }));
  });

  it("saves typing once the student pauses, as one request", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
    const { result } = renderHook(() => useAttemptAnswers({ questions, stored: [], save }));
    act(() => {
      result.current.change("essay", "A");
      result.current.change("essay", "A class");
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe("saving");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].answer).toEqual({ kind: "Essay", text: "A class" });
  });

  it("keeps a failed answer pending and hands it to the submit", async () => {
    const save = vi.fn().mockRejectedValue(new TypeError("offline"));
    const { result } = renderHook(() => useAttemptAnswers({ questions, stored: [], save }));
    await act(async () => result.current.change("single", "a"));
    expect(result.current.saveFailed).toBe(true);
    expect(result.current.saveState).toBe("error");
    expect(result.current.answers.single).toBe("a");

    let final: AnswerOperation[] = [];
    await act(async () => {
      final = await result.current.finalAnswers();
    });
    expect(final).toEqual([
      expect.objectContaining({ attemptQuestionId: "single", baseRevision: 0, revision: 1 }),
    ]);
  });

  it("never answers a coding question the web editor cannot edit", async () => {
    const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
    const python = { ...cQuestion, attemptQuestionId: "py", coding: { ...cQuestion.coding!, languageCode: "python3" } };
    const { result } = renderHook(() => useAttemptAnswers({ questions: [python], stored: [], save }));
    await act(async () => result.current.change("py", "print(1)"));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.answers.py).toBeUndefined();
  });

  describe("a C coding question", () => {
    const program = (attemptQuestionId: string, sourceCode: string, revision = 3) => ({
      attemptQuestionId,
      answer: { kind: "Coding" as const, sourceCode, languageCode: "c-clang-7.0.1" },
      revision,
      lastOperationId: "old",
      serverSavedAt: "",
    });

    it("saves the program as soon as the workspace reports it, in the question's runtime", async () => {
      const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
      const { result } = renderHook(() => useAttemptAnswers({ questions: [cQuestion], stored: [], save }));
      await act(async () => result.current.change("c", "int main(void) { return 1; }"));
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          baseRevision: 0,
          revision: 1,
          answer: { kind: "Coding", sourceCode: "int main(void) { return 1; }", languageCode: "c-gcc-9.2.0" },
        }),
      );
      expect(result.current.answers.c).toBe("int main(void) { return 1; }");
    });

    it("keeps a stored program in the runtime it was saved in", async () => {
      const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
      const { result } = renderHook(() =>
        useAttemptAnswers({ questions: [cQuestion], stored: [program("c", "int x;")], save }),
      );
      expect(result.current.answers.c).toBe("int x;");
      await act(async () => result.current.change("c", "int y;"));
      expect(save.mock.calls[0][0]).toMatchObject({
        baseRevision: 3,
        answer: { sourceCode: "int y;", languageCode: "c-clang-7.0.1" },
      });
    });

    it("clears a saved program when the code goes back to the starter", async () => {
      const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
      const { result } = renderHook(() =>
        useAttemptAnswers({ questions: [cQuestion], stored: [program("c", "int x;")], save }),
      );
      await act(async () => result.current.change("c", undefined));
      expect(save.mock.calls[0][0].answer).toEqual({ kind: "Coding", sourceCode: "", languageCode: "c-clang-7.0.1" });
      expect(result.current.answers.c).toBeUndefined();
      await expect(result.current.savedRevision("c")).resolves.toBeNull();
    });

    it("sends nothing when there is no program to clear, now or on submit", async () => {
      const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
      const { result } = renderHook(() => useAttemptAnswers({ questions: [cQuestion], stored: [], save }));
      await act(async () => result.current.change("c", undefined));
      expect(save).not.toHaveBeenCalled();
      expect(result.current.saveState).toBe("saved");
      await expect(result.current.finalAnswers()).resolves.toEqual([]);
    });

    it("gives a run the revision the Backend accepted, after saving a waiting change", async () => {
      let release: () => void = () => {};
      const save = vi.fn(
        (operation: AnswerOperation) =>
          new Promise<ReturnType<typeof accepted>>((resolve) => {
            release = () => resolve(accepted(operation));
          }),
      );
      const { result } = renderHook(() =>
        useAttemptAnswers({ questions: [cQuestion], stored: [program("c", "int x;", 7)], save }),
      );
      act(() => result.current.change("c", "int y;"));
      let revision: number | null = null;
      const asked = result.current.savedRevision("c").then((value) => {
        revision = value;
      });
      await act(async () => {
        await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
        // The run is still waiting for the save.
        expect(revision).toBeNull();
        release();
        await asked;
      });
      expect(revision).toBe(8);
      expect(save).toHaveBeenCalledOnce();
    });

    it("gives no revision while the program could not be saved or was never typed", async () => {
      const failing = vi.fn().mockRejectedValue(new TypeError("offline"));
      const { result } = renderHook(() => useAttemptAnswers({ questions: [cQuestion], stored: [], save: failing }));
      await expect(result.current.savedRevision("c")).resolves.toBeNull();
      await act(async () => result.current.change("c", "int x;"));
      let revision: number | null = 0;
      await act(async () => {
        revision = await result.current.savedRevision("c");
      });
      expect(revision).toBeNull();
      // The failed save was tried again for the run.
      expect(failing).toHaveBeenCalledTimes(2);
    });
  });

  it("formats the remaining time", () => {
    expect(formatRemaining(65)).toBe("01:05");
    expect(formatRemaining(3725)).toBe("1:02:05");
  });
});

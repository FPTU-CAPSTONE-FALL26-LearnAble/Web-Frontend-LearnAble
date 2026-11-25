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

  it("never sends coding answers from the web", async () => {
    const save = vi.fn(async (operation: AnswerOperation) => accepted(operation));
    const { result } = renderHook(() => useAttemptAnswers({ questions, stored: [], save }));
    await act(async () => result.current.change("code", "int x;"));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.answers.code).toBeUndefined();
  });

  it("formats the remaining time", () => {
    expect(formatRemaining(65)).toBe("01:05");
    expect(formatRemaining(3725)).toBe("1:02:05");
  });
});

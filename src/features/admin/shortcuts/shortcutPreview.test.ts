import { applyEffect, initialPreview, previewEffect } from "./shortcutPreview";

const effect = (code: string, name = code) => previewEffect({ code, name });

describe("exam shortcut preview", () => {
  it("reads a specific answer option from the action code or name", () => {
    expect(effect("ANSWER_SELECT_A")).toEqual({ kind: "selectOption", option: 0 });
    expect(effect("selectOptionC")).toEqual({ kind: "selectOption", option: 2 });
    expect(effect("option.2")).toEqual({ kind: "selectOption", option: 1 });
    expect(effect("ACT_07", "Select option D")).toEqual({ kind: "selectOption", option: 3 });
    // "a" as an article is not option A.
    expect(effect("ANSWER_SELECT", "Select an answer")).toEqual({ kind: "selectHighlighted" });
  });

  it("recognises navigation, submitting and replaying", () => {
    expect(effect("QUESTION_NEXT")).toEqual({ kind: "nextQuestion" });
    expect(effect("QUESTION_PREVIOUS")).toEqual({ kind: "previousQuestion" });
    expect(effect("OPTION_NEXT")).toEqual({ kind: "highlightNext" });
    expect(effect("QUESTION_SUBMIT", "Submit answer")).toEqual({ kind: "submitAnswer" });
    expect(effect("EXAM_SUBMIT", "Submit exam")).toEqual({ kind: "submitExam" });
    expect(effect("QUESTION_REPLAY", "Listen to the question again")).toEqual({ kind: "replay" });
    expect(effect("TOGGLE_CONTRAST", "High contrast")).toEqual({ kind: "unknown" });
  });

  it("moves the sample exam the way the exam app would", () => {
    let state = initialPreview();
    const run = (kind: Parameters<typeof applyEffect>[1]) => {
      const next = applyEffect(state, kind);
      state = next.state;
      return next.detail;
    };

    expect(run({ kind: "submitAnswer" })).toMatch(/No option is selected/);
    expect(run({ kind: "selectOption", option: 1 })).toBe("Option B is now selected.");
    expect(run({ kind: "submitAnswer" })).toBe("The answer to question 1 is submitted.");
    expect(state.saved[0]).toBe(true);
    // Choosing again reopens the answer.
    run({ kind: "selectOption", option: 2 });
    expect(state.saved[0]).toBe(false);

    expect(run({ kind: "previousQuestion" })).toMatch(/already the first/);
    expect(run({ kind: "nextQuestion" })).toBe("Moved to question 2 of 3.");
    run({ kind: "highlightNext" });
    expect(run({ kind: "selectHighlighted" })).toBe("Option B is now selected.");
    expect(state.selected).toEqual([2, 1, null]);

    run({ kind: "submitExam" });
    expect(state.submitOpen).toBe(true);
    run({ kind: "replay" });
    expect(state).toMatchObject({ submitOpen: false, reading: true });
  });
});

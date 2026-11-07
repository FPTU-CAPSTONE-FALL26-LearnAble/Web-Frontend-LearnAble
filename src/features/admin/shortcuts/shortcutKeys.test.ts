import {
  comboFromEvent,
  normalizeCombo,
  validateCombo,
} from "./shortcutKeys";

const press = (
  code: string,
  key: string,
  mods: Partial<Record<"ctrlKey" | "altKey" | "shiftKey" | "metaKey", boolean>> = {},
) => ({ code, key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

describe("exam shortcut keys", () => {
  it("records a physical key with modifiers in canonical order", () => {
    expect(comboFromEvent(press("KeyN", "n", { altKey: true }))).toBe("Alt+N");
    expect(
      comboFromEvent(press("Enter", "Enter", { shiftKey: true, ctrlKey: true })),
    ).toBe("Ctrl+Shift+Enter");
    expect(comboFromEvent(press("Digit1", "!", { altKey: true, shiftKey: true }))).toBe(
      "Alt+Shift+1",
    );
  });

  it("ignores lone modifiers, screen-reader keys and the Windows key", () => {
    expect(comboFromEvent(press("AltLeft", "Alt", { altKey: true }))).toBeNull();
    expect(comboFromEvent(press("Insert", "Insert"))).toBeNull();
    expect(comboFromEvent(press("CapsLock", "CapsLock"))).toBeNull();
    expect(comboFromEvent(press("KeyN", "n", { metaKey: true }))).toBeNull();
  });

  it("normalises typed combinations so duplicates are detected", () => {
    expect(normalizeCombo("shift+ctrl+n")).toBe("Ctrl+Shift+N");
    expect(normalizeCombo("Alt+N+P")).toBeNull();
    expect(normalizeCombo("Ctrl+")).toBeNull();
  });

  it("rejects combinations that would fire while typing an answer", () => {
    expect(validateCombo("N", new Map())).toMatch(/Ctrl or Alt/);
    expect(validateCombo("Shift+N", new Map())).toMatch(/Ctrl or Alt/);
    expect(validateCombo("F2", new Map())).toBeNull();
  });

  it("rejects system, browser and NVDA combinations", () => {
    expect(validateCombo("Alt+F4", new Map())).toMatch(/closes the window/);
    expect(validateCombo("Ctrl+Alt+N", new Map())).toMatch(/NVDA/);
    expect(validateCombo("Ctrl+V", new Map())).toMatch(/pastes/);
  });

  it("names the action that already owns a combination", () => {
    const taken = new Map([["Alt+N", "Next question"]]);
    expect(validateCombo("alt+n", taken)).toBe(
      "Alt+N is already used by “Next question”.",
    );
    expect(validateCombo("Alt+M", taken)).toBeNull();
  });
});

import {
  comboFromEvent,
  normalizeCombo,
  sameCombo,
  validateCombo,
  type ShortcutRules,
} from "./shortcutKeys";

const press = (
  code: string,
  key: string,
  mods: Partial<Record<"ctrlKey" | "altKey" | "shiftKey" | "metaKey", boolean>> = {},
) => ({ code, key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

/** A backend that spells keys as physical codes and writes Shift first. */
const codeRules: ShortcutRules = {
  keyCodes: ["KeyN", "KeyM", "Digit1", "Enter", "ArrowRight"],
  modifierOrder: ["Shift", "Control", "Alt"],
  reservedCombinations: ["Control+KeyM"],
};

describe("exam shortcut keys", () => {
  it("records a physical key with modifiers in canonical order", () => {
    expect(comboFromEvent(press("KeyN", "n", { ctrlKey: true }))).toBe("Ctrl+N");
    expect(
      comboFromEvent(press("Enter", "Enter", { shiftKey: true, ctrlKey: true })),
    ).toBe("Ctrl+Shift+Enter");
    expect(comboFromEvent(press("Digit1", "!", { altKey: true, shiftKey: true }))).toBe(
      "Alt+Shift+1",
    );
  });

  it("writes the combination the way the backend catalog spells it", () => {
    expect(
      comboFromEvent(press("KeyN", "n", { ctrlKey: true, shiftKey: true }), codeRules),
    ).toBe("Shift+Control+KeyN");
    expect(comboFromEvent(press("ArrowRight", "ArrowRight", { ctrlKey: true }), codeRules)).toBe(
      "Control+ArrowRight",
    );
    expect(normalizeCombo("ctrl+right", codeRules)).toBe("Control+ArrowRight");
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
    expect(sameCombo("Control+Shift+KeyN", "shift+ctrl+n")).toBe(true);
    expect(sameCombo("Ctrl+N", "Ctrl+Shift+N")).toBe(false);
  });

  it("requires Ctrl in every combination", () => {
    expect(validateCombo("N", new Map())).toMatch(/Hold Ctrl/);
    expect(validateCombo("Alt+N", new Map())).toMatch(/Hold Ctrl/);
    expect(validateCombo("F2", new Map())).toMatch(/Hold Ctrl/);
    expect(validateCombo("Ctrl+M", new Map())).toBeNull();
    expect(validateCombo("Ctrl+Meta+M", new Map())).toMatch(/Windows or Command/);
  });

  it("rejects system, browser and NVDA combinations", () => {
    expect(validateCombo("Ctrl+Alt+N", new Map())).toMatch(/NVDA/);
    expect(validateCombo("Ctrl+V", new Map())).toMatch(/pastes/);
    expect(validateCombo("Ctrl+W", new Map())).toMatch(/closes the window/);
  });

  it("applies the catalog's key list and reserved combinations", () => {
    expect(validateCombo("Ctrl+B", new Map(), codeRules)).toBe(
      "B is not a key the exam app can use in a shortcut.",
    );
    expect(validateCombo("Ctrl+M", new Map(), codeRules)).toBe(
      "Control+KeyM is reserved by the system and cannot be used.",
    );
    expect(validateCombo("Ctrl+1", new Map(), codeRules)).toBeNull();
  });

  it("names the action that already owns a combination", () => {
    const taken = new Map([["Control+KeyN", "Next question"]]);
    expect(validateCombo("ctrl+n", taken)).toBe(
      "Ctrl+N is already used by “Next question”.",
    );
    expect(validateCombo("Ctrl+M", taken)).toBeNull();
  });
});

import type { GestureCatalog, GestureConfig, GestureSettings } from "@/api/gestureConfig";
import {
  countChanges,
  findConflicts,
  gestureUsage,
  NO_ENABLED_BINDINGS_MESSAGE,
  setRowEnabled,
  setRowGesture,
  setSettings,
  toBody,
  toDraft,
  unknownBindings,
  validateDraft,
  validateSettings,
} from "./gestureModel";

const code = (c: string) => ({ code: c, name: c, description: null });

const catalog: GestureCatalog = {
  gestures: ["ONE_FINGER", "TWO_FINGERS", "THREE_FINGERS", "FOUR_FINGERS", "OPEN_PALM", "CLOSED_FIST", "THUMB_UP", "THUMB_DOWN", "PINCH"].map(code),
  actions: [
    "TOGGLE_OPTION_A",
    "TOGGLE_OPTION_B",
    "TOGGLE_OPTION_C",
    "TOGGLE_OPTION_D",
    "READ_FOCUSED_CONTENT",
    "TOGGLE_AUDIO_PLAYBACK",
    "NEXT_ITEM",
    "PREVIOUS_ITEM",
    "ACTIVATE_FOCUSED_ITEM",
  ].map(code),
};

const settings: GestureSettings = {
  isEnabled: false,
  preferredHand: "Either",
  confidenceThreshold: 0.8,
  holdDurationMs: 800,
  cooldownMs: 500,
  requireRelease: true,
};

const seed: GestureConfig = {
  ...settings,
  settingId: "9a000000-0000-0000-0000-000000000001",
  version: 1,
  updatedAt: null,
  bindings: [],
  eTag: '"gesture-9a000000000000000000000000000001-1"',
};

const binding = (gestureCode: string, actionCode: string, isEnabled = true) => ({
  bindingId: `${gestureCode}-${actionCode}`,
  gestureCode,
  actionCode,
  isEnabled,
});

const configured: GestureConfig = {
  ...seed,
  isEnabled: true,
  version: 2,
  bindings: [
    binding("ONE_FINGER", "TOGGLE_OPTION_A"),
    binding("TWO_FINGERS", "TOGGLE_OPTION_B"),
    binding("PINCH", "NEXT_ITEM", false),
    binding("OPEN_PALM", "NEXT_ITEM"),
  ],
};

describe("gesture editing model", () => {
  it("turns the seed into one empty row per action and no changes", () => {
    const draft = toDraft(seed, catalog);
    expect(draft.rows).toHaveLength(9);
    expect(draft.rows.map((row) => row.action.code)).toEqual(catalog.actions.map((a) => a.code));
    expect(draft.rows.every((row) => row.gestureCode === null && row.extraGestures.length === 0)).toBe(true);
    expect(countChanges(draft, seed)).toBe(0);
    expect(validateDraft(draft)).toEqual([]);
  });

  it("picks the first gesture by code as primary and keeps the rest as extras", () => {
    const row = toDraft(configured, catalog).rows.find((r) => r.action.code === "NEXT_ITEM")!;
    expect(row.gestureCode).toBe("OPEN_PALM");
    expect(row.isEnabled).toBe(true);
    expect(row.extraGestures).toEqual([{ gestureCode: "PINCH", isEnabled: false }]);
  });

  it("round-trips the bindings through the draft", () => {
    const draft = toDraft(configured, catalog);
    const body = toBody(draft);
    const expected = configured.bindings
      .map(({ gestureCode, actionCode, isEnabled }) => ({ gestureCode, actionCode, isEnabled }))
      .sort((a, b) => a.gestureCode.localeCompare(b.gestureCode));
    expect(body.bindings).toEqual(expected);
    expect(body).toMatchObject({ isEnabled: true, preferredHand: "Either", holdDurationMs: 800 });
    expect(countChanges(draft, configured)).toBe(0);
  });

  it("drops and reports bindings outside the catalog", () => {
    const withUnknown = { ...configured, bindings: [...configured.bindings, binding("SWIPE_LEFT", "TOGGLE_OPTION_C"), binding("PINCH", "SUBMIT")] };
    expect(unknownBindings(withUnknown, catalog)).toHaveLength(2);
    expect(toBody(toDraft(withUnknown, catalog)).bindings).toHaveLength(4);
  });

  it("detects two primaries sharing a gesture and reports both rows", () => {
    const draft = setRowGesture(toDraft(configured, catalog), "TOGGLE_OPTION_C", "ONE_FINGER");
    const conflicts = findConflicts(draft);
    expect(conflicts.get("TOGGLE_OPTION_A")).toEqual({ gestureCode: "ONE_FINGER", otherActionCode: "TOGGLE_OPTION_C" });
    expect(conflicts.get("TOGGLE_OPTION_C")).toEqual({ gestureCode: "ONE_FINGER", otherActionCode: "TOGGLE_OPTION_A" });
    expect(conflicts.size).toBe(2);
    expect(validateDraft(draft)).toContain("Each gesture can trigger only one action. Fix the highlighted rows.");
  });

  it("detects a primary that reuses another row's extra gesture", () => {
    const draft = setRowGesture(toDraft(configured, catalog), "PREVIOUS_ITEM", "PINCH");
    const conflicts = findConflicts(draft);
    expect(conflicts.get("PREVIOUS_ITEM")?.otherActionCode).toBe("NEXT_ITEM");
    expect(conflicts.get("NEXT_ITEM")?.gestureCode).toBe("PINCH");
  });

  it("maps each gesture to the action that uses it", () => {
    const usage = gestureUsage(toDraft(configured, catalog));
    expect(usage.get("PINCH")).toBe("NEXT_ITEM");
    expect(usage.get("ONE_FINGER")).toBe("TOGGLE_OPTION_A");
    expect(usage.has("THUMB_UP")).toBe(false);
  });

  it("counts row and settings changes, and none after undoing them", () => {
    const draft = toDraft(configured, catalog);
    let edited = setRowGesture(draft, "TOGGLE_OPTION_C", "THREE_FINGERS");
    edited = setRowEnabled(edited, "TOGGLE_OPTION_A", false);
    edited = setSettings(edited, { holdDurationMs: 900 });
    expect(countChanges(edited, configured)).toBe(3);

    let undone = setRowGesture(edited, "TOGGLE_OPTION_C", null);
    undone = setRowEnabled(undone, "TOGGLE_OPTION_A", true);
    undone = setSettings(undone, { holdDurationMs: 800 });
    expect(countChanges(undone, configured)).toBe(0);
  });

  it("starts a newly assigned gesture switched on", () => {
    const draft = setRowEnabled(toDraft(seed, catalog), "TOGGLE_OPTION_A", false);
    const row = setRowGesture(draft, "TOGGLE_OPTION_A", "ONE_FINGER").rows[0];
    expect(row).toMatchObject({ gestureCode: "ONE_FINGER", isEnabled: true });
  });

  it("refuses enabling gesture input without an enabled gesture", () => {
    const draft = setSettings(toDraft(seed, catalog), { isEnabled: true });
    expect(validateDraft(draft)).toEqual([NO_ENABLED_BINDINGS_MESSAGE]);
    const disabledOnly = setRowEnabled(setRowGesture(draft, "NEXT_ITEM", "PINCH"), "NEXT_ITEM", false);
    expect(validateDraft(disabledOnly)).toEqual([NO_ENABLED_BINDINGS_MESSAGE]);
    expect(validateDraft(setRowGesture(draft, "NEXT_ITEM", "PINCH"))).toEqual([]);
  });

  describe("settings boundaries", () => {
    const check = (patch: Partial<GestureSettings>) => validateSettings({ ...settings, ...patch });

    it.each([0, 1, 0.5, 0.1234])("accepts confidence %s", (value) => {
      expect(check({ confidenceThreshold: value }).confidenceThreshold).toBeUndefined();
    });
    it.each([-0.01, 1.00001, 0.12345, Number.NaN])("rejects confidence %s", (value) => {
      expect(check({ confidenceThreshold: value }).confidenceThreshold).toBeDefined();
    });
    it.each([
      [0, true],
      [10_000, true],
      [10_001, false],
      [-1, false],
      [12.5, false],
    ])("hold time %s valid=%s", (value, valid) => {
      expect(check({ holdDurationMs: value }).holdDurationMs === undefined).toBe(valid);
    });
    it.each([
      [0, true],
      [60_000, true],
      [60_001, false],
    ])("cool-down %s valid=%s", (value, valid) => {
      expect(check({ cooldownMs: value }).cooldownMs === undefined).toBe(valid);
    });
  });
});

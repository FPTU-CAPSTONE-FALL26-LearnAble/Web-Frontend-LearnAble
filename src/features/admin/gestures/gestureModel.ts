import type {
  GestureCatalog,
  GestureCode,
  GestureConfig,
  GestureConfigBody,
  GestureSettings,
} from "@/api/gestureConfig";

/**
 * Editing model for the hand-gesture screen (FR-47 · FFCB-284).
 *
 * The API is keyed by gesture (each gesture appears at most once per version);
 * the screen is keyed by exam action. This module converts between the two and
 * owns every rule, so the route only renders and wires events.
 */

export type ActionRow = {
  action: GestureCode;
  /** Primary gesture shown in the editor; null = no gesture. */
  gestureCode: string | null;
  /** Whether the primary binding is on. New bindings start on. */
  isEnabled: boolean;
  /** Other gestures already bound to this action. Kept on save, shown read-only. */
  extraGestures: { gestureCode: string; isEnabled: boolean }[];
};

export type Draft = { settings: GestureSettings; rows: ActionRow[] };

export const settingsOf = (config: GestureSettings): GestureSettings => ({
  isEnabled: config.isEnabled,
  preferredHand: config.preferredHand,
  confidenceThreshold: config.confidenceThreshold,
  holdDurationMs: config.holdDurationMs,
  cooldownMs: config.cooldownMs,
  requireRelease: config.requireRelease,
});

const byGesture = <T extends { gestureCode: string }>(a: T, b: T) =>
  a.gestureCode < b.gestureCode ? -1 : a.gestureCode > b.gestureCode ? 1 : 0;

/** Bindings the screen cannot show because their gesture or action is not in the catalog. */
export function unknownBindings(config: GestureConfig, catalog: GestureCatalog) {
  const gestures = new Set(catalog.gestures.map((gesture) => gesture.code));
  const actions = new Set(catalog.actions.map((action) => action.code));
  return config.bindings.filter(
    (binding) => !gestures.has(binding.gestureCode) || !actions.has(binding.actionCode),
  );
}

/** One row per catalog action, in catalog order. */
export function toDraft(config: GestureConfig, catalog: GestureCatalog): Draft {
  const gestures = new Set(catalog.gestures.map((gesture) => gesture.code));
  const rows = catalog.actions.map((action): ActionRow => {
    const bound = config.bindings
      .filter((binding) => binding.actionCode === action.code && gestures.has(binding.gestureCode))
      .sort(byGesture);
    const [primary, ...extras] = bound;
    return {
      action,
      gestureCode: primary?.gestureCode ?? null,
      isEnabled: primary?.isEnabled ?? true,
      extraGestures: extras.map(({ gestureCode, isEnabled }) => ({ gestureCode, isEnabled })),
    };
  });
  return { settings: settingsOf(config), rows };
}

/** Rows back to the PUT body; bindings sorted by gesture code. */
export function toBody(draft: Draft): GestureConfigBody {
  const bindings = draft.rows
    .flatMap((row) => [
      ...(row.gestureCode
        ? [{ gestureCode: row.gestureCode, actionCode: row.action.code, isEnabled: row.isEnabled }]
        : []),
      ...row.extraGestures.map((extra) => ({ ...extra, actionCode: row.action.code })),
    ])
    .sort(byGesture);
  return { ...draft.settings, bindings };
}

const gesturesOf = (row: ActionRow) => [
  ...(row.gestureCode ? [row.gestureCode] : []),
  ...row.extraGestures.map((extra) => extra.gestureCode),
];

/** Gesture code → the first action that uses it (primary or extra). */
export function gestureUsage(draft: Draft): Map<string, string> {
  const usage = new Map<string, string>();
  for (const row of draft.rows) {
    for (const gesture of gesturesOf(row)) {
      if (!usage.has(gesture)) usage.set(gesture, row.action.code);
    }
  }
  return usage;
}

/**
 * Actions that share a gesture with another action (AC3). Each conflicting
 * action maps to the gesture it shares and one other action using it.
 */
export function findConflicts(draft: Draft): Map<string, { gestureCode: string; otherActionCode: string }> {
  const users = new Map<string, string[]>();
  for (const row of draft.rows) {
    for (const gesture of gesturesOf(row)) {
      const list = users.get(gesture) ?? [];
      if (!list.includes(row.action.code)) list.push(row.action.code);
      users.set(gesture, list);
    }
  }
  const conflicts = new Map<string, { gestureCode: string; otherActionCode: string }>();
  for (const [gestureCode, actions] of users) {
    if (actions.length < 2) continue;
    for (const action of actions) {
      if (conflicts.has(action)) continue;
      conflicts.set(action, { gestureCode, otherActionCode: actions.find((other) => other !== action)! });
    }
  }
  return conflicts;
}

const decimals = (value: number) => {
  const text = String(value);
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.includes(".") ? text.split(".")[1].length : 0;
};

const inRange = (value: number, min: number, max: number) =>
  Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max;

/** Field errors mirroring the backend ranges, in plain English. */
export function validateSettings(settings: GestureSettings): Partial<Record<keyof GestureSettings, string>> {
  const errors: Partial<Record<keyof GestureSettings, string>> = {};
  const confidence = settings.confidenceThreshold;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.confidenceThreshold = "Confidence must be between 0 and 100 percent.";
  } else if (decimals(confidence) > 4) {
    errors.confidenceThreshold = "Confidence can have at most two decimal places as a percentage.";
  }
  if (!inRange(settings.holdDurationMs, 0, 10_000)) {
    errors.holdDurationMs = "Hold time must be a whole number between 0 and 10,000 milliseconds.";
  }
  if (!inRange(settings.cooldownMs, 0, 60_000)) {
    errors.cooldownMs = "Cool-down must be a whole number between 0 and 60,000 milliseconds.";
  }
  if (!["Left", "Right", "Either"].includes(settings.preferredHand)) {
    errors.preferredHand = "Choose left, right or either hand.";
  }
  return errors;
}

export const hasEnabledBinding = (draft: Draft) =>
  draft.rows.some(
    (row) => (row.gestureCode !== null && row.isEnabled) || row.extraGestures.some((extra) => extra.isEnabled),
  );

export const NO_ENABLED_BINDINGS_MESSAGE =
  "Turn on at least one gesture before enabling gesture input.";

/** Form-level messages; an empty list means the draft can be saved. */
export function validateDraft(draft: Draft): string[] {
  const messages: string[] = [];
  if (findConflicts(draft).size > 0) {
    messages.push("Each gesture can trigger only one action. Fix the highlighted rows.");
  }
  messages.push(...Object.values(validateSettings(draft.settings)).filter((m): m is string => !!m));
  if (draft.settings.isEnabled && !hasEnabledBinding(draft)) {
    messages.push(NO_ENABLED_BINDINGS_MESSAGE);
  }
  return messages;
}

/** Number of changed settings fields plus changed action rows; 0 disables Save. */
export function countChanges(draft: Draft, config: GestureConfig): number {
  const saved = settingsOf(config);
  let changes = (Object.keys(saved) as (keyof GestureSettings)[]).filter(
    (key) => saved[key] !== draft.settings[key],
  ).length;

  const key = (b: { gestureCode: string; isEnabled: boolean }) => `${b.gestureCode}:${b.isEnabled}`;
  const savedByAction = new Map<string, string>();
  for (const binding of config.bindings) {
    const list = savedByAction.get(binding.actionCode);
    savedByAction.set(binding.actionCode, list ? `${list}|${key(binding)}` : key(binding));
  }
  for (const row of draft.rows) {
    const current = [
      ...(row.gestureCode ? [{ gestureCode: row.gestureCode, isEnabled: row.isEnabled }] : []),
      ...row.extraGestures,
    ]
      .map(key)
      .sort()
      .join("|");
    const before = (savedByAction.get(row.action.code) ?? "").split("|").filter(Boolean).sort().join("|");
    if (current !== before) changes += 1;
  }
  return changes;
}

/** Replace one row's primary gesture. Turning a gesture on for an empty row enables it. */
export function setRowGesture(draft: Draft, actionCode: string, gestureCode: string | null): Draft {
  return {
    ...draft,
    rows: draft.rows.map((row) =>
      row.action.code === actionCode
        ? { ...row, gestureCode, isEnabled: row.gestureCode === null ? true : row.isEnabled }
        : row,
    ),
  };
}

export function setRowEnabled(draft: Draft, actionCode: string, isEnabled: boolean): Draft {
  return {
    ...draft,
    rows: draft.rows.map((row) => (row.action.code === actionCode ? { ...row, isEnabled } : row)),
  };
}

export function setSettings(draft: Draft, patch: Partial<GestureSettings>): Draft {
  return { ...draft, settings: { ...draft.settings, ...patch } };
}

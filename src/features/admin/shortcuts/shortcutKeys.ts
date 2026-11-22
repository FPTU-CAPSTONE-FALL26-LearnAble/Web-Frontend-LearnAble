/**
 * Keyboard-combination helpers for the exam shortcut configuration (FR-52).
 *
 * The backend catalog decides how a combination is written: which keys can be
 * bound, how they are spelled and in which order modifiers appear. These
 * helpers turn a key press into that spelling, and compare combinations by
 * meaning, so `shift+ctrl+n`, `Ctrl+Shift+N` and `Control+Shift+KeyN` can
 * never be saved as different shortcuts.
 */

export type ShortcutRules = {
  /** Bindable key names as the backend spells them; empty means unrestricted. */
  keyCodes: string[];
  /** Modifier names in the backend's order. */
  modifierOrder: string[];
  reservedCombinations: string[];
};

export const DEFAULT_RULES: ShortcutRules = {
  keyCodes: [],
  modifierOrder: ["Ctrl", "Alt", "Shift"],
  reservedCombinations: [],
};

const MODIFIER_IDS = ["ctrl", "alt", "shift", "meta"] as const;
type ModifierId = (typeof MODIFIER_IDS)[number];

const MODIFIER_NAMES: Record<ModifierId, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Meta",
};

function modifierId(token: string): ModifierId | null {
  switch (token.trim().toLowerCase()) {
    case "ctrl":
    case "control":
      return "ctrl";
    case "alt":
    case "option":
      return "alt";
    case "shift":
      return "shift";
    case "meta":
    case "win":
    case "windows":
    case "cmd":
    case "command":
    case "super":
      return "meta";
    default:
      return null;
  }
}

/** Physical-key names, so the combination does not depend on keyboard layout. */
const CODE_NAMES: Record<string, string> = {
  Enter: "Enter",
  NumpadEnter: "Enter",
  Space: "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Home: "Home",
  End: "End",
  Backspace: "Backspace",
  Delete: "Delete",
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Backquote: "`",
};

/** Keys that are modifiers themselves or belong to a screen reader. */
const NON_BINDABLE_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
  "CapsLock",
  "Insert",
  "NumLock",
  "ScrollLock",
  "ContextMenu",
]);

/**
 * Combinations the exam app must never take over: they belong to the
 * operating system, the browser shell, or NVDA / JAWS, which blind and
 * low-vision students rely on during the exam. The backend catalog adds its
 * own list on top of this one.
 */
export const RESERVED_COMBINATIONS: Record<string, string> = {
  "Alt+F4": "closes the window",
  "Alt+Tab": "switches applications",
  "Ctrl+Alt+Delete": "is reserved by Windows",
  "Ctrl+Alt+N": "starts NVDA",
  "Ctrl+W": "closes the window",
  "Ctrl+Q": "quits the application",
  "Ctrl+R": "reloads the page",
  "F5": "reloads the page",
  "Ctrl+Tab": "switches tabs",
  "Ctrl+Shift+Tab": "switches tabs",
  "Ctrl+L": "focuses the address bar",
  "Ctrl+P": "opens printing",
  "Ctrl+Shift+I": "opens developer tools",
  "F12": "opens developer tools",
  "Ctrl+C": "copies text",
  "Ctrl+V": "pastes text",
  "Ctrl+X": "cuts text",
  "Ctrl+Z": "undoes typing in answers",
  "Ctrl+A": "selects text in answers",
};

type KeyLike = Pick<
  KeyboardEvent,
  "code" | "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
>;

/** Short, layout-independent name of a key token (`KeyN` → `N`, `ArrowUp` → `Up`). */
function shortKey(token: string): string {
  if (/^Key[A-Za-z]$/.test(token)) return token.slice(3).toUpperCase();
  if (/^Digit[0-9]$/.test(token)) return token.slice(5);
  if (/^Numpad[0-9]$/.test(token)) return token.slice(6);
  const code = Object.keys(CODE_NAMES).find(
    (name) => name.toLowerCase() === token.toLowerCase(),
  );
  if (code) return CODE_NAMES[code];
  return token.length === 1 ? token.toUpperCase() : token;
}

/** Every spelling one key may have in a backend catalog. */
function keyAliases(token: string): string[] {
  const short = shortKey(token);
  const aliases = [token, short];
  if (/^[A-Z]$/.test(short)) aliases.push(`Key${short}`);
  if (/^[0-9]$/.test(short)) aliases.push(`Digit${short}`);
  for (const [code, name] of Object.entries(CODE_NAMES)) {
    if (name.toLowerCase() === short.toLowerCase()) aliases.push(code);
  }
  return aliases;
}

/** The catalog's own spelling of a key, or `null` when it does not list it. */
function catalogKey(token: string, rules: ShortcutRules): string | null {
  for (const alias of keyAliases(token)) {
    const found = rules.keyCodes.find(
      (code) => code.toLowerCase() === alias.toLowerCase(),
    );
    if (found) return found;
  }
  return null;
}

/** Modifiers in the backend's order and spelling, unknown ones last. */
function orderedModifiers(rules: ShortcutRules): { id: ModifierId; name: string }[] {
  const ordered: { id: ModifierId; name: string }[] = [];
  for (const name of rules.modifierOrder) {
    const id = modifierId(name);
    if (id && !ordered.some((item) => item.id === id)) ordered.push({ id, name });
  }
  for (const id of MODIFIER_IDS) {
    if (!ordered.some((item) => item.id === id))
      ordered.push({ id, name: MODIFIER_NAMES[id] });
  }
  return ordered;
}

function parseCombo(value: string): { modifiers: Set<ModifierId>; key: string } | null {
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers = new Set<ModifierId>();
  let key: string | null = null;
  for (const part of parts) {
    const id = modifierId(part);
    if (id) modifiers.add(id);
    else if (key) return null;
    else key = part;
  }
  return key ? { modifiers, key } : null;
}

function write(
  modifiers: Set<ModifierId>,
  key: string,
  rules: ShortcutRules,
): string {
  return [
    ...orderedModifiers(rules)
      .filter((item) => modifiers.has(item.id))
      .map((item) => item.name),
    catalogKey(key, rules) ?? shortKey(key),
  ].join("+");
}

function keyName(event: KeyLike): string | null {
  const { code, key } = event;
  if (NON_BINDABLE_CODES.has(code)) return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  if (CODE_NAMES[code]) return CODE_NAMES[code];
  // Unknown physical code (jsdom, exotic keyboards): fall back to the key value.
  if (!key || ["Control", "Alt", "Shift", "Meta", "CapsLock", "Insert"].includes(key))
    return null;
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * The combination a key press represents, or `null` while only modifiers are
 * held. The Windows / Command key is never part of an exam shortcut.
 */
export function comboFromEvent(
  event: KeyLike,
  rules: ShortcutRules = DEFAULT_RULES,
): string | null {
  if (event.metaKey) return null;
  const key = keyName(event);
  if (!key) return null;
  const modifiers = new Set<ModifierId>();
  if (event.ctrlKey) modifiers.add("ctrl");
  if (event.altKey) modifiers.add("alt");
  if (event.shiftKey) modifiers.add("shift");
  return write(modifiers, key, rules);
}

/** A stored or typed combination in the backend's spelling; `null` when malformed. */
export function normalizeCombo(
  value: string,
  rules: ShortcutRules = DEFAULT_RULES,
): string | null {
  const parsed = parseCombo(value);
  return parsed ? write(parsed.modifiers, parsed.key, rules) : null;
}

/** Spelling-independent identity of a combination. */
function signature(value: string): string | null {
  const parsed = parseCombo(value);
  if (!parsed) return null;
  return [
    ...MODIFIER_IDS.filter((id) => parsed.modifiers.has(id)),
    shortKey(parsed.key).toLowerCase(),
  ].join("+");
}

/** Whether two combinations are the same keys, however they are written. */
export function sameCombo(a: string, b: string): boolean {
  const left = signature(a);
  return left !== null && left === signature(b);
}

/** The parts of a combination, for rendering each key separately. */
export const comboParts = (combo: string) => combo.split("+");

/**
 * Why a combination cannot be used, or `null` when it can.
 * `taken` maps every other action's combination to that action's name.
 */
export function validateCombo(
  combo: string | null,
  taken: Map<string, string>,
  rules: ShortcutRules = DEFAULT_RULES,
): string | null {
  if (!combo) return "Press a key combination to record it.";
  const parsed = parseCombo(combo);
  const normalized = normalizeCombo(combo, rules);
  if (!parsed || !normalized) return "This is not a valid key combination.";
  if (parsed.modifiers.has("meta"))
    return "The Windows or Command key cannot be part of an exam shortcut.";
  // Rule agreed on 01/11/2026: every exam shortcut holds Ctrl.
  if (!parsed.modifiers.has("ctrl"))
    return "Hold Ctrl together with the key. Every exam shortcut uses Ctrl so typing an answer or a screen-reader command never triggers it.";
  if (rules.keyCodes.length > 0 && !catalogKey(parsed.key, rules))
    return `${shortKey(parsed.key)} is not a key the exam app can use in a shortcut.`;
  for (const [reserved, reason] of Object.entries(RESERVED_COMBINATIONS)) {
    if (sameCombo(reserved, combo))
      return `${normalized} cannot be used because it ${reason}.`;
  }
  if (rules.reservedCombinations.some((reserved) => sameCombo(reserved, combo)))
    return `${normalized} is reserved by the system and cannot be used.`;
  for (const [other, owner] of taken) {
    if (sameCombo(other, combo))
      return `${normalized} is already used by “${owner}”.`;
  }
  return null;
}

/**
 * Keyboard-combination helpers for the exam shortcut configuration.
 *
 * Combinations are stored in one canonical form — modifiers in the order
 * Ctrl, Alt, Shift, then one key — so `Shift+ctrl+n` and `Ctrl+Shift+N` can
 * never be saved as two different shortcuts.
 */

const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

const FUNCTION_KEY = /^F([1-9]|1[0-2])$/;

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
 * low-vision students rely on during the exam.
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

function keyName(event: KeyLike): string | null {
  const { code, key } = event;
  if (NON_BINDABLE_CODES.has(code)) return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  if (FUNCTION_KEY.test(code)) return code;
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
export function comboFromEvent(event: KeyLike): string | null {
  if (event.metaKey) return null;
  const key = keyName(event);
  if (!key) return null;
  const modifiers: Modifier[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  return [...modifiers, key].join("+");
}

/** Canonical form of a stored or typed combination; `null` when malformed. */
export function normalizeCombo(value: string): string | null {
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const modifiers = new Set<Modifier>();
  let key: string | null = null;
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") modifiers.add("Ctrl");
    else if (lower === "alt") modifiers.add("Alt");
    else if (lower === "shift") modifiers.add("Shift");
    else if (key) return null;
    else key = part.length === 1 ? part.toUpperCase() : part;
  }
  if (!key) return null;
  return [...MODIFIER_ORDER.filter((m) => modifiers.has(m)), key].join("+");
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
): string | null {
  if (!combo) return "Press a key combination to record it.";
  const normalized = normalizeCombo(combo);
  if (!normalized) return "This is not a valid key combination.";
  const parts = comboParts(normalized);
  const key = parts[parts.length - 1];
  const hasCtrlOrAlt = parts.includes("Ctrl") || parts.includes("Alt");
  if (!hasCtrlOrAlt && !FUNCTION_KEY.test(key))
    return "Use Ctrl or Alt with the key, or a function key (F1–F12), so typing an answer never triggers it.";
  const reserved = RESERVED_COMBINATIONS[normalized];
  if (reserved) return `${normalized} cannot be used because it ${reserved}.`;
  const owner = taken.get(normalized);
  if (owner) return `${normalized} is already used by “${owner}”.`;
  return null;
}

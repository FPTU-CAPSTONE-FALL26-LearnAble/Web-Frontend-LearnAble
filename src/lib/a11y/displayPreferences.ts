import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import {
  getDisplayPreferences,
  updateDisplayPreferences,
  type BackendContrastTheme,
} from "@/api/accessibility";

/**
 * How the pages look for whoever is reading them: a colour theme and a text
 * size. Every theme meets the same contrast floor as the default (text ≥ 7:1).
 *
 * Where a choice is kept depends on who is reading:
 * - A signed-in student: the account's preferences on the Backend
 *   (`contrastTheme` and `fontSize` of `/StudentProfiles/me/preferences`) are
 *   the source of truth, so the choice follows the student to another browser
 *   or device. A local copy only paints the last known look before the first
 *   frame and keeps it when the network is down.
 * - A visitor who has not signed in: this browser only, under a separate
 *   "guest" key. A guest choice is never copied into an account, so signing
 *   in can never overwrite what the account already saved.
 *
 * Several people can share a computer, so every local copy is stored under its
 * owner and never leaks to the next one. Outside an owner's pages (sign-in,
 * staff, lecturer, examiner, admin) the default look applies.
 *
 * The theme is one attribute on `<html>` (`shared/tokens/tokens.css` does the
 * rest); the text size is the `--text-scale` multiplier of every `text-*` token.
 */
export const CONTRAST_THEMES = ["default", "dark", "yellow", "white"] as const;
export type ContrastTheme = (typeof CONTRAST_THEMES)[number];

/** Percentages of the normal text size. 200 % is the WCAG 1.4.4 resize floor. */
export const TEXT_SCALES = [100, 125, 150, 175, 200] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export type DisplayPreferences = { theme: ContrastTheme; textScale: TextScale };

/** The owner key of a visitor who has not signed in. */
export const GUEST = "guest";

/** One theme per value of the Backend's `ContrastTheme` enum. */
const TO_BACKEND: Record<ContrastTheme, BackendContrastTheme> = {
  default: "Default",
  dark: "Dark",
  yellow: "HighContrast",
  white: "Light",
};
const FROM_BACKEND = Object.fromEntries(
  Object.entries(TO_BACKEND).map(([theme, value]) => [value, theme]),
) as Record<BackendContrastTheme, ContrastTheme>;

/** The app theme a Backend `ContrastTheme` value stands for. */
export const themeFromBackend = (value: BackendContrastTheme): ContrastTheme => FROM_BACKEND[value];

/** `fontSize` on the Backend is the base size in CSS pixels; 16 px is 100 %. */
const BASE_FONT_SIZE = 16;
const toFontSize = (scale: TextScale) => (BASE_FONT_SIZE * scale) / 100;
function fromFontSize(fontSize: number): TextScale {
  const percent = (fontSize / BASE_FONT_SIZE) * 100;
  return TEXT_SCALES.reduce((best, scale) =>
    Math.abs(scale - percent) < Math.abs(best - percent) ? scale : best,
  );
}

const THEME_PREFIX = "learnable.contrastTheme.";
const SCALE_PREFIX = "learnable.textScale.";
/** "White on black" was folded into the closest remaining theme. */
const RETIRED: Record<string, ContrastTheme> = { black: "yellow" };
const DARK: ReadonlySet<ContrastTheme> = new Set(["dark", "yellow"]);
const DEFAULTS: DisplayPreferences = { theme: "default", textScale: 100 };
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is ContrastTheme =>
  CONTRAST_THEMES.includes(value as ContrastTheme);
const isScale = (value: unknown): value is TextScale => TEXT_SCALES.includes(value as TextScale);

/** Whose look is showing: an account id, `GUEST`, or null outside both. */
let owner: string | null = null;
let current: DisplayPreferences = DEFAULTS;
/** Counts the reader's own choices, so a late Backend answer never overrides one. */
let choices = 0;

function storage<T>(work: () => T, fallback: T): T {
  try {
    return work();
  } catch {
    // Storage may be blocked (private window, policy); the look still applies for this visit.
    return fallback;
  }
}

function read(key: string): DisplayPreferences {
  return storage(() => {
    const theme = localStorage.getItem(THEME_PREFIX + key) ?? "";
    const scale = Number(localStorage.getItem(SCALE_PREFIX + key));
    return {
      theme: isTheme(theme) ? theme : (RETIRED[theme] ?? DEFAULTS.theme),
      textScale: isScale(scale) ? scale : DEFAULTS.textScale,
    };
  }, DEFAULTS);
}

function apply(next: DisplayPreferences) {
  current = next;
  const root = document.documentElement;
  const { theme, textScale } = next;
  root.classList.toggle("dark", DARK.has(theme));
  if (theme === "default" || theme === "dark") delete root.dataset.contrast;
  else root.dataset.contrast = theme;
  // Native controls (scrollbars, selects) follow the theme too.
  if (theme === "default") root.style.removeProperty("color-scheme");
  else root.style.colorScheme = DARK.has(theme) ? "dark" : "light";
  if (textScale === 100) root.style.removeProperty("--text-scale");
  else root.style.setProperty("--text-scale", String(textScale / 100));
  listeners.forEach((listener) => listener());
}

/** Shows the change and keeps the local copy for whoever is showing. */
function remember(changes: Partial<DisplayPreferences>) {
  const next = { ...current, ...changes };
  apply(next);
  if (!owner) return;
  const key = owner;
  storage(() => {
    localStorage.setItem(THEME_PREFIX + key, next.theme);
    localStorage.setItem(SCALE_PREFIX + key, String(next.textScale));
  }, undefined);
}

/** Shows the last known look of an account id, or of `GUEST`. */
export function activateDisplayPreferences(nextOwner: string) {
  owner = nextOwner;
  apply(read(nextOwner));
}

/** Back to the default look, leaving every stored choice untouched. */
export function deactivateDisplayPreferences() {
  owner = null;
  apply(DEFAULTS);
}

export const getDisplayPreferencesSnapshot = () => current;
export const getContrastTheme = () => current.theme;

/**
 * Reads the account's look from the Backend and shows it. A failed read keeps
 * the local copy; so does a choice made while the read was pending.
 */
export async function loadDisplayPreferences(accountId: string) {
  const choicesBefore = choices;
  let stored: Awaited<ReturnType<typeof getDisplayPreferences>>;
  try {
    stored = await getDisplayPreferences();
  } catch {
    return;
  }
  if (owner !== accountId || choices !== choicesBefore) return;
  const changes: Partial<DisplayPreferences> = {};
  if (stored.contrastTheme) changes.theme = FROM_BACKEND[stored.contrastTheme];
  if (stored.fontSize) changes.textScale = fromFontSize(stored.fontSize);
  if (Object.keys(changes).length) remember(changes);
}

type BackendChanges = Parameters<typeof updateDisplayPreferences>[0];
let saving: Promise<void> | null = null;
let wanted: BackendChanges | null = null;

/**
 * Sends changes to the account. Arrow keys move through the options one by
 * one, so saves never overlap: while one is in flight later changes are
 * merged and go next, as one request.
 */
function saveToAccount(changes: BackendChanges): Promise<void> {
  wanted = { ...wanted, ...changes };
  saving ??= (async () => {
    try {
      while (wanted) {
        const next = wanted;
        wanted = null;
        await updateDisplayPreferences(next);
      }
    } finally {
      saving = null;
      wanted = null;
    }
  })();
  return saving;
}

/**
 * Applies a choice at once and keeps it where this reader's choices live. The
 * promise settles when it is kept: at once for a guest, after the Backend
 * answers for an account. A failed save leaves the look applied.
 */
function choose(changes: Partial<DisplayPreferences>, backend: BackendChanges): Promise<void> {
  choices += 1;
  remember(changes);
  return owner && owner !== GUEST ? saveToAccount(backend) : Promise.resolve();
}

export const setContrastTheme = (theme: ContrastTheme) =>
  choose({ theme }, { contrastTheme: TO_BACKEND[theme] });

export const setTextScale = (textScale: TextScale) =>
  choose({ textScale }, { fontSize: toFontSize(textScale) });

/** True while the choices showing are kept in an account rather than this browser. */
export const isAccountOwner = () => owner !== null && owner !== GUEST;

if (typeof window !== "undefined") {
  // The same owner changed their look in another tab: follow.
  window.addEventListener("storage", (event) => {
    if (!owner || !event.key) return;
    if (event.key === THEME_PREFIX + owner || event.key === SCALE_PREFIX + owner) apply(read(owner));
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useDisplayPreferences(): DisplayPreferences {
  return useSyncExternalStore(subscribe, getDisplayPreferencesSnapshot, getDisplayPreferencesSnapshot);
}

/** Re-renders when the owner changes between a guest and an account. */
export function useIsAccountOwner(): boolean {
  return useSyncExternalStore(subscribe, isAccountOwner, isAccountOwner);
}

export function useContrastTheme(): ContrastTheme {
  return useDisplayPreferences().theme;
}

/**
 * Mount where a reader's own look applies, with an account id or `GUEST`
 * (null applies nothing). Shows the last known look before the first paint,
 * then, for an account, the one saved on the Backend; returns to the default
 * when unmounted.
 */
export function useDisplayPreferenceScope(nextOwner: string | null) {
  useLayoutEffect(() => {
    if (!nextOwner) return;
    activateDisplayPreferences(nextOwner);
    return deactivateDisplayPreferences;
  }, [nextOwner]);
  useEffect(() => {
    if (nextOwner && nextOwner !== GUEST) void loadDisplayPreferences(nextOwner);
  }, [nextOwner]);
}

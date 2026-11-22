import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * A student's colour theme. It is a personal reading preference kept in this
 * browser's local storage — nothing is sent to the Backend — and every theme
 * meets the same contrast floor as the default (text ≥ 7:1).
 *
 * Two rules:
 * - It belongs to one account. Several students can share a computer, so the
 *   choice is stored under the account's id and never leaks to the next one.
 * - It applies to the student area only. The sign-in pages and the staff,
 *   lecturer, examiner and admin workspaces always use the default theme.
 *
 * A theme is one attribute on `<html>`; `shared/tokens/tokens.css` does the rest.
 */
export const CONTRAST_THEMES = ["default", "dark", "black", "yellow", "white"] as const;
export type ContrastTheme = (typeof CONTRAST_THEMES)[number];

const PREFIX = "learnable.contrastTheme.";
const DARK: ReadonlySet<ContrastTheme> = new Set(["dark", "black", "yellow"]);
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is ContrastTheme =>
  CONTRAST_THEMES.includes(value as ContrastTheme);

/** The account whose theme is showing; null outside the student area. */
let owner: string | null = null;
let current: ContrastTheme = "default";

function read(accountId: string): ContrastTheme {
  try {
    const stored = localStorage.getItem(PREFIX + accountId);
    return isTheme(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

function apply(theme: ContrastTheme) {
  current = theme;
  const root = document.documentElement;
  root.classList.toggle("dark", DARK.has(theme));
  if (theme === "default" || theme === "dark") delete root.dataset.contrast;
  else root.dataset.contrast = theme;
  // Native controls (scrollbars, selects) follow the theme too.
  if (theme === "default") root.style.removeProperty("color-scheme");
  else root.style.colorScheme = DARK.has(theme) ? "dark" : "light";
  listeners.forEach((listener) => listener());
}

/** Shows the stored theme of this account. */
export function activateContrastTheme(accountId: string) {
  owner = accountId;
  apply(read(accountId));
}

/** Back to the default theme, leaving every stored choice untouched. */
export function deactivateContrastTheme() {
  owner = null;
  apply("default");
}

/** Changes the theme of the account that is showing, and remembers it for that account. */
export function setContrastTheme(theme: ContrastTheme) {
  apply(theme);
  if (!owner) return;
  try {
    localStorage.setItem(PREFIX + owner, theme);
  } catch {
    // Storage may be blocked; the theme still applies for this visit.
  }
}

export const getContrastTheme = () => current;

if (typeof window !== "undefined") {
  // The same account changed its theme in another tab: follow.
  window.addEventListener("storage", (event) => {
    if (owner && event.key === PREFIX + owner) apply(read(owner));
  });
}

export function useContrastTheme(): ContrastTheme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getContrastTheme,
    getContrastTheme,
  );
}

/**
 * Mount in the student area: shows this account's theme before the first
 * paint, and returns to the default when the student area is left.
 */
export function useAccountContrastTheme(accountId: string | null) {
  useLayoutEffect(() => {
    if (!accountId) return;
    activateContrastTheme(accountId);
    return deactivateContrastTheme;
  }, [accountId]);
}

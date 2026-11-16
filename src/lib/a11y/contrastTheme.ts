import { useSyncExternalStore } from "react";

/**
 * The student's colour theme. It is a personal reading preference kept on this
 * device only — nothing is sent to the Backend — and every theme meets the same
 * contrast floor as the default (text ≥ 7:1), so none is ever "less accessible".
 *
 * A theme is one attribute on `<html>`; `shared/tokens/tokens.css` does the rest.
 */
export const CONTRAST_THEMES = ["default", "dark", "black", "yellow", "white"] as const;
export type ContrastTheme = (typeof CONTRAST_THEMES)[number];

const KEY = "learnable.contrastTheme";
const DARK: ReadonlySet<ContrastTheme> = new Set(["dark", "black", "yellow"]);
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is ContrastTheme =>
  CONTRAST_THEMES.includes(value as ContrastTheme);

function read(): ContrastTheme {
  try {
    const stored = localStorage.getItem(KEY);
    return isTheme(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

let current: ContrastTheme = "default";

function apply(theme: ContrastTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", DARK.has(theme));
  if (theme === "default" || theme === "dark") delete root.dataset.contrast;
  else root.dataset.contrast = theme;
  // Native controls (scrollbars, selects) follow the theme too.
  root.style.colorScheme = DARK.has(theme) ? "dark" : "light";
}

/** Applies the stored theme. Call once, before the first render. */
export function initContrastTheme() {
  current = read();
  apply(current);
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    // Another tab changed it: follow.
    current = read();
    apply(current);
    listeners.forEach((listener) => listener());
  });
}

export function setContrastTheme(theme: ContrastTheme) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage may be blocked; the theme still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

export const getContrastTheme = () => current;

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

import { useEffect, useRef } from "react";

export type AssistantShortcut =
  | "newConversation"
  | "toggleMode"
  | "talk"
  | "replay"
  | "latestAnswer"
  | "stop"
  | "help";

/**
 * Page shortcuts. Ctrl is the only modifier base (the project convention, and
 * it stays clear of NVDA's Insert/CapsLock commands).
 *
 * "New conversation" is Ctrl+Shift+E, not Ctrl+Shift+N: Chrome and Edge keep
 * Ctrl+Shift+N for a new private window and never deliver it to the page.
 */
export const ASSISTANT_SHORTCUTS: Record<AssistantShortcut, string> = {
  newConversation: "Ctrl+Shift+E",
  toggleMode: "Ctrl+Shift+M",
  talk: "Ctrl+Space",
  replay: "Ctrl+Shift+L",
  latestAnswer: "Ctrl+Shift+H",
  stop: "Esc",
  help: "Ctrl+/",
};

function match(event: KeyboardEvent): AssistantShortcut | null {
  if (event.key === "Escape" && !event.ctrlKey && !event.altKey && !event.metaKey) return "stop";
  if (!event.ctrlKey || event.altKey || event.metaKey) return null;
  // The physical key, or the letter it types on another keyboard layout.
  const is = (code: string, key: string) => event.code === code || event.key.toLowerCase() === key;
  if (event.shiftKey) {
    if (is("KeyE", "e")) return "newConversation";
    if (is("KeyM", "m")) return "toggleMode";
    if (is("KeyL", "l")) return "replay";
    if (is("KeyH", "h")) return "latestAnswer";
    return null;
  }
  if (is("Space", " ")) return "talk";
  if (is("Slash", "/")) return "help";
  return null;
}

/**
 * `handlers[name]` returns `false` when it had nothing to do, so the key keeps
 * its normal meaning (Esc still closes a dialog, for example).
 */
export function useAssistantShortcuts(
  handlers: Record<AssistantShortcut, () => boolean | void>,
) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = match(event);
      if (!shortcut) return;
      // An open dialog owns the keyboard, Esc included.
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      if (latest.current[shortcut]() === false) return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

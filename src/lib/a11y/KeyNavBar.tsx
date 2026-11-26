import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useArrowKeyNavigation } from "@/lib/a11y/useArrowKeyNavigation";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

export type KeyNavAction = {
  /** A single key such as "1", or a chord such as "Alt+H". */
  shortcut: string;
  label: string;
  to: string;
};

/** Typing in a field must never trigger a page key. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function matches(event: KeyboardEvent, shortcut: string) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return false;
  const alt = shortcut.startsWith("Alt+");
  const key = alt ? shortcut.slice(4) : shortcut;
  if (alt) {
    // `code` names the physical key, so Alt+H still works where Alt changes the character (macOS).
    return event.altKey && (event.code === `Key${key}` || event.code === `Digit${key}` || event.key.toUpperCase() === key);
  }
  return !event.altKey && !isTyping(event.target) && event.key === key;
}

/**
 * A bar fixed to the bottom of the page: every place a visitor can go is a
 * large button there, and each button has its own key. ↑ and ↓ also move
 * between the controls of the page, like Tab and Shift+Tab. Single keys never
 * fire while typing or with a dialog open; Alt chords work from a field too.
 */
export function KeyNavBar({ actions, className }: { actions: readonly KeyNavAction[]; className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useArrowKeyNavigation("main");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const action = actions.find((item) => matches(event, item.shortcut));
      if (!action) return;
      event.preventDefault();
      navigate(action.to);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, navigate]);

  return (
    <nav
      aria-label={vi.app.keys.barLabel}
      className={cn("sticky bottom-0 z-40 border-t-4 border-foreground bg-background text-foreground", className)}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6">
        <ul className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const current = action.to === pathname;
            return (
              <li key={action.to}>
                <Link
                  to={action.to}
                  aria-keyshortcuts={action.shortcut}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-foreground px-3 text-base font-bold underline-offset-4 hover:underline",
                    current && "bg-foreground text-background",
                  )}
                >
                  <kbd
                    className={cn(
                      "rounded border-2 px-1.5 font-mono text-sm",
                      current ? "border-background" : "border-foreground",
                    )}
                  >
                    {action.shortcut}
                  </kbd>
                  {action.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="ms-auto flex items-center gap-2 text-sm font-semibold">
          <kbd className="rounded border-2 border-foreground px-1.5 font-mono">↑ ↓</kbd>
          {vi.app.keys.moveControls}
        </p>
      </div>
    </nav>
  );
}

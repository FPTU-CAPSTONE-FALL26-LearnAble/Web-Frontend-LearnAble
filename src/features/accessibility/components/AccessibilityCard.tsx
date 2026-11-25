import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { Link } from "react-router";
import {
  TextSizeSelect,
  ThemeSwatches,
  useSaveStatus,
} from "@/features/accessibility/components/DisplayControls";
import { useIsAccountOwner } from "@/lib/a11y/displayPreferences";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.a11ySettings;

/** Remembers whether this viewer left the card open — a convenience only. */
const OPEN_KEY = "learnable.a11yCard.open";
function wasOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === "true";
  } catch {
    return false;
  }
}
function rememberOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_KEY, String(open));
  } catch {
    // Without storage the card simply starts closed.
  }
}

/**
 * The "Accessibility" button at the end of a header and the card it opens:
 * text size and colour theme, changed in place on any page that has it.
 *
 * It is a disclosure, not a dialog: the page stays usable while it is open, so
 * a reader judges each option by reading the page with it. Escape closes it
 * and returns to the button; so does a click outside.
 *
 * Where a choice is kept follows `displayPreferences`: the account when a
 * student is signed in, this browser otherwise. The card says which, in words.
 */
export function AccessibilityCard({ settingsHref }: { settingsHref?: string }) {
  const [open, setOpen] = useState(wasOpen);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { failed, track } = useSaveStatus();
  const account = useIsAccountOwner();

  const toggle = (next: boolean) => {
    setOpen(next);
    rememberOpen(next);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
      rememberOpen(false);
    };
    // Escape closes the card when the keyboard is inside it, and returns to the button.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !wrapper.current?.contains(document.activeElement)) return;
      event.stopPropagation();
      setOpen(false);
      rememberOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => toggle(!open)}
        className="flex min-h-12 items-center gap-3 rounded-md border-2 border-foreground bg-foreground px-4 text-lg font-bold text-background hover:bg-background hover:text-foreground"
      >
        <Eye aria-hidden className="size-6" />
        {t.card.toggle}
        <ChevronDown aria-hidden className={cn("size-5 transition-transform", open && "rotate-180")} />
      </button>

      <section
        id={panelId}
        aria-label={t.card.panelLabel}
        hidden={!open}
        className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border-4 border-foreground bg-card text-card-foreground shadow-xl"
      >
        <div className="flex flex-col gap-6 p-5">
          <TextSizeSelect idPrefix={`${panelId}-card`} onSave={track} />
          <hr className="border-t-2 border-foreground" />
          <ThemeSwatches idPrefix={`${panelId}-card`} onSave={track} />
          <hr className="border-t-2 border-foreground" />
          {failed ? (
            <p role="alert" className="font-semibold text-destructive">
              {t.card.saveFailed}
            </p>
          ) : (
            <p>{account ? t.card.savedAccount : t.card.savedGuest}</p>
          )}
          <Link
            to={account ? (settingsHref ?? "/settings/accessibility") : "/student/login"}
            className="flex min-h-12 items-center justify-center rounded-md border-4 border-foreground px-4 text-center text-lg font-bold underline-offset-4 hover:underline"
          >
            {account ? t.card.moreSettings : t.card.signIn}
          </Link>
        </div>
      </section>
    </div>
  );
}

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { vi } from "@/shared/strings/vi";

/** Where the layout shows the current page's keys, next to the keys that work everywhere. */
export const PAGE_KEYS_SLOT = "page-keys";

export type KeyHint = readonly [key: string, label: string];

export function KeyHints({ keys }: { keys: readonly KeyHint[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {keys.map(([key, label]) => (
        <li key={label} className="flex items-center gap-2">
          <kbd className="rounded-md bg-primary px-2 py-1 font-mono font-bold text-primary-foreground">
            {key}
          </kbd>
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * The keys that act on the current page only. They are shown in the layout's
 * bottom bar, in their own group beside the keys that work on every page, so
 * a student can tell the two apart. Without that bar (a page rendered on its
 * own) they are shown in place.
 */
export function PageKeys({ keys }: { keys: readonly KeyHint[] }) {
  const [slot, setSlot] = useState<HTMLElement | null | undefined>(undefined);
  useLayoutEffect(() => setSlot(document.getElementById(PAGE_KEYS_SLOT)), []);
  if (slot === undefined) return null;
  if (slot) return createPortal(<KeyHints keys={keys} />, slot);
  return (
    <aside aria-label={vi.app.keys.label} className="border-t-2 border-border pt-3 text-base">
      <KeyHints keys={keys} />
    </aside>
  );
}

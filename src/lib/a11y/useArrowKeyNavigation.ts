import { useEffect } from "react";

/**
 * ↑ and ↓ move between the controls of a page, like Shift+Tab and Tab, so a
 * student can travel a whole page with one hand on the arrow keys.
 *
 * It never takes the arrows away from something that already uses them: text
 * fields, selects, radio groups, sliders, menus, tabs, an open dialog, or any
 * component that handled the key itself. At the first or last control the key
 * is left alone, so the page still scrolls.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Roles whose own keyboard pattern uses the arrow keys. */
const ARROW_ROLES = new Set([
  "menu", "menubar", "menuitem", "menuitemradio", "menuitemcheckbox",
  "listbox", "option", "combobox", "radio", "radiogroup", "slider", "spinbutton",
  "tab", "tablist", "tree", "treeitem", "grid", "gridcell", "textbox", "searchbox",
]);
const ARROW_INPUTS = new Set([
  "text", "search", "email", "password", "tel", "url", "number", "date", "time",
  "datetime-local", "month", "week", "range", "radio", "color",
]);

function usesArrows(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return ARROW_INPUTS.has((element as HTMLInputElement).type);
  const role = element.getAttribute("role");
  return role !== null && ARROW_ROLES.has(role);
}

const isShown = (element: HTMLElement) =>
  !element.closest("[hidden], [inert], [aria-hidden='true']") &&
  // Laid-out elements only; jsdom has no layout, so it reports none and all count.
  (element.getClientRects().length > 0 || typeof element.checkVisibility !== "function");

export function useArrowKeyNavigation(containerId: string) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }
      const container = document.getElementById(containerId);
      if (!container) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const active = document.activeElement;
      if (usesArrows(active)) return;

      const controls = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isShown);
      if (controls.length === 0) return;
      const down = event.key === "ArrowDown";
      let next: HTMLElement | undefined;
      if (active instanceof HTMLElement && container.contains(active)) {
        const index = controls.indexOf(active);
        if (index >= 0) {
          next = controls[index + (down ? 1 : -1)];
        } else {
          // Focus is on something outside the tab order (a heading, a message):
          // go to the nearest control after or before it.
          const following = (control: HTMLElement) =>
            !!(active.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING);
          next = down ? controls.find(following) : controls.filter((c) => !following(c)).at(-1);
        }
      } else if (down) {
        // Focus is in the header, the footer or nowhere: ↓ enters the page.
        next = active === document.body || active === null ? controls[0] : undefined;
      }
      if (!next) return;
      event.preventDefault();
      next.focus();
      next.scrollIntoView?.({ block: "nearest" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [containerId]);
}

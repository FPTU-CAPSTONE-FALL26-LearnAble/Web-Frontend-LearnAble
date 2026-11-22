import type { KeyboardEvent } from "react";

/**
 * Keyboard for a `role="radiogroup"` of buttons, following the ARIA radio pattern: arrows move focus and select,
 * wrapping at the ends; Home and End go to the first and last option. Other keys (Tab, Escape) are left alone.
 * Attach it to each radio. Only the checked option should have `tabIndex={0}`; the rest `-1`.
 */
export function handleRadioGroupKeyDown<T>(
  event: KeyboardEvent<HTMLElement>,
  values: readonly T[],
  current: T,
  onChange?: (value: T) => void,
): void {
  const index = Math.max(0, values.indexOf(current));
  const last = values.length - 1;
  const next =
    event.key === "ArrowDown" || event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
    : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
    : event.key === "Home" ? 0
    : event.key === "End" ? last
    : null;
  if (next === null) return;
  event.preventDefault();
  onChange?.(values[next]);
  const radios = event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLElement>('[role="radio"]');
  radios?.[next]?.focus();
}

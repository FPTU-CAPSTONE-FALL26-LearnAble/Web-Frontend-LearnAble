import { useCallback, useState } from "react";

/** A preference kept on this device, so it is still set on the next visit. */
export function useStoredState<T extends string | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Private browsing: the choice still holds for this visit.
      }
    },
    [key],
  );
  return [value, update] as const;
}

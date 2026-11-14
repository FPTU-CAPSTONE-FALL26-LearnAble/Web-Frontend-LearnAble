import { useCallback, useEffect, useState } from "react";

/** A true/false switch whose last value is remembered per browser under `storageKey`. */
export function usePersistedFlag(storageKey: string, initial = false) {
  const [flag, setFlag] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, flag ? "1" : "0");
    } catch {
      // Storage can be blocked; the switch still works for this visit.
    }
  }, [flag, storageKey]);

  const toggle = useCallback(() => setFlag((value) => !value), []);
  return [flag, toggle] as const;
}

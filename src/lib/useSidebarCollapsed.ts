import { usePersistedFlag } from "@/lib/usePersistedFlag";

/** Whether a sidebar is folded to its icon rail. The choice is remembered per browser. */
export const useSidebarCollapsed = (storageKey: string) => usePersistedFlag(storageKey, false);

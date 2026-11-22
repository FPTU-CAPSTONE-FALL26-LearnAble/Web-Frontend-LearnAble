import { ApiFailure } from "@/api/client";

const NAMES_KEY = "learnable:examiner:student-names";
const FORBIDDEN_KEY = "learnable:examiner:users-forbidden";

export type KnownStudent = { fullName?: string | null; userCode?: string | null };

function readJson(key: string): Record<string, KnownStudent> {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, KnownStudent>) : {};
  } catch {
    return {};
  }
}

/** Names and codes learned from validated student lists, kept for this browser session. */
export const readStudentNames = () => readJson(NAMES_KEY);

export function rememberStudentNames(rows: Array<{ studentId?: string | null; fullName?: string | null; studentCode?: string | null }>) {
  const known = readJson(NAMES_KEY);
  for (const row of rows) {
    if (!row.studentId || (!row.fullName && !row.studentCode)) continue;
    known[row.studentId] = { fullName: row.fullName ?? known[row.studentId]?.fullName, userCode: row.studentCode ?? known[row.studentId]?.userCode };
  }
  try {
    sessionStorage.setItem(NAMES_KEY, JSON.stringify(known));
  } catch {
    // Names are a convenience; a full or blocked storage only means they are not remembered.
  }
  return known;
}

/**
 * Reads the student accounts, once. If the Backend says this account may not read them (403), that is
 * remembered for the session and not asked again, so the console is not filled with the same refusal.
 */
export async function loadStudentAccounts<T>(read: () => Promise<{ items: T[] }>): Promise<{ items: T[]; forbidden: boolean }> {
  try {
    if (sessionStorage.getItem(FORBIDDEN_KEY) === "1") return { items: [], forbidden: true };
  } catch {
    // Without storage the request is simply made.
  }
  try {
    return { items: (await read()).items, forbidden: false };
  } catch (error) {
    if (error instanceof ApiFailure && error.detail.kind === "server" && error.detail.status === 403) {
      try {
        sessionStorage.setItem(FORBIDDEN_KEY, "1");
      } catch {
        // See above.
      }
      return { items: [], forbidden: true };
    }
    throw error;
  }
}

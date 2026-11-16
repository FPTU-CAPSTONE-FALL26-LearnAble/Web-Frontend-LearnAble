import { foldText } from "@/lib/foldText";

/** The marker admin.ts puts where the Backend sent no value. */
const MISSING = "Not available";

type ProfileLike = { userId: string; fullName?: string | null; studentCode?: string | null };
type AccountLike = { fullName?: string | null; userCode?: string | null };

const usable = (value?: string | null) => (value && value !== MISSING ? value : "");

/**
 * What to call a student in a list. The real name and code come from the user account; the profile
 * has neither, so a profile with no account found shows the start of its id instead of nothing.
 */
export function studentLabel(profile: ProfileLike, account?: AccountLike) {
  const shortId = profile.userId.slice(0, 8);
  const name = usable(account?.fullName) || usable(profile.fullName);
  const code = usable(account?.userCode) || usable(profile.studentCode);
  return {
    name: name || `Student ${shortId}`,
    code: code || shortId,
    /** The name and code are the account's own, not stand-ins made from the id. */
    known: Boolean(name || code),
  };
}

export const matchesStudentSearch = (label: { name: string; code: string }, query: string) => {
  const wanted = foldText(query.trim());
  return !wanted || foldText(`${label.name} ${label.code}`).includes(wanted);
};

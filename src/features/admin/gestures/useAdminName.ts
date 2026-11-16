import { useQuery } from "@tanstack/react-query";
import { getAdminUser } from "@/api/admin";
import { adminKeys } from "../api/useAdminData";

/**
 * The display name for a user id recorded by the gesture history. The backend
 * only stores the id, so the name is looked up and cached per id.
 */
export function useAdminName(userId: string | null | undefined): string | null {
  const user = useQuery({
    queryKey: adminKeys.list("users", ["one", userId]),
    queryFn: () => getAdminUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!userId) return null;
  if (user.data) return user.data.fullName?.trim() || user.data.email?.trim() || "an administrator";
  return user.isError ? "an administrator" : null;
}

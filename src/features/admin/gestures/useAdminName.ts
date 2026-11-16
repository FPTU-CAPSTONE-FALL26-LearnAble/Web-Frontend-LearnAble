import { useQuery } from "@tanstack/react-query";
import { getAdminUser } from "@/api/admin";
import { useAuthStore } from "@/features/auth/store/authStore";
import { adminKeys } from "../api/useAdminData";

/**
 * The display name for a user id recorded by the gesture history. The backend
 * only stores the id, so the name is looked up and cached per id. The
 * signed-in admin is named from the session: the deployed `GET /Users/{id}`
 * answers 404 for the system Admin's own id.
 */
export function useAdminName(userId: string | null | undefined): string | null {
  const me = useAuthStore((state) => state.user);
  const isMe = !!userId && me?.id === userId;
  const user = useQuery({
    queryKey: adminKeys.list("users", ["one", userId]),
    queryFn: () => getAdminUser(userId!),
    enabled: !!userId && !isMe,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!userId) return null;
  if (isMe) return me.fullName?.trim() || me.email?.trim() || "you";
  if (user.data) return user.data.fullName?.trim() || user.data.email?.trim() || "an administrator";
  return user.isError ? "an administrator" : null;
}

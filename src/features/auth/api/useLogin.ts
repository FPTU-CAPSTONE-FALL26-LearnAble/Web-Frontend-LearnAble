import { useMutation } from "@tanstack/react-query";
import { getCurrentUser, login } from "@/api/auth";
import { tokenStore } from "@/lib/auth/tokenStore";
import { useAuthStore } from "@/features/auth/store/authStore";

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async ({ remember, ...credentials }: { identifier: string; password: string; remember: boolean }) => {
      const tokens = await login(credentials);
      tokenStore.set(tokens, remember);
      try {
        const user = await getCurrentUser();
        return user;
      } catch (error) {
        tokenStore.clear();
        throw error;
      }
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });
}

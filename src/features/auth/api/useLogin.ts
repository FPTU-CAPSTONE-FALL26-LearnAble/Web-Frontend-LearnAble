import { useMutation } from "@tanstack/react-query";
import { login } from "@/api/auth";
import { tokenStore } from "@/lib/auth/tokenStore";
import { useAuthStore } from "@/features/auth/store/authStore";

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      tokenStore.set(token);
      setUser(user);
    },
  });
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/api/auth";
import { tokenStore } from "@/lib/auth/tokenStore";

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => {
        tokenStore.clear();
        set({ user: null });
      },
    }),
    { name: "learnable.auth.user" },
  ),
);

export function isAuthenticated(): boolean {
  return tokenStore.get() !== null;
}

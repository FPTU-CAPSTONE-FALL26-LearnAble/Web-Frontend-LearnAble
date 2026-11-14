import { useEffect } from "react";
import { ApiFailure } from "@/api/client";
import { useAuthStore } from "@/features/auth/store/authStore";

/** Logs the current user out when a query fails because the session expired. */
export function useExpiredSession(error: unknown) {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (error instanceof ApiFailure && error.detail.kind === "unauthorized") {
      logout();
      window.location.assign("/login");
    }
  }, [error, logout]);
}

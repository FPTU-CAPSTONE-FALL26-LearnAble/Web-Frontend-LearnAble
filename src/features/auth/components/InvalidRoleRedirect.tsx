import { useEffect } from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";

export function InvalidRoleRedirect() {
  const logout = useAuthStore((state) => state.logout);
  useEffect(() => logout(), [logout]);
  return <Navigate to="/login" replace />;
}

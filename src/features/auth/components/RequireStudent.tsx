import { Navigate, Outlet } from "react-router";
import { InvalidRoleRedirect } from "@/features/auth/components/InvalidRoleRedirect";
import {
  getRoleDestination,
  normalizeSupportedRole,
} from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAccountContrastTheme } from "@/lib/a11y/contrastTheme";

export function RequireStudent() {
  const role = normalizeSupportedRole(
    useAuthStore((state) => state.user?.role),
  );
  const userId = useAuthStore((state) => state.user?.id ?? null);
  // The student's own colour theme, for the student area only.
  useAccountContrastTheme(role === "student" ? userId : null);
  if (role === "student") return <Outlet />;
  const destination = getRoleDestination(role);
  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <InvalidRoleRedirect />
  );
}

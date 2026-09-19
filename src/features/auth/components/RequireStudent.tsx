import { Navigate, Outlet } from "react-router";
import { InvalidRoleRedirect } from "@/features/auth/components/InvalidRoleRedirect";
import {
  getRoleDestination,
  normalizeSupportedRole,
} from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";

export function RequireStudent() {
  const role = normalizeSupportedRole(
    useAuthStore((state) => state.user?.role),
  );
  if (role === "student") return <Outlet />;
  const destination = getRoleDestination(role);
  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <InvalidRoleRedirect />
  );
}

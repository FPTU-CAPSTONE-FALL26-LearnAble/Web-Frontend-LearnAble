import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";
import { InvalidRoleRedirect } from "@/features/auth/components/InvalidRoleRedirect";
import {
  getRoleDestination,
  normalizeSupportedRole,
} from "@/features/auth/roleRouting";

export function RequireExaminer() {
  const role = normalizeSupportedRole(
    useAuthStore((state) => state.user?.role),
  );
  if (role === "examiner") return <Outlet />;
  const destination = getRoleDestination(role);
  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <InvalidRoleRedirect />
  );
}

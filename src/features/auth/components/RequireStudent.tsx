import { Navigate, Outlet } from "react-router";
import { InvalidRoleRedirect } from "@/features/auth/components/InvalidRoleRedirect";
import {
  getRoleDestination,
  normalizeSupportedRole,
} from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useDisplayPreferenceScope } from "@/lib/a11y/displayPreferences";

export function RequireStudent() {
  const role = normalizeSupportedRole(
    useAuthStore((state) => state.user?.role),
  );
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const signedIn = useAuthStore((state) => state.user !== null);
  // The student's own look (theme, text size), for the student area only.
  useDisplayPreferenceScope(role === "student" ? userId : null);
  if (role === "student") return <Outlet />;
  // `RequireAuth` above already sends anyone who never signed in to a sign-in
  // page, so no user here means the student has just signed out: they go to
  // the public home page, not to a sign-in page.
  if (!signedIn) return <Navigate to="/" replace />;
  const destination = getRoleDestination(role);
  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <InvalidRoleRedirect />
  );
}

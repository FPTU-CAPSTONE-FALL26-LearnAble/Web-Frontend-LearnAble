import { Navigate, Outlet, useLocation } from "react-router";
import { isAuthenticated } from "@/features/auth/store/authStore";

export function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

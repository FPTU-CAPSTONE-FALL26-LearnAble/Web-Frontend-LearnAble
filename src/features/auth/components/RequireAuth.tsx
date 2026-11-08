import { Navigate, Outlet, useLocation } from "react-router";
import { isStudentPath } from "@/features/auth/roleRouting";
import { isAuthenticated } from "@/features/auth/store/authStore";

export function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return (
      <Navigate
        to={isStudentPath(location.pathname) ? "/student/login" : "/login"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <Outlet />;
}

import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { SESSION_EXPIRED_EVENT } from "@/api/client";
import { isStudentPath } from "@/features/auth/roleRouting";
import { isAuthenticated, useAuthStore } from "@/features/auth/store/authStore";

export function RequireAuth() {
  const location = useLocation();
  const [, setExpired] = useState(0);
  // A session that could not be renewed ends here: sign out and show the sign-in page.
  useEffect(() => {
    const onExpired = () => {
      useAuthStore.getState().logout();
      setExpired((count) => count + 1);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);
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

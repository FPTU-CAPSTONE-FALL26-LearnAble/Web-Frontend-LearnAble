import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { getCurrentUser } from "@/api/auth";
import { BrandIdentity } from "@/components/BrandIdentity";
import { useAuthStore } from "@/features/auth/store/authStore";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { Button } from "@/shared/ui/primitives/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/ui/primitives/sheet";
import { StaffSidebar } from "./StaffSidebar";
import "@/features/admin/components/admin-theme.css";
import "./staff-theme.css";

export function StaffLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed("learnable.staff.sidebar-collapsed");
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // A persisted session can predate the tenant fields added to /auth/me.
  // Refresh Staff scope here so tenant-owned forms always receive universityId.
  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((currentUser) => {
        if (active && currentUser.role.toLowerCase() === "staff")
          setUser(currentUser);
      })
      .catch(() => {
        // Route-level requests surface authentication and network failures.
      });
    return () => {
      active = false;
    };
  }, [setUser]);
  const sidebarProps = {
    activePath: pathname,
    user,
    onSignOut: () => {
      logout();
      navigate("/login", { replace: true });
    },
  };
  return (
    <div className="staff-shell admin-shell min-h-screen bg-white lg:flex">
      <SkipLink />
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-border lg:block", collapsed ? "w-16" : "w-64")}>
        <StaffSidebar {...sidebarProps} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
        <Button
          size="icon"
          variant="outline"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        <BrandIdentity compact />
        <span className="max-w-24 truncate text-xs font-bold">
          {user.fullName}
        </span>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle className="sr-only">Staff navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between staff operations.
          </SheetDescription>
          <StaffSidebar {...sidebarProps} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main
        id="main"
        className={cn("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8", collapsed ? "lg:ml-16" : "lg:ml-64")}
      >
        <div className="mx-auto max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

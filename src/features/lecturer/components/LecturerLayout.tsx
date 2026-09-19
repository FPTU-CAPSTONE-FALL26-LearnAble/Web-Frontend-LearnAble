import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/features/auth/store/authStore";
import { lecturerDashboardFixture } from "@/features/lecturer/data/dashboardFixture";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { toast } from "@/shared/ui/primitives/Toast";
import { LecturerSidebar } from "./LecturerSidebar";
import { BrandIdentity } from "@/components/BrandIdentity";
import "./lecturer-theme.css";

export function LecturerLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isStudio = location.pathname === "/lecturer/questions/new";
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const logout = useAuthStore((state) => state.logout);
  const sidebarProps = {
    activePath: location.pathname,
    user,
    campus: lecturerDashboardFixture.campus,
    semester: lecturerDashboardFixture.semester,
    onSignOut: () => {
      logout();
      navigate("/login", { replace: true });
    },
    onUnavailable: (label: string) =>
      toast({
        title: "Feature not connected",
        description: `${label} will be available when its backend workflow is connected.`,
      }),
  };
  return (
    <div className="lecturer-shell min-h-screen bg-background lg:flex">
      <SkipLink />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--color-border-subtle)] lg:block">
        <LecturerSidebar {...sidebarProps} />
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border-subtle)] bg-card px-4 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden />
        </Button>
        <BrandIdentity lecturer compact roleLabel={user.role} />
        <span className="max-w-28 truncate text-sm font-semibold">
          {user.fullName}
        </span>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle className="sr-only">Lecturer navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between lecturer tools.
          </SheetDescription>
          <LecturerSidebar
            {...sidebarProps}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <main
        id="main"
        className={
          isStudio
            ? "min-w-0 flex-1 lg:ml-64 xl:h-dvh xl:overflow-hidden"
            : "min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8"
        }
      >
        <div className={isStudio ? "xl:h-full" : "mx-auto max-w-[1440px]"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

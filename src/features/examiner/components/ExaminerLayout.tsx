import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { BrandIdentity } from "@/components/BrandIdentity";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";
import { Button } from "@/shared/ui/primitives/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/ui/primitives/sheet";
import { useAuthStore } from "@/features/auth/store/authStore";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { toast } from "@/shared/ui/primitives/toast";
import { ExaminerSidebar } from "./ExaminerSidebar";
import { OperationProgress } from "./OperationProgress";
import "./examiner-theme.css";

export function ExaminerLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed("learnable.examiner.sidebar-collapsed");
  const user = useAuthStore((state) => state.user)!;
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const props = {
    user,
    onSignOut: () => {
      logout();
      navigate("/login", { replace: true });
    },
    onUnavailable: (label: string) =>
      toast({
        title: "Coming soon",
        description: `${label} is not available yet. You can continue with the other examiner tools.`,
      }),
  };
  return (
    <div className="examiner-shell min-h-screen bg-white lg:flex">
      <SkipLink />
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-border lg:block", collapsed ? "w-16" : "w-68")}>
        <ExaminerSidebar {...props} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
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
          <SheetTitle className="sr-only">Examiner navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between examiner tools.
          </SheetDescription>
          <ExaminerSidebar {...props} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main
        id="main"
        className={cn("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8", collapsed ? "lg:ml-16" : "lg:ml-68")}
      >
        <div className="mx-auto max-w-[1440px]">
          <Outlet />
        </div>
      </main>
      <OperationProgress />
    </div>
  );
}

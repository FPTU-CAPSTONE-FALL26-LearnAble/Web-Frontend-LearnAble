import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { BrandIdentity } from "@/components/BrandIdentity";
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
import "./examiner-theme.css";

export function ExaminerLayout() {
  const [open, setOpen] = useState(false);
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
        title: "Feature not connected",
        description: `${label} is not connected to the backend yet.`,
      }),
  };
  return (
    <div className="examiner-shell min-h-screen bg-white lg:flex">
      <SkipLink />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border lg:block">
        <ExaminerSidebar {...props} />
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
        <BrandIdentity lecturer compact roleLabel={user.role} />
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
        className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

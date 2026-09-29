import {
  AlertTriangle,
  CalendarDays,
  FileStack,
  LayoutDashboard,
  LogOut,
  MonitorCheck,
} from "lucide-react";
import { NavLink } from "react-router";
import type { User } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { Separator } from "@/shared/ui/primitives/separator";
import { BrandIdentity } from "@/components/BrandIdentity";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", path: "/examiner/dashboard", icon: LayoutDashboard },
  { label: "Exam Paper Management", path: "/examiner/exams", icon: FileStack },
  { label: "Exam Schedule", path: "/examiner/schedule", icon: CalendarDays },
  {
    label: "Live Exam Monitoring",
    path: "/examiner/monitoring",
    icon: MonitorCheck,
  },
];

export function ExaminerSidebar({
  user,
  onNavigate,
  onSignOut,
  onUnavailable,
}: {
  user: User;
  onNavigate?: () => void;
  onSignOut: () => void;
  onUnavailable: (label: string) => void;
}) {
  const initials =
    user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "EX";
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-4 py-4">
      <div className="border-b border-[var(--color-border-subtle)] px-1 pb-4">
        <BrandIdentity lecturer roleLabel={user.role || "Examiner"} />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] p-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-[var(--color-text)] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">Exam Operations</p>
        </div>
      </div>
      <nav aria-label="Examiner navigation" className="mt-5 space-y-1">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path.endsWith("dashboard")}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-bold transition",
                isActive ||
                  (path !== "/examiner/dashboard" &&
                    location.pathname.startsWith(path))
                  ? "border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action)_9%,white)] text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-[color-mix(in_srgb,var(--color-action)_6%,white)] hover:text-foreground",
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => onUnavailable("Emergency workspace")}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm font-bold text-muted-foreground hover:bg-[color-mix(in_srgb,var(--color-error)_8%,white)] hover:text-foreground"
        >
          <AlertTriangle
            className="size-5 text-[var(--color-error)]"
            aria-hidden
          />
          Emergency
        </button>
      </nav>
      <div className="mt-auto pt-8">
        <Separator className="mb-4" />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              FPT University examiner
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Sign out"
            onClick={onSignOut}
          >
            <LogOut aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

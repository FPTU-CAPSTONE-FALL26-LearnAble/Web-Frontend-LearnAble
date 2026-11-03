import {
  AlertTriangle,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  FileStack,
  Flag,
  LayoutDashboard,
  LogOut,
  MonitorCheck,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import type { User } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { Separator } from "@/shared/ui/primitives/separator";
import { BrandIdentity } from "@/components/BrandIdentity";
import { DemoDataToggle } from "@/components/DemoDataToggle";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
};

const dashboard: NavigationItem = {
  label: "Dashboard",
  path: "/examiner/dashboard",
  icon: LayoutDashboard,
};

const groups: NavigationGroup[] = [
  {
    id: "preparation",
    label: "Exam preparation",
    icon: FileStack,
    items: [
      { label: "Exam papers", path: "/examiner/exams", icon: FileStack },
      { label: "Exam schedule", path: "/examiner/schedule", icon: CalendarDays },
    ],
  },
  {
    id: "operations",
    label: "Exam operations",
    icon: MonitorCheck,
    items: [
      {
        label: "Live monitoring",
        path: "/examiner/monitoring",
        icon: MonitorCheck,
      },
      { label: "Extra time", path: "/examiner/accommodations", icon: TimerReset },
    ],
  },
  {
    id: "review-reporting",
    label: "Review & reporting",
    icon: ChartNoAxesCombined,
    items: [
      { label: "Grade release", path: "/examiner/results", icon: ClipboardCheck },
      { label: "Integrity review", path: "/examiner/reviews", icon: Flag },
      { label: "Flagged sessions", path: "/examiner/flags", icon: AlertTriangle },
      {
        label: "Exam reports",
        path: "/examiner/reports",
        icon: ChartNoAxesCombined,
      },
    ],
  },
];

const itemClasses = (active: boolean, nested = false) =>
  cn(
    "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition-colors",
    nested ? "py-2" : "py-2.5",
    active
      ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
      : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
  );

function NavigationGroup({
  group,
  activePath,
  onNavigate,
}: {
  group: NavigationGroup;
  activePath: string;
  onNavigate?: () => void;
}) {
  const groupActive = group.items.some(
    (item) => activePath === item.path || activePath.startsWith(`${item.path}/`),
  );
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  const GroupIcon = group.icon;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`examiner-nav-${group.id}`}
        onClick={() => setOpen((value) => !value)}
        className={itemClasses(groupActive)}
      >
        <GroupIcon className="size-5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={`examiner-nav-${group.id}`}
          className="ml-5 mt-1 space-y-1 border-l border-border pl-3"
        >
          {group.items.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) =>
                itemClasses(isActive || activePath.startsWith(`${path}/`), true)
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  const { pathname } = useLocation();
  const DashboardIcon = dashboard.icon;
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
      <div className="border-b border-border px-1 pb-4">
        <BrandIdentity />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
        <Avatar size="lg">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">Exam Operations</p>
        </div>
      </div>
      <nav aria-label="Examiner navigation" className="mt-5 space-y-1">
        <NavLink
          to={dashboard.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => itemClasses(isActive)}
        >
          <DashboardIcon className="size-5 shrink-0" aria-hidden />
          {dashboard.label}
        </NavLink>
        {groups.map((group) => (
          <NavigationGroup
            key={group.id}
            group={group}
            activePath={pathname}
            onNavigate={onNavigate}
          />
        ))}
        <button
          type="button"
          onClick={() => onUnavailable("Emergency workspace")}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm font-semibold text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
          Emergency
        </button>
      </nav>
      <div className="mt-auto pt-8">
        <DemoDataToggle />
        <Separator className="my-4" />
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

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
  Camera,
  PackageCheck,
  TimerReset,
  Bell,
  BellRing,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import type { User } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { BrandIdentity } from "@/components/BrandIdentity";
import { SidebarCollapseButton, SidebarRailButton, SidebarRailDivider, SidebarRailLink } from "@/components/SidebarControls";
import { cn } from "@/lib/utils";
import { getUnreadNotificationCount } from "@/api/notifications";

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

const notifications: NavigationItem = { label: "Notifications", path: "/examiner/notifications", icon: Bell };

const groups: NavigationGroup[] = [
  {
    id: "preparation",
    label: "Exam preparation",
    icon: FileStack,
    items: [
      { label: "Exam papers", path: "/examiner/exams", icon: FileStack },
      { label: "Sealed packages", path: "/examiner/sealed-papers", icon: PackageCheck },
      { label: "Proctoring policy", path: "/examiner/proctoring-policy", icon: Camera },
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
    "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold leading-snug transition-colors",
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
        <span className="min-w-0 flex-1 wrap-anywhere">{group.label}</span>
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
          className="ml-4 mt-1 space-y-1 border-l border-border pl-2"
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
              <span className="min-w-0 flex-1 wrap-anywhere">{label}</span>
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
  collapsed = false,
  onToggleCollapsed,
}: {
  user: User;
  onNavigate?: () => void;
  onSignOut: () => void;
  onUnavailable: (label: string) => void;
  /** Shows the icon rail instead of the full list. Only the desktop sidebar can be collapsed. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  // Bring the current page into view when it sits below the fold of a short window.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: "nearest" });
  }, [pathname]);
  const unreadNotifications = useQuery({
    queryKey: ["my-notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
  const DashboardIcon = dashboard.icon;
  const initials =
    user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "EX";
  const unreadCount = unreadNotifications.data?.unreadCount ?? 0;
  if (collapsed && onToggleCollapsed) {
    return (
      <div className="flex h-full flex-col items-center bg-white px-2 py-3">
        <SidebarCollapseButton collapsed onToggle={onToggleCollapsed} />
        <nav
          ref={navRef}
          aria-label="Examiner navigation"
          className="examiner-scroll mt-3 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1 pb-2"
        >
          <SidebarRailLink to={dashboard.path} label={dashboard.label} icon={dashboard.icon} end />
          <SidebarRailLink to={notifications.path} label={notifications.label} icon={Bell} end badge={unreadCount} />
          <SidebarRailLink to="/examiner/notifications/manage" label="Send notifications" icon={BellRing} end />
          {groups.map((group) => (
            <Fragment key={group.id}>
              <SidebarRailDivider />
              {group.items.map(({ label, path, icon }) => (
                <SidebarRailLink key={path} to={path} label={label} icon={icon} />
              ))}
            </Fragment>
          ))}
          <SidebarRailDivider />
          <SidebarRailButton label="Emergency" icon={AlertTriangle} danger onClick={() => onUnavailable("Emergency workspace")} />
        </nav>
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border pt-3">
          <Avatar title={user.fullName}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <SidebarRailButton label="Sign out" icon={LogOut} onClick={onSignOut} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col bg-white px-4 py-4">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-1 pb-3">
        <BrandIdentity />
        {onToggleCollapsed ? <SidebarCollapseButton collapsed={false} onToggle={onToggleCollapsed} /> : null}
      </div>
      {/* Only the list scrolls, so the brand and the account controls never leave the screen. */}
      <nav
        ref={navRef}
        aria-label="Examiner navigation"
        className="examiner-scroll -mx-1 mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2"
      >
        <NavLink
          to={dashboard.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => itemClasses(isActive)}
        >
          <DashboardIcon className="size-5 shrink-0" aria-hidden />
          {dashboard.label}
        </NavLink>
        <NavLink to={notifications.path} end onClick={onNavigate} className={({ isActive }) => itemClasses(isActive)}><Bell className="size-5 shrink-0" aria-hidden /><span className="min-w-0 flex-1">{notifications.label}</span>{unreadNotifications.data?.unreadCount ? <span aria-label={`${unreadNotifications.data.unreadCount} unread notifications`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">{unreadNotifications.data.unreadCount > 99 ? "99+" : unreadNotifications.data.unreadCount}</span> : null}</NavLink>
        <NavLink to="/examiner/notifications/manage" onClick={onNavigate} className={({ isActive }) => itemClasses(isActive)}><BellRing className="size-5 shrink-0" aria-hidden /><span>Send notifications</span></NavLink>
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
      <div className="shrink-0 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 wrap-anywhere text-sm font-bold" title={user.fullName}>{user.fullName}</p>
            <p className="text-xs text-muted-foreground">
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

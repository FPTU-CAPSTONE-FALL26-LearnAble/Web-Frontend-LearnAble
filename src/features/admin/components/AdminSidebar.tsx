import {
  Building2,
  CalendarRange,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Network,
  ScrollText,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import type { User } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandIdentity } from "@/components/BrandIdentity";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Item = { label: string; path: string; icon: LucideIcon };
type Group = { label: string; id: string; icon: LucideIcon; items: Item[] };

export const adminNavigation: { dashboard: Item; groups: Group[] } = {
  dashboard: {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  groups: [
    {
      label: "Organisation",
      id: "organisation",
      icon: Network,
      items: [
        { label: "Departments", path: "/admin/departments", icon: Building2 },
        { label: "Majors", path: "/admin/majors", icon: GraduationCap },
        {
          label: "Specializations",
          path: "/admin/specializations",
          icon: Network,
        },
      ],
    },
    {
      label: "Academic Structure",
      id: "academic",
      icon: LibraryBig,
      items: [
        { label: "Subjects", path: "/admin/subjects", icon: LibraryBig },
        { label: "Semesters", path: "/admin/semesters", icon: CalendarRange },
        { label: "Curriculums", path: "/admin/curriculums", icon: ScrollText },
      ],
    },
    {
      label: "People",
      id: "people",
      icon: Users,
      items: [
        { label: "User Accounts", path: "/admin/users", icon: UserCog },
        {
          label: "Student Profiles",
          path: "/admin/student-profiles",
          icon: UserRound,
        },
        {
          label: "Lecturer Profiles",
          path: "/admin/lecturer-profiles",
          icon: Users,
        },
      ],
    },
  ],
};

const itemClasses = (active: boolean, nested: boolean) =>
  cn(
    "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition-colors",
    nested ? "py-2" : "py-2.5",
    active
      ? "border-[var(--color-action)] bg-[var(--color-selected-bg)] text-[var(--color-text)]"
      : "border-transparent text-muted-foreground hover:bg-[var(--color-selected-bg)] hover:text-foreground",
  );

function NavGroup({
  group,
  activePath,
  onNavigate,
}: {
  group: Group;
  activePath: string;
  onNavigate?: () => void;
}) {
  const groupActive = group.items.some(
    (item) => item.path === activePath || activePath.startsWith(`${item.path}/`),
  );
  const [open, setOpen] = useState(groupActive);
  // A descendant becoming active must always reveal its group.
  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);
  const GroupIcon = group.icon;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`admin-nav-${group.id}`}
        onClick={() => setOpen((value) => !value)}
        className={itemClasses(groupActive, false)}
      >
        <GroupIcon aria-hidden className="size-5 shrink-0" />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          id={`admin-nav-${group.id}`}
          className="ml-5 mt-1 space-y-1 border-l border-[var(--color-border-subtle)] pl-3"
        >
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) => itemClasses(isActive, true)}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  activePath,
  user,
  onSignOut,
  onNavigate,
}: {
  activePath: string;
  user: User;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const initials =
    user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AD";
  const DashboardIcon = adminNavigation.dashboard.icon;
  return (
    <div className="admin-scroll flex h-full flex-col overflow-y-auto bg-white px-4 py-4">
      <div className="border-b border-[var(--color-border-subtle)] px-1 pb-4">
        <BrandIdentity lecturer roleLabel={user.role || "Admin"} />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] p-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-[var(--color-text)] font-bold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">System Administration</p>
        </div>
      </div>
      <nav aria-label="Admin navigation" className="mt-5 space-y-1">
        <NavLink
          to={adminNavigation.dashboard.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => itemClasses(isActive, false)}
        >
          <DashboardIcon aria-hidden className="size-5 shrink-0" />
          {adminNavigation.dashboard.label}
        </NavLink>
        {adminNavigation.groups.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            activePath={activePath}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="mt-auto pt-8">
        <Separator className="mb-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              FPT University administrator
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
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

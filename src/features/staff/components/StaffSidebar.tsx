import {
  Building2,
  ChevronDown,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Network,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import type { User } from "@/api/auth";
import { BrandIdentity } from "@/components/BrandIdentity";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Button } from "@/shared/ui/primitives/button";
import { Separator } from "@/shared/ui/primitives/separator";
import { cn } from "@/lib/utils";

type Item = { label: string; path: string; icon: LucideIcon };
type Group = { label: string; id: string; icon: LucideIcon; items: Item[] };

const dashboard: Item = {
  label: "Dashboard",
  path: "/staff/dashboard",
  icon: LayoutDashboard,
};
const groups: Group[] = [
  {
    label: "People",
    id: "people",
    icon: Users,
    items: [
      { label: "User Accounts", path: "/staff/users", icon: UserCog },
      {
        label: "Student Records",
        path: "/staff/student-profiles",
        icon: GraduationCap,
      },
      {
        label: "Lecturer Records",
        path: "/staff/lecturer-profiles",
        icon: UserRoundCheck,
      },
      {
        label: "Examiner Records",
        path: "/staff/examiner-records",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Organisation",
    id: "organisation",
    icon: Network,
    items: [
      { label: "Departments", path: "/staff/departments", icon: Building2 },
      { label: "Majors", path: "/staff/majors", icon: GraduationCap },
    ],
  },
  {
    label: "Academic Structure",
    id: "academic",
    icon: LibraryBig,
    items: [
      { label: "Subjects", path: "/staff/subjects", icon: LibraryBig },
      { label: "Curriculums", path: "/staff/curriculums", icon: ScrollText },
      {
        label: "Default Exam Policy",
        path: "/staff/default-policy",
        icon: Settings2,
      },
    ],
  },
  {
    label: "Facilities",
    id: "facilities",
    icon: DoorOpen,
    items: [
      {
        label: "Exam Rooms & Seats",
        path: "/staff/exam-rooms",
        icon: DoorOpen,
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
      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );

function StaffNavGroup({
  group,
  activePath,
  onNavigate,
}: {
  group: Group;
  activePath: string;
  onNavigate?: () => void;
}) {
  const active = group.items.some(
    (item) =>
      item.path === activePath || activePath.startsWith(`${item.path}/`),
  );
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);
  const Icon = group.icon;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`staff-nav-${group.id}`}
        className={itemClasses(active)}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon aria-hidden className="size-5 shrink-0" />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          id={`staff-nav-${group.id}`}
          className="ml-5 mt-1 space-y-1 border-l border-border pl-3"
        >
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) => itemClasses(isActive, true)}
              >
                <ItemIcon aria-hidden className="size-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function StaffSidebar({
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
      .toUpperCase() || "ST";
  const DashboardIcon = dashboard.icon;
  return (
    <div className="admin-scroll flex h-full flex-col overflow-y-auto bg-white px-4 py-4">
      <div className="border-b border-border px-1 pb-4">
        <BrandIdentity />
      </div>
      <nav aria-label="Staff navigation" className="mt-5 space-y-1">
        <NavLink
          to={dashboard.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => itemClasses(isActive)}
        >
          <DashboardIcon aria-hidden className="size-5 shrink-0" />
          {dashboard.label}
        </NavLink>
        {groups.map((group) => (
          <StaffNavGroup
            key={group.id}
            group={group}
            activePath={activePath}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="mt-auto pt-8">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
          <Avatar size="lg">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              Staff workspace
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

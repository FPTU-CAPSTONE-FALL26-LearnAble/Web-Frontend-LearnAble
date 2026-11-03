import {
  BookOpenText,
  CalendarDays,
  ChevronDown,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { User } from "@/api/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { BrandIdentity } from "@/components/BrandIdentity";
import { DemoDataToggle } from "@/components/DemoDataToggle";
import { Button } from "@/shared/ui/primitives/button";
import { Separator } from "@/shared/ui/primitives/separator";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router";
import { useEffect, useState } from "react";

interface LecturerSidebarProps {
  activePath: string;
  user: User;
  campus?: string;
  semester?: string;
  onSignOut: () => void;
  onUnavailable: (label: string) => void;
  onNavigate?: () => void;
}

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/lecturer/dashboard",
    available: true,
  },
  {
    label: "Learning Materials",
    icon: BookOpenText,
    path: "/lecturer/materials",
    available: true,
  },
  {
    label: "Exam Schedule",
    icon: CalendarDays,
    path: "/lecturer/exams",
    available: true,
  },
];

export function LecturerSidebar({
  activePath,
  user,
  onSignOut,
  onNavigate,
}: LecturerSidebarProps) {
  const questionActive = activePath.startsWith("/lecturer/questions");
  const [questionsOpen, setQuestionsOpen] = useState(questionActive);
  useEffect(() => {
    if (questionActive) setQuestionsOpen(true);
  }, [questionActive]);
  const initials =
    user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "L";
  return (
    <div className="lecturer-scroll flex h-full flex-col overflow-y-auto bg-card px-4 pb-4 pt-4">
      <div>
        <div className="border-b border-slate-100 px-1 pb-4">
          <BrandIdentity />
        </div>
      </div>
      <nav aria-label="Lecturer navigation" className="mt-5 space-y-1">
        {navigation.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const active =
            !!item.path &&
            (item.path === activePath ||
              activePath.startsWith(`${item.path}/`));
          const classes = cn(
            "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
            active
              ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
              : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          );
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/lecturer/dashboard"}
              onClick={onNavigate}
              className={classes}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
        <div>
          <button
            type="button"
            aria-expanded={questionsOpen}
            aria-controls="lecturer-question-navigation"
            onClick={() => setQuestionsOpen((value) => !value)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
              questionActive
                ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <FileQuestion aria-hidden className="size-5 shrink-0" />
            <span className="flex-1">Question Management</span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-200 motion-reduce:transition-none",
                questionsOpen && "rotate-180",
              )}
            />
          </button>
          {questionsOpen ? (
            <div
              id="lecturer-question-navigation"
              className="ml-5 mt-1 space-y-1 border-l border-border pl-3"
            >
              {[
                {
                  label: "Exam Questions",
                  path: "/lecturer/questions/exam",
                  icon: FileQuestion,
                },
                {
                  label: "Practice Questions",
                  path: "/lecturer/questions/practice",
                  icon: GraduationCap,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                        isActive
                          ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
                          : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )
                    }
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ) : null}
        </div>
        {navigation.slice(1).map((item) => {
          const Icon = item.icon;
          const active =
            item.path === activePath || activePath.startsWith(`${item.path}/`);
          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                active
                  ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto pt-8">
        <DemoDataToggle />
        <Separator className="my-4" />
        <div className="flex items-center gap-2 px-1">
          <NavLink
            to="/lecturer/profile"
            onClick={onNavigate}
            aria-label={`Open ${user.fullName}'s profile`}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-lg border px-2 py-2 transition-colors",
                isActive
                  ? "border-sidebar-primary/30 bg-sidebar-accent"
                  : "border-transparent hover:bg-sidebar-accent",
              )
            }
          >
            <Avatar size="lg">
              <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                Information Technology
              </p>
            </div>
          </NavLink>
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

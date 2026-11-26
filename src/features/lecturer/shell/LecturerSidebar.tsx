import {
  BookOpenText,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  FileStack,
  GraduationCap,
  PackageCheck,
  Bell,
  LayoutDashboard,
  LogOut,
  FlaskConical,
  MonitorCog,
} from "lucide-react";
import type { User } from "@/api/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { BrandIdentity } from "@/components/BrandIdentity";
import {
  SidebarCollapseButton,
  SidebarRailButton,
  SidebarRailDivider,
  SidebarRailLink,
} from "@/components/SidebarControls";
import { Button } from "@/shared/ui/primitives/button";
import { Separator } from "@/shared/ui/primitives/separator";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router";
import { useEffect, useState } from "react";
import { getUnreadNotificationCount } from "@/api/notifications";
import { getMaterialTtsAgents, type MaterialTtsBatch } from "@/api/materialTts";
import { getAgentStatus } from "@/features/lecturer/materials/agentStatus";

interface LecturerSidebarProps {
  activePath: string;
  user: User;
  campus?: string;
  semester?: string;
  onSignOut: () => void;
  onUnavailable: (label: string) => void;
  onNavigate?: () => void;
  /** Shows the icon rail instead of the full list. Only the desktop sidebar can be collapsed. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const questionLinks = [
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
];

const examLinks = [
  { label: "Exam Papers", path: "/lecturer/exam-papers", icon: FileStack },
  {
    label: "Sealed Packages",
    path: "/lecturer/sealed-papers",
    icon: PackageCheck,
  },
  { label: "Exam Schedule", path: "/lecturer/exams", icon: CalendarDays },
  { label: "Essay Grading", path: "/lecturer/grading", icon: ClipboardCheck },
  {
    label: "Practice Sessions",
    path: "/lecturer/practice-sessions",
    icon: FlaskConical,
  },
];

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
    label: "Notifications",
    icon: Bell,
    path: "/lecturer/notifications",
    available: true,
  },
];

export function LecturerSidebar({
  activePath,
  user,
  onSignOut,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: LecturerSidebarProps) {
  const questionActive = activePath.startsWith("/lecturer/questions");
  const examActive = examLinks.some(
    ({ path }) => activePath === path || activePath.startsWith(`${path}/`),
  );
  const unreadNotifications = useQuery({
    queryKey: ["my-notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
  const queryClient = useQueryClient();
  const [audioGenerating, setAudioGenerating] = useState(false);
  useEffect(() => {
    const checkActiveJobs = () => {
      const active = queryClient.getQueryCache().findAll({ queryKey: ["material-tts", "batch"] }).some((query) => {
        if (Date.now() - query.state.dataUpdatedAt > 15_000) return false;
        const batch = query.state.data as MaterialTtsBatch | undefined;
        return batch?.jobs?.some((job) => ["claimed", "processing", "running", "uploading"].includes(job.status?.toLowerCase() ?? ""));
      });
      setAudioGenerating(active);
    };
    checkActiveJobs();
    const unsubscribe = queryClient.getQueryCache().subscribe(checkActiveJobs);
    const timer = window.setInterval(checkActiveJobs, 5_000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, [queryClient]);
  const ttsAgents = useQuery({
    queryKey: ["material-tts", "agents"],
    queryFn: getMaterialTtsAgents,
    retry: 1,
    refetchInterval: 30_000,
    meta: { silent: true },
  });
  const agentState = ttsAgents.data ? getAgentStatus(ttsAgents.data) : null;
  const agentStatusLabel = audioGenerating && agentState?.registered.length
    ? "Generating audio"
    : ttsAgents.isPending
    ? "Checking status"
    : ttsAgents.isError
      ? "Status unavailable"
      : agentState?.online
        ? "Online"
        : agentState?.registered.length
          ? "Paired · no recent signal"
          : "Not paired";
  const [questionsOpen, setQuestionsOpen] = useState(questionActive);
  const [examsOpen, setExamsOpen] = useState(examActive);
  useEffect(() => {
    if (questionActive) setQuestionsOpen(true);
  }, [questionActive]);
  useEffect(() => {
    if (examActive) setExamsOpen(true);
  }, [examActive]);
  const initials =
    user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "L";
  const unreadCount = unreadNotifications.data?.unreadCount ?? 0;
  const unreadBadge = unreadCount ? (
    <span
      aria-label={`${unreadCount} unread notifications`}
      className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  ) : null;
  if (collapsed && onToggleCollapsed) {
    const [dashboard, ...others] = navigation;
    return (
      <div className="flex h-full flex-col items-center bg-card px-2 py-3">
        <SidebarCollapseButton collapsed onToggle={onToggleCollapsed} />
        <nav
          aria-label="Lecturer navigation"
          className="lecturer-scroll mt-3 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1 pb-2"
        >
          <SidebarRailLink
            to={dashboard.path}
            label={dashboard.label}
            icon={dashboard.icon}
            end
          />
          <SidebarRailDivider />
          {questionLinks.map(({ label, path, icon }) => (
            <SidebarRailLink key={path} to={path} label={label} icon={icon} />
          ))}
          <SidebarRailDivider />
          {examLinks.map(({ label, path, icon }) => (
            <SidebarRailLink key={path} to={path} label={label} icon={icon} />
          ))}
          <SidebarRailDivider />
          {others.map(({ label, path, icon }) => (
            <SidebarRailLink
              key={path}
              to={path}
              label={label}
              icon={icon}
              badge={path.endsWith("/notifications") ? unreadCount : undefined}
            />
          ))}
        </nav>
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border pt-3">
          <NavLink
            to="/lecturer/materials/new?pair=1"
            aria-label="Pair TTS Device"
            title="Pair TTS Device"
            className="grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <MonitorCog aria-hidden className="size-5" />
          </NavLink>
          <span role="status" aria-label={`TTS device: ${agentStatusLabel}`} title={agentStatusLabel} className={cn("size-2 rounded-full", audioGenerating || agentState?.online ? "bg-success-foreground" : agentState?.registered.length ? "bg-warning-foreground" : "bg-muted-foreground")} />
          <a
            href="/guides/local-tts-lecturer-guide.html"
            aria-label="Local TTS Setup Guide"
            title="Local TTS Setup Guide"
            className="grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CircleHelp aria-hidden className="size-5" />
          </a>
          <NavLink
            to="/lecturer/profile"
            title={`${user.fullName}'s profile`}
            aria-label={`Open ${user.fullName}'s profile`}
            className={({ isActive }) =>
              cn(
                "grid size-11 place-items-center rounded-lg border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "border-sidebar-primary/30 bg-sidebar-accent"
                  : "border-transparent hover:bg-sidebar-accent",
              )
            }
          >
            <Avatar>
              <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </NavLink>
          <SidebarRailButton
            label="Sign out"
            icon={LogOut}
            onClick={onSignOut}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="lecturer-scroll flex h-full flex-col overflow-y-auto bg-card px-3 pb-3 pt-3">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-3">
          <BrandIdentity />
          {onToggleCollapsed ? (
            <SidebarCollapseButton
              collapsed={false}
              onToggle={onToggleCollapsed}
            />
          ) : null}
        </div>
      </div>
      <nav aria-label="Lecturer navigation" className="mt-3 space-y-0.5">
        {navigation.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const active =
            !!item.path &&
            (item.path === activePath ||
              activePath.startsWith(`${item.path}/`));
          const classes = cn(
            "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors",
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
              <span className="min-w-0 flex-1">{item.label}</span>
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
              "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors",
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
              className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2"
            >
              {questionLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
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
        <div>
          <button
            type="button"
            aria-expanded={examsOpen}
            aria-controls="lecturer-exam-navigation"
            onClick={() => setExamsOpen((value) => !value)}
            className={cn(
              "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors",
              examActive
                ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <FileStack aria-hidden className="size-5 shrink-0" />
            <span className="flex-1">Exam operations</span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-200 motion-reduce:transition-none",
                examsOpen && "rotate-180",
              )}
            />
          </button>
          {examsOpen ? (
            <div
              id="lecturer-exam-navigation"
              className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2"
            >
              {examLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
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
                "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors",
                active
                  ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.path.endsWith("/notifications") ? unreadBadge : null}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <NavLink
          to="/lecturer/materials/new?pair=1"
          onClick={onNavigate}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MonitorCog aria-hidden className="size-5 shrink-0" />
          <span className="whitespace-nowrap">Pair TTS Device</span>
        </NavLink>
        <div role="status" aria-label={`TTS device: ${agentStatusLabel}`} className="flex items-center gap-2 px-3 pb-2 pl-10 text-xs font-medium">
          <span aria-hidden className={cn("size-2 shrink-0 rounded-full", audioGenerating || agentState?.online ? "bg-success-foreground" : agentState?.registered.length ? "bg-warning-foreground" : "bg-muted-foreground")} />
          <span className={cn(audioGenerating || agentState?.online ? "text-success-foreground" : agentState?.registered.length ? "text-warning-foreground" : "text-muted-foreground")}>{agentStatusLabel}</span>
        </div>
        <a
          href="/guides/local-tts-lecturer-guide.html"
          onClick={onNavigate}
          aria-label="Local TTS Setup Guide"
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CircleHelp aria-hidden className="size-5 shrink-0" />
          <span className="whitespace-nowrap">Local TTS Guide</span>
        </a>
        <Separator className="mb-3 mt-3" />
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

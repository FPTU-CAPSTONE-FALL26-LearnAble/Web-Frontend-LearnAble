import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Building2,
  GraduationCap,
  Keyboard,
  LibraryBig,
  University,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import {
  getAdminSubjects,
  getAdminUsers,
  getDepartments,
  getLecturerProfiles,
  getMajors,
  getStudentProfiles,
  getUniversities,
} from "@/api/admin";
import { getSystemHealth } from "@/api/adminSystem";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import {
  PageHeading,
  ReadState,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useExpiredAdminSession } from "../api/useAdminData";
import { HealthBadge, formatDateTime } from "../components/SystemSurfaces";

/**
 * System-wide report (FR-27). Since 05/11/2026 the academic records behind
 * these counts are managed by University Staff, so the tiles are read-only
 * totals: no tile links to a Staff screen.
 *
 * There is no aggregate endpoint, so each tile reads `totalCount` from a
 * one-row page of the matching list — one cheap request per resource rather
 * than a fabricated number.
 */
const countQueries = [
  {
    key: "universities",
    label: "Universities",
    icon: University,
    read: () => getUniversities({ PageSize: 1 }),
  },
  {
    key: "users",
    label: "User accounts",
    icon: UserCog,
    read: () => getAdminUsers({ PageSize: 1 }),
  },
  {
    key: "studentProfiles",
    label: "Students",
    icon: UserRound,
    read: () => getStudentProfiles({ PageSize: 1 }),
  },
  {
    key: "lecturerProfiles",
    label: "Lecturers",
    icon: Users,
    read: () => getLecturerProfiles({ PageSize: 1 }),
  },
  {
    key: "departments",
    label: "Departments",
    icon: Building2,
    read: () => getDepartments({ PageSize: 1 }),
  },
  {
    key: "majors",
    label: "Majors",
    icon: GraduationCap,
    read: () => getMajors({ PageSize: 1 }),
  },
  {
    key: "subjects",
    label: "Subjects",
    icon: LibraryBig,
    read: () => getAdminSubjects({ PageSize: 1 }),
  },
] as const;

const adminTools = [
  {
    label: "Universities",
    description: "Add a university and activate or deactivate it.",
    path: "/admin/universities",
    icon: University,
  },
  {
    label: "User accounts",
    description: "Create Staff accounts and manage every other role.",
    path: "/admin/users",
    icon: UserCog,
  },
  {
    label: "System monitoring",
    description: "Service health, response times and current usage.",
    path: "/admin/monitoring",
    icon: Activity,
  },
  {
    label: "Voices and speeds",
    description: "Which reading voices and speeds students can choose.",
    path: "/admin/voice-settings",
    icon: AudioLines,
  },
  {
    label: "Keyboard shortcuts",
    description: "Keys students use to operate the exam app.",
    path: "/admin/exam-shortcuts",
    icon: Keyboard,
  },
] as const;

function CountTile({
  label,
  icon: Icon,
  resource,
  read,
}: {
  label: string;
  icon: typeof Building2;
  resource: string;
  read: () => Promise<{ totalCount: number }>;
}) {
  const query = useQuery({
    queryKey: adminKeys.list(resource, ["count"]),
    queryFn: read,
  });
  useExpiredAdminSession(query.error);
  return (
    <SummaryCard
      label={label}
      value={
        query.isPending
          ? "…"
          : query.error
            ? "Not available"
            : query.data.totalCount
      }
      detail={query.error ? "Could not read this count" : "Total records"}
      icon={<Icon aria-hidden className="size-5" />}
    />
  );
}

function HealthSummary() {
  const health = useQuery({
    queryKey: adminKeys.list("system-health", ["dashboard"]),
    queryFn: getSystemHealth,
  });
  useExpiredAdminSession(health.error);
  return (
    <Card className="admin-panel shadow-none">
      <CardContent className="pt-6">
        <p className="admin-kicker">System status</p>
        {health.isPending || health.error ? (
          <ReadState
            pending={health.isPending}
            error={health.error}
            retry={() => void health.refetch()}
          />
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <HealthBadge status={health.data.status} />
            <p className="text-sm text-muted-foreground">
              {health.data.services.filter((s) => s.status === "Healthy").length}{" "}
              of {health.data.services.length} services healthy · checked{" "}
              {formatDateTime(health.data.checkedAt)}
            </p>
            <Button asChild variant="outline" className="ml-auto">
              <Link to="/admin/monitoring">
                Open monitoring
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardRoute() {
  useRouteAnnouncer("Admin Dashboard · LearnAble", "Administration");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Administration"
        description="System-wide report and configuration for LearnAble."
      >
        <Button asChild>
          <Link to="/admin/universities">
            <University aria-hidden />
            Manage universities
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/monitoring">
            <Activity aria-hidden />
            System monitoring
          </Link>
        </Button>
      </PageHeading>

      <HealthSummary />

      <section aria-labelledby="totals-heading" className="space-y-3">
        <h2 id="totals-heading" className="text-lg font-bold">
          System totals
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {countQueries.map((item) => (
            <CountTile
              key={item.key}
              label={item.label}
              icon={item.icon}
              resource={item.key}
              read={item.read}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="tools-heading" className="space-y-3">
        <h2 id="tools-heading" className="text-lg font-bold">
          Administration tools
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {adminTools.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.path} className="shadow-none">
                <CardContent className="flex min-h-28 items-start gap-4 pt-6">
                  <span className="summary-icon flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={item.path}
                      className="inline-flex min-h-11 items-center font-bold hover:underline"
                    >
                      {item.label}
                      <ArrowRight aria-hidden className="ml-2 size-4" />
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

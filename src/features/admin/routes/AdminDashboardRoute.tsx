import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRight,
  BookMarked,
  Building2,
  CalendarRange,
  GraduationCap,
  Layers,
  LibraryBig,
  ListTree,
  Network,
  ScrollText,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import {
  getAdminSemesters,
  getAdminSubjects,
  getAdminTopics,
  getAdminUsers,
  getCourseSections,
  getCurriculums,
  getDepartments,
  getLecturerProfiles,
  getMajors,
  getSpecializations,
  getStudentProfiles,
  getSyllabi,
} from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Table } from "@/components/ui/table";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useExpiredAdminSession } from "../api/useAdminData";
import { formatDate } from "../components/AdminSurfaces";

/**
 * There is no aggregate endpoint, so each tile reads `totalCount` from a
 * one-row page of the matching list. That is one cheap request per resource
 * rather than a fabricated number.
 */
const countQueries = [
  {
    key: "users",
    label: "User accounts",
    path: "/admin/users",
    icon: UserCog,
    read: () => getAdminUsers({ PageSize: 1 }),
  },
  {
    key: "departments",
    label: "Departments",
    path: "/admin/departments",
    icon: Building2,
    read: () => getDepartments({ PageSize: 1 }),
  },
  {
    key: "majors",
    label: "Majors",
    path: "/admin/majors",
    icon: GraduationCap,
    read: () => getMajors({ PageSize: 1 }),
  },
  {
    key: "specializations",
    label: "Specializations",
    path: "/admin/specializations",
    icon: Network,
    read: () => getSpecializations({ PageSize: 1 }),
  },
  {
    key: "subjects",
    label: "Subjects",
    path: "/admin/subjects",
    icon: LibraryBig,
    read: () => getAdminSubjects({ PageSize: 1 }),
  },
  {
    key: "syllabi",
    label: "Syllabi",
    path: "/admin/syllabi",
    icon: BookMarked,
    read: () => getSyllabi({ PageSize: 1 }),
  },
  {
    key: "topics",
    label: "Topics",
    path: "/admin/topics",
    icon: ListTree,
    read: () => getAdminTopics({ PageSize: 1 }),
  },
  {
    key: "courseSections",
    label: "Course sections",
    path: "/admin/course-sections",
    icon: Layers,
    read: () => getCourseSections({ PageSize: 1 }),
  },
  {
    key: "curriculums",
    label: "Curriculums",
    path: "/admin/curriculums",
    icon: ScrollText,
    read: () => getCurriculums({ PageSize: 1 }),
  },
  {
    key: "studentProfiles",
    label: "Student profiles",
    path: "/admin/student-profiles",
    icon: UserRound,
    read: () => getStudentProfiles({ PageSize: 1 }),
  },
  {
    key: "lecturerProfiles",
    label: "Lecturer profiles",
    path: "/admin/lecturer-profiles",
    icon: Users,
    read: () => getLecturerProfiles({ PageSize: 1 }),
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

const semesterTone = (status: string) =>
  status === "Ongoing"
    ? ("success" as const)
    : status === "Planned"
      ? ("info" as const)
      : ("neutral" as const);

export function AdminDashboardRoute() {
  useRouteAnnouncer("Admin Dashboard · LearnAble", "Administration");
  const semesters = useQuery({
    queryKey: adminKeys.list("semesters", ["dashboard"]),
    queryFn: () => getAdminSemesters({ PageSize: 5, SortBy: "-startDate" }),
  });
  useExpiredAdminSession(semesters.error);
  const semesterRows = semesters.data?.items ?? [];
  const ongoing = semesterRows.find((row) => row.status === "Ongoing");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Administration"
        description="Academic structure, terms and accounts for LearnAble at FPT University."
      >
        <Button asChild>
          <Link to="/admin/users">
            <UserCog aria-hidden />
            Manage accounts
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/semesters">
            <CalendarRange aria-hidden />
            Manage semesters
          </Link>
        </Button>
      </PageHeading>

      <Card className="admin-panel shadow-none">
        <CardContent className="pt-6">
          <p className="admin-kicker">Current term</p>
          {semesters.isPending ? (
            <p role="status" className="mt-3 text-muted-foreground">
              Loading the current term…
            </p>
          ) : semesters.error ? (
            <ReadState
              pending={false}
              error={semesters.error}
              retry={() => void semesters.refetch()}
            />
          ) : ongoing ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-xl font-extrabold">{ongoing.semesterName}</p>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {ongoing.semesterCode} · {ongoing.academicYear} ·{" "}
                  {formatDate(ongoing.startDate)} →{" "}
                  {formatDate(ongoing.endDate)}
                </p>
              </div>
              <StatusBadge value="Ongoing" tone="success" />
            </div>
          ) : (
            <div className="mt-3">
              <p className="font-bold">No semester is currently Ongoing.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a planned semester to open course sections and exam
                scheduling.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/admin/semesters">
                  Go to semesters
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section
        aria-label="Record counts"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {countQueries.map((item) => (
          <CountTile
            key={item.key}
            label={item.label}
            icon={item.icon}
            resource={item.key}
            read={item.read}
          />
        ))}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
          <h2 className="text-lg font-bold">Most recent semesters</h2>
          <Button asChild variant="ghost">
            <Link to="/admin/semesters">
              Open semesters
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <ReadState
          pending={semesters.isPending}
          error={semesters.error}
          retry={() => void semesters.refetch()}
        />
        {!semesters.isPending && !semesters.error && (
          <Table containerLabel="Recent semesters table">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Academic year</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesterRows.map((row) => (
                <TableRow key={row.semesterId}>
                  <TableCell className="font-bold">
                    {row.semesterCode}
                  </TableCell>
                  <TableCell className="whitespace-normal font-bold">
                    {row.semesterName}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.academicYear}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(row.startDate)} → {formatDate(row.endDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      value={row.status}
                      tone={semesterTone(row.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!semesterRows.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <p className="font-bold">No semesters recorded yet.</p>
                    <p className="mt-2 text-muted-foreground">
                      Create the first academic term to begin.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <section
        aria-label="Administration shortcuts"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {countQueries.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="shadow-none">
              <CardContent className="flex min-h-24 items-center gap-4 pt-6">
                <span
                  className="summary-icon flex size-11 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "var(--color-info-bg)",
                    color: "var(--color-info-text)",
                  }}
                >
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

    </div>
  );
}

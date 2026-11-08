import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  DoorOpen,
  GraduationCap,
  LibraryBig,
  Settings2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import {
  getAdminSubjects,
  getAdminUsers,
  getCurriculums,
  getDepartments,
  getExamRooms,
  getLecturerProfiles,
  getMajors,
  getStudentProfiles,
} from "@/api/admin";
import { describeError } from "@/app/providers";
import { PageHeading, ReadState } from "@/components/workbench/Workbench";
import {
  adminKeys,
  useUniversityScope,
} from "@/features/admin/api/useAdminData";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Progress } from "@/shared/ui/primitives/progress";

export function StaffDashboardRoute() {
  useRouteAnnouncer("Staff Dashboard · LearnAble", "Staff Dashboard");
  const scope = useUniversityScope();
  const resources = [
    {
      key: "users",
      label: "User accounts",
      description: "Create and maintain university sign-in accounts.",
      path: "/staff/users",
      icon: Users,
      query: () =>
        getAdminUsers({
          PageSize: 1,
          UniversityId: scope.universityId || undefined,
        }),
    },
    {
      key: "studentProfiles",
      label: "Student records",
      description: "Review academic enrollment and student profiles.",
      path: "/staff/student-profiles",
      icon: GraduationCap,
      query: () => getStudentProfiles({ PageSize: 1 }),
    },
    {
      key: "lecturerProfiles",
      label: "Lecturer records",
      description: "Maintain lecturer profiles and departments.",
      path: "/staff/lecturer-profiles",
      icon: UserRoundCheck,
      query: () => getLecturerProfiles({ PageSize: 1 }),
    },
    {
      key: "departments",
      label: "Departments",
      description: "Organize the university’s academic departments.",
      path: "/staff/departments",
      icon: Building2,
      query: () =>
        getDepartments({
          PageSize: 1,
          UniversityId: scope.universityId || undefined,
        }),
    },
    {
      key: "majors",
      label: "Majors",
      description: "Connect majors to their owning departments.",
      path: "/staff/majors",
      icon: GraduationCap,
      query: () => getMajors({ PageSize: 1 }),
    },
    {
      key: "subjects",
      label: "Subjects",
      description: "Maintain the subjects available for teaching.",
      path: "/staff/subjects",
      icon: LibraryBig,
      query: () =>
        getAdminSubjects({
          PageSize: 1,
          UniversityId: scope.universityId || undefined,
        }),
    },
    {
      key: "curriculums",
      label: "Curriculums",
      description: "Manage curriculum versions and effective dates.",
      path: "/staff/curriculums",
      icon: BookOpenCheck,
      query: () => getCurriculums({ PageSize: 1 }),
    },
    {
      key: "examRooms",
      label: "Exam rooms",
      description: "Configure rooms and the seats available for exams.",
      path: "/staff/exam-rooms",
      icon: DoorOpen,
      query: () => getExamRooms({ PageSize: 1 }),
    },
  ] as const;
  const queries = useQueries({
    queries: resources.map((resource) => ({
      queryKey: adminKeys.list(resource.key, ["dashboard"]),
      queryFn: resource.query,
    })),
  });
  const pending = queries.some((query) => query.isPending);
  const failedResources = resources.filter(
    (_, index) => queries[index].isError,
  );
  const count = (index: number) =>
    queries[index].isError ? null : (queries[index].data?.totalCount ?? null);
  const overview = [
    {
      label: "University accounts",
      value: count(0),
      detail: `${count(1) ?? "—"} students · ${count(2) ?? "—"} lecturers`,
      icon: Users,
    },
    {
      label: "Organisation",
      value: count(3),
      detail: `${count(4) ?? "—"} majors across all departments`,
      icon: Building2,
    },
    {
      label: "Academic catalog",
      value: count(5),
      detail: `${count(6) ?? "—"} curriculum versions`,
      icon: LibraryBig,
    },
    {
      label: "Exam facilities",
      value: count(7),
      detail: "Rooms available for exam scheduling",
      icon: DoorOpen,
    },
  ];
  const readiness = [
    {
      label: "People records",
      detail: "Student and lecturer profiles are available.",
      indexes: [1, 2],
    },
    {
      label: "Organisation structure",
      detail: "Departments and majors are ready.",
      indexes: [3, 4],
    },
    {
      label: "Academic catalog",
      detail: "Subjects and curriculums are ready.",
      indexes: [5, 6],
    },
    {
      label: "Exam facilities",
      detail: "At least one exam room is available.",
      indexes: [7],
    },
  ].map((item) => ({
    ...item,
    unavailable: item.indexes.some((index) => queries[index].isError),
    ready: item.indexes.every((index) => (count(index) ?? 0) > 0),
  }));
  const readyCount = readiness.filter(
    (item) => item.ready && !item.unavailable,
  ).length;

  return (
    <div className="space-y-7">
      <PageHeading title="Academic Operations">
        <Button asChild variant="outline">
          <Link to="/staff/users">Manage accounts</Link>
        </Button>
        <Button asChild>
          <Link to="/staff/exam-rooms">Manage exam rooms</Link>
        </Button>
      </PageHeading>
      <ReadState pending={pending} error={null} retry={() => undefined} />
      {failedResources.length ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning p-4 text-sm text-warning-foreground"
        >
          <div>
            <p className="font-semibold">
              We couldn’t load some information right now. You can continue
              using the available tools.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {resources.map((resource, index) =>
                queries[index].isError ? (
                  <li key={resource.key}>
                    {resource.label}: {describeError(queries[index].error)}
                  </li>
                ) : null,
              )}
            </ul>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              queries.forEach((query) => {
                if (query.isError) void query.refetch();
              })
            }
          >
            Try again
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="operations-overview-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="operations-overview-heading" className="text-lg font-bold">
              Operations overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A live snapshot of the university workspace.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {failedResources.length
              ? `${failedResources.length} area needs attention`
              : "All areas are available"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} size="sm">
                <CardHeader>
                  <CardTitle>{item.label}</CardTitle>
                  <CardAction>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Icon aria-hidden className="size-5" />
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold tabular-nums">
                    {item.value ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section
          aria-labelledby="staff-workspaces-heading"
          className="rounded-2xl border border-border p-5 sm:p-6"
        >
          <h2 id="staff-workspaces-heading" className="text-lg font-bold">
            Staff workspaces
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an area to review details or make changes.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <Link
                  key={resource.path}
                  to={resource.path}
                  className="group flex min-h-28 items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-bold">
                      {resource.label}
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                      />
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {resource.description}
                    </span>
                  </span>
                </Link>
              );
            })}
            <Link
              to="/staff/default-policy"
              className="group flex min-h-28 items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                <Settings2 aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-bold">
                  Default Exam Policy
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                  />
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                  Review the university’s default exam and accessibility
                  settings.
                </span>
              </span>
            </Link>
          </div>
        </section>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Setup readiness</CardTitle>
              <CardDescription>
                {readyCount} of {readiness.length} areas ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress
                value={(readyCount / readiness.length) * 100}
                aria-label={`${readyCount} of ${readiness.length} setup areas ready`}
              />
              <ul className="space-y-4">
                {readiness.map((item) => {
                  const ready = item.ready && !item.unavailable;
                  return (
                    <li key={item.label} className="flex items-start gap-3">
                      {ready ? (
                        <CheckCircle2
                          aria-hidden
                          className="mt-0.5 size-5 shrink-0 text-success"
                        />
                      ) : (
                        <CircleAlert
                          aria-hidden
                          className="mt-0.5 size-5 shrink-0 text-warning-foreground"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.unavailable
                            ? "Information is temporarily unavailable."
                            : ready
                              ? item.detail
                              : "Add the required information to complete this area."}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <section
            aria-labelledby="academic-path-heading"
            className="rounded-2xl border border-border p-5"
          >
            <h2 id="academic-path-heading" className="text-lg font-bold">
              Academic setup path
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create information in this order to keep relationships complete.
            </p>
            <ol className="mt-5 space-y-3">
              {["Department", "Major", "Subject", "Curriculum"].map(
                (label, index) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{label}</span>
                  </li>
                ),
              )}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

import { useQueries } from "@tanstack/react-query";
import { BookOpenCheck, Building2, DoorOpen, GraduationCap, LibraryBig, UserRoundCheck, Users } from "lucide-react";
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
import { PageHeading, ReadState, SummaryCard } from "@/components/workbench/Workbench";
import { Button } from "@/shared/ui/primitives/button";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useUniversityScope } from "@/features/admin/api/useAdminData";
import { describeError } from "@/app/providers";

export function StaffDashboardRoute() {
  useRouteAnnouncer("Staff Dashboard · LearnAble", "Staff Dashboard");
  const scope = useUniversityScope();
  const resources = [
    { key: "users", label: "User accounts", path: "/staff/users", icon: Users, query: () => getAdminUsers({ PageSize: 1, UniversityId: scope.universityId || undefined }) },
    { key: "studentProfiles", label: "Student records", path: "/staff/student-profiles", icon: GraduationCap, query: () => getStudentProfiles({ PageSize: 1 }) },
    { key: "lecturerProfiles", label: "Lecturer records", path: "/staff/lecturer-profiles", icon: UserRoundCheck, query: () => getLecturerProfiles({ PageSize: 1 }) },
    { key: "departments", label: "Departments", path: "/staff/departments", icon: Building2, query: () => getDepartments({ PageSize: 1, UniversityId: scope.universityId || undefined }) },
    { key: "majors", label: "Majors", path: "/staff/majors", icon: GraduationCap, query: () => getMajors({ PageSize: 1 }) },
    { key: "subjects", label: "Subjects", path: "/staff/subjects", icon: LibraryBig, query: () => getAdminSubjects({ PageSize: 1, UniversityId: scope.universityId || undefined }) },
    { key: "curriculums", label: "Curriculums", path: "/staff/curriculums", icon: BookOpenCheck, query: () => getCurriculums({ PageSize: 1 }) },
    { key: "examRooms", label: "Exam rooms", path: "/staff/exam-rooms", icon: DoorOpen, query: () => getExamRooms({ PageSize: 1 }) },
  ] as const;
  const queries = useQueries({
    queries: resources.map((resource) => ({
      queryKey: adminKeys.list(resource.key, ["dashboard"]),
      queryFn: resource.query,
    })),
  });
  const pending = queries.some((query) => query.isPending);
  const failedResources = resources.filter((_, index) => queries[index].isError);
  return (
    <div className="space-y-6">
      <PageHeading
        title="Academic Operations"
        description="Manage the university structure, operational accounts, curricula and exam facilities from Backend data."
      />
      <ReadState pending={pending} error={null} retry={() => undefined} />
      {failedResources.length ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning p-4 text-sm text-warning-foreground">
          <div>
            <p className="font-semibold">Some Staff data is temporarily unavailable. The other tools remain available.</p>
            <ul className="mt-1 list-disc pl-5">
              {resources.map((resource, index) => queries[index].isError ? (
                <li key={resource.key}>{resource.label}: {describeError(queries[index].error)}</li>
              ) : null)}
            </ul>
          </div>
          <Button variant="outline" onClick={() => queries.forEach((query) => { if (query.isError) void query.refetch(); })}>
            Try unavailable data again
          </Button>
        </div>
      ) : null}
      <section aria-label="Staff workspace summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {resources.map((resource, index) => {
          const Icon = resource.icon;
          return (
            <SummaryCard
              key={resource.key}
              label={resource.label}
              value={queries[index].isError ? "Unavailable" : (queries[index].data?.totalCount ?? "—")}
              detail={queries[index].isError ? "This source could not be loaded" : "Current Backend records"}
              icon={<Icon aria-hidden className="size-5" />}
              compact
            />
          );
        })}
      </section>
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-lg font-bold">Staff tools</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Choose a workspace. Changes are saved directly through the Staff-compatible Backend endpoints.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {resources.map((resource) => (
            <Button key={resource.path} asChild variant="outline">
              <Link to={resource.path}>{resource.label}</Link>
            </Button>
          ))}
          <Button asChild variant="outline">
            <Link to="/staff/default-policy">Default Exam Policy</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

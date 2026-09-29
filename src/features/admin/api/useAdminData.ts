import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ApiFailure } from "@/api/client";
import {
  getAdminSemesters,
  getAdminSubjects,
  getAdminUsers,
  getCurriculums,
  getDepartments,
  getMajors,
  getSpecializations,
  getSyllabi,
  type AdminSemester,
  type AdminSubject,
  type AdminUser,
  type Curriculum,
  type Department,
  type Major,
  type Specialization,
  type Syllabus,
  type UserRole,
} from "@/api/admin";
import { describeError } from "@/app/providers";
import { useAuthStore } from "@/features/auth/store/authStore";
import { toast } from "@/shared/ui/primitives/toast";

/** Query keys are namespaced so one write invalidates exactly its resource. */
export const adminKeys = {
  all: ["admin"] as const,
  list: (resource: string, deps: unknown[] = []) =>
    ["admin", resource, ...deps] as const,
  resource: (resource: string) => ["admin", resource] as const,
};

export function useExpiredAdminSession(error: unknown) {
  const logout = useAuthStore((state) => state.logout);
  useEffect(() => {
    if (error instanceof ApiFailure && error.detail.kind === "unauthorized") {
      logout();
      window.location.assign("/login");
    }
  }, [error, logout]);
}

/**
 * Every admin write is a real backend call. On success the affected resource is
 * refetched so the table shows server truth rather than an optimistic guess; on
 * failure the typed API error is reported and nothing is invalidated.
 */
export function useAdminWrite<TVariables = void>({
  resource,
  action,
  mutationFn,
  onSuccess,
  alsoInvalidate = [],
}: {
  resource: string;
  action: string;
  mutationFn: (variables: TVariables) => Promise<void>;
  onSuccess?: () => void;
  alsoInvalidate?: string[];
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const name of [resource, ...alsoInvalidate]) {
        void queryClient.invalidateQueries({
          queryKey: adminKeys.resource(name),
        });
      }
      toast({ title: `${action} succeeded` });
      onSuccess?.();
    },
    onError: (error: unknown) =>
      toast({
        title: `${action} failed`,
        description: `${describeError(error)} No change has been saved.`,
        variant: "error",
      }),
  });
}

/**
 * Reference lists used by the admin forms as foreign keys. They are read at a
 * large page size because the selects need the whole set, not one page.
 */
export function useDepartmentOptions(enabled = true) {
  const query = useQuery({
    queryKey: adminKeys.list("departments", ["options"]),
    queryFn: () => getDepartments({ PageSize: 200 }),
    enabled,
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useMajorOptions(enabled = true) {
  const query = useQuery({
    queryKey: adminKeys.list("majors", ["options"]),
    queryFn: () => getMajors({ PageSize: 200 }),
    enabled,
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useSpecializationOptions(majorId?: string) {
  const query = useQuery({
    queryKey: adminKeys.list("specializations", ["options", majorId ?? "all"]),
    queryFn: () =>
      getSpecializations({ PageSize: 200, MajorId: majorId || undefined }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useCurriculumOptions(majorId?: string) {
  const query = useQuery({
    queryKey: adminKeys.list("curriculums", ["options", majorId ?? "all"]),
    queryFn: () =>
      getCurriculums({ PageSize: 200, MajorId: majorId || undefined }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useSubjectOptions() {
  const query = useQuery({
    queryKey: adminKeys.list("subjects", ["options"]),
    queryFn: () => getAdminSubjects({ PageSize: 200 }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useSemesterOptions() {
  const query = useQuery({
    queryKey: adminKeys.list("semesters", ["options"]),
    queryFn: () => getAdminSemesters({ PageSize: 200 }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

export function useSyllabusOptions(subjectId?: string) {
  const query = useQuery({
    queryKey: adminKeys.list("syllabi", ["options", subjectId ?? "all"]),
    queryFn: () =>
      getSyllabi({ PageSize: 200, SubjectId: subjectId || undefined }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

/**
 * Accounts eligible for a profile. Filtered by role so a student profile cannot
 * be attached to a lecturer account by accident.
 */
export function useUserOptions(role?: UserRole) {
  const query = useQuery({
    queryKey: adminKeys.list("users", ["options", role ?? "all"]),
    queryFn: () => getAdminUsers({ PageSize: 200, Role: role }),
  });
  useExpiredAdminSession(query.error);
  return query;
}

/** Label helpers keep foreign keys readable in dense tables. */
export const userLabel = (rows: AdminUser[], id?: string | null) => {
  const row = rows.find((item) => item.userId === id);
  return row ? `${row.userCode} · ${row.fullName}` : null;
};
export const departmentLabel = (rows: Department[], id?: string | null) => {
  const row = rows.find((item) => item.departmentId === id);
  return row ? `${row.departmentCode} · ${row.departmentName}` : null;
};
export const majorLabel = (rows: Major[], id?: string | null) => {
  const row = rows.find((item) => item.majorId === id);
  return row ? `${row.majorCode} · ${row.majorName}` : null;
};
export const specializationLabel = (
  rows: Specialization[],
  id?: string | null,
) => {
  const row = rows.find((item) => item.specializationId === id);
  return row ? `${row.specializationCode} · ${row.specializationName}` : null;
};
export const curriculumLabel = (rows: Curriculum[], id?: string | null) => {
  const row = rows.find((item) => item.curriculumId === id);
  return row ? `${row.curriculumCode} · ${row.version}` : null;
};
export const subjectLabel = (rows: AdminSubject[], id?: string | null) => {
  const row = rows.find((item) => item.subjectId === id);
  return row ? `${row.subjectCode} · ${row.subjectNameEn}` : null;
};
export const semesterLabel = (rows: AdminSemester[], id?: string | null) => {
  const row = rows.find((item) => item.semesterId === id);
  return row ? `${row.semesterCode} · ${row.semesterName}` : null;
};
export const syllabusLabel = (rows: Syllabus[], id?: string | null) => {
  const row = rows.find((item) => item.syllabusId === id);
  return row ? `${row.syllabusCode} · ${row.version}` : null;
};

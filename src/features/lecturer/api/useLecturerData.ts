import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiFailure } from "@/api/client";
import { getSubjects, getTopics } from "@/api/lecturer";
import { useAuthStore } from "@/features/auth/store/authStore";

export function useExpiredSession(error: unknown) {
  const logout = useAuthStore((state) => state.logout);
  useEffect(() => {
    if (error instanceof ApiFailure && error.detail.kind === "unauthorized") {
      logout();
      window.location.assign("/login");
    }
  }, [error, logout]);
}
export function useAcademicOptions(subjectId?: string) {
  const subjects = useQuery({
    queryKey: ["lecturer", "subjects"],
    queryFn: () => getSubjects(),
  });
  const topics = useQuery({
    queryKey: ["lecturer", "topics", subjectId],
    queryFn: () => getTopics({ SubjectId: subjectId || undefined }),
  });
  useExpiredSession(subjects.error || topics.error);
  return { subjects, topics };
}

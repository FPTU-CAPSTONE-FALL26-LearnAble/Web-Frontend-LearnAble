import { useQuery } from "@tanstack/react-query";
import { getSubjects, getTopics } from "@/api/lecturer";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
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

import { useQuery } from "@tanstack/react-query";
import { getSubjects } from "@/api/catalog";
import { getMyCurriculumSubjectIds } from "@/api/learningAssistant";
import type { AssistantCourse } from "@/features/assistant/ui";

/**
 * The courses a student can open a conversation for: the subjects of their own
 * curriculum. The Backend calls the assistant's `courseId` a subject and
 * refuses one outside the curriculum ("Subject is not available in your
 * curriculum."), so a subject id is sent as the course id.
 *
 * There is no single "my subjects" endpoint: the curriculum's subject ids come
 * from the student's profile (`getMyCurriculumSubjectIds`), their names from
 * the subject catalogue (`GET /Subjects`). A student with no curriculum gets
 * an empty list rather than subjects the assistant would refuse.
 */
export function useAssistantCourses(enabled = true) {
  return useQuery({
    queryKey: ["assistant", "courses"],
    enabled,
    // The page explains a failure itself.
    meta: { silent: true },
    queryFn: async (): Promise<AssistantCourse[]> => {
      const [allowed, catalogue] = await Promise.all([
        getMyCurriculumSubjectIds(),
        getSubjects(),
      ]);
      const inCurriculum = new Set(allowed ?? []);
      return catalogue.items
        .filter((subject) => inCurriculum.has(subject.subjectId))
        .map((subject) => ({
          courseId: subject.subjectId,
          name: [subject.subjectCode, subject.subjectNameEn].filter(Boolean).join(" — "),
        }));
    },
  });
}

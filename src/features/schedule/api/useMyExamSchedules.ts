import { useQuery } from "@tanstack/react-query";
import { getMyExamSchedules } from "@/api/exams";

/** GET /me/exam-schedules — the signed-in student's exams with their seat (FFCB-106). */
export function useMyExamSchedules() {
  return useQuery({
    queryKey: ["my-exam-schedules"],
    queryFn: async () => (await getMyExamSchedules()).items,
  });
}

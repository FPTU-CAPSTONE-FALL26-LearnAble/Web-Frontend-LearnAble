import { useQueries, useQuery } from "@tanstack/react-query";
import type { MyExamSchedule } from "@/api/exams";
import { getMyExamResult, type ExamResult } from "@/api/results";
import { useMyExamSchedules } from "@/features/schedule/api/useMyExamSchedules";
import { groupSchedules } from "@/features/schedule/scheduleView";

const resultQuery = (scheduleId: string) => ({
  queryKey: ["exam-results", scheduleId],
  queryFn: () => getMyExamResult(scheduleId),
});

export type ExamResultRow = {
  exam: MyExamSchedule;
  /** `undefined` while loading, `null` when not released yet. */
  result: ExamResult | null | undefined;
  isError: boolean;
};

/**
 * The student's finished exams with the result of each. The Backend has no
 * result list, so each finished schedule is asked for its own result.
 */
export function useExamResults() {
  const schedules = useMyExamSchedules();
  const finished = schedules.data
    ? groupSchedules(schedules.data).past.filter((item) => item.schedule.status !== "Cancelled")
    : [];
  const results = useQueries({
    queries: finished.map((item) => resultQuery(item.schedule.examScheduleId)),
  });
  const rows: ExamResultRow[] = finished.map((exam, index) => ({
    exam,
    result: results[index]?.data,
    isError: !!results[index]?.isError,
  }));
  return { schedules, rows };
}

export function useExamResult(scheduleId: string) {
  return useQuery(resultQuery(scheduleId));
}

import { useQuery } from "@tanstack/react-query";
import { getExamResult, listExamResults } from "@/api/results";

export function useExamResults() {
  return useQuery({ queryKey: ["exam-results"], queryFn: listExamResults });
}

export function useExamResult(sessionId: string) {
  return useQuery({
    queryKey: ["exam-results", sessionId],
    queryFn: () => getExamResult(sessionId),
  });
}

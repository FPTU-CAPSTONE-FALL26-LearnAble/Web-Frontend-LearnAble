import { useQuery } from "@tanstack/react-query";
import { getPracticeProgress } from "@/api/progress";

export function usePracticeProgress() {
  return useQuery({ queryKey: ["practice-progress"], queryFn: getPracticeProgress });
}

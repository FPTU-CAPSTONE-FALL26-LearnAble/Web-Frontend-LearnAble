import { useQuery } from "@tanstack/react-query";
import { getPracticeSet, listPracticeSets } from "@/api/practice";

export function usePracticeSets() {
  return useQuery({ queryKey: ["practice-sets"], queryFn: listPracticeSets });
}

export function usePracticeSet(setId: string) {
  return useQuery({
    queryKey: ["practice-sets", setId],
    queryFn: () => getPracticeSet(setId),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAccessibilityProfile,
  updateAccessibilityProfile,
  type AccessibilityProfile,
} from "@/api/accessibility";

const QUERY_KEY = ["accessibility-profile"];

export function useAccessibilityProfile() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getAccessibilityProfile });
}

export function useUpdateAccessibilityProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: AccessibilityProfile) => updateAccessibilityProfile(profile),
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}

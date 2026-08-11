import { useMutation } from "@tanstack/react-query";
import { askAssistant } from "@/api/assistant";

export function useAskAssistant() {
  return useMutation({ mutationFn: askAssistant });
}

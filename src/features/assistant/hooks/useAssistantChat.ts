import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiFailure } from "@/api/client";
import {
  askAssistant,
  getAssistantMessages,
  type AssistantMessage,
} from "@/api/learningAssistant";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";

const t = vi.assistant;

export type AskOutcome =
  | { status: "answered"; answer: AssistantMessage }
  | { status: "stopped" }
  | { status: "failed" };

export const messagesKey = (conversationId: string | null) => [
  "assistant",
  "messages",
  conversationId,
];

/** The messages of one conversation, and asking the next question in it. */
export function useAssistantChat(conversationId: string | null) {
  const client = useQueryClient();
  const messages = useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => getAssistantMessages(conversationId!),
    enabled: !!conversationId,
    meta: { silent: true },
  });
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ question: string; message: string } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abort.current?.abort();
  }, []);

  const ask = useCallback(
    async (
      question: string,
      /** Starts the conversation when the first question is asked before one exists. */
      ensureConversation?: () => Promise<string>,
    ): Promise<AskOutcome> => {
      if ((!conversationId && !ensureConversation) || abort.current) return { status: "failed" };
      const controller = new AbortController();
      abort.current = controller;
      setFailure(null);
      setPendingQuestion(question);
      // The Backend answers only once it has validated the citations: say that it is working.
      announce(t.searching);
      try {
        const id = conversationId ?? (await ensureConversation!());
        if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
        const answer = await askAssistant(id, question, controller.signal);
        const asked: AssistantMessage = {
          messageId: `local-${answer.messageId}`,
          role: "user",
          text: question,
          sources: [],
          limitations: [],
          evidenceStatus: null,
          createdAt: null,
        };
        // A history load still in flight was started before this answer existed; it must not overwrite it.
        await client.cancelQueries({ queryKey: messagesKey(id) });
        client.setQueryData<AssistantMessage[]>(messagesKey(id), (current) => [
          ...(current ?? []),
          asked,
          answer,
        ]);
        void client.invalidateQueries({ queryKey: ["assistant", "conversations"] });
        return { status: "answered", answer };
      } catch (error) {
        if (controller.signal.aborted) {
          announce(t.stopped);
          return { status: "stopped" };
        }
        // An out-of-scope question is refused with the Backend's own words; show those.
        const message = (error instanceof ApiFailure && error.serverMessage) || t.askError;
        setFailure({ question, message });
        announce(message, { assertive: true });
        return { status: "failed" };
      } finally {
        abort.current = null;
        setPendingQuestion(null);
      }
    },
    [client, conversationId],
  );

  return {
    messages,
    pendingQuestion,
    failure,
    clearFailure: useCallback(() => setFailure(null), []),
    ask,
    stop,
  };
}

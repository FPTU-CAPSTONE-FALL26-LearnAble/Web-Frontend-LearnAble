import { forwardRef } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import type { AssistantConversation } from "@/api/learningAssistant";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import {
  TARGET,
  conversationTitle,
  formatActivity,
  type AssistantCourse,
} from "@/features/assistant/ui";
import { ASSISTANT_SHORTCUTS } from "@/features/assistant/hooks/useAssistantShortcuts";

const t = vi.assistant;

type Props = {
  conversations: AssistantConversation[] | undefined;
  courses: AssistantCourse[];
  /** The course whose conversations are listed; the Backend lists one course at a time. */
  courseId: string | null;
  isPending: boolean;
  isError: boolean;
  /** The Backend's own explanation of a failed load, when it sent one. */
  errorDetail?: string | null;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onDelete: (conversation: AssistantConversation) => void;
};

/** History sidebar: start a conversation, reopen one, or delete one. */
export const ConversationHistory = forwardRef<HTMLButtonElement, Props>(
  function ConversationHistory(
    {
      conversations,
      courses,
      courseId,
      isPending, isError, errorDetail,
      onRetry,
      selectedId,
      onSelect,
      onNew,
      onDelete,
    },
    newButtonRef,
  ) {
    return (
      <nav aria-label={t.historyLabel} className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t.historyTitle}</h2>
        <Button
          ref={newButtonRef}
          className={TARGET}
          onClick={onNew}
          aria-keyshortcuts="Control+Shift+E"
        >
          <MessageSquarePlus aria-hidden />
          {t.newConversation}
          <kbd className="sr-only">{ASSISTANT_SHORTCUTS.newConversation}</kbd>
        </Button>

        {courseId && isPending ? <p role="status">{t.historyLoading}</p> : null}

        {isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border-2 border-destructive p-4">
            <p className="font-semibold text-destructive">{t.historyError}</p>
            {errorDetail ? <p>{errorDetail}</p> : null}
            <Button variant="secondary" className={TARGET} onClick={onRetry}>
              {vi.common.retry}
            </Button>
          </div>
        ) : null}

        {!courseId ? <p className="text-muted-foreground">{t.historyChooseCourse}</p> : null}

        {conversations && conversations.length === 0 ? (
          <div className="rounded-xl border border-border p-4">
            <p className="font-semibold">{t.historyEmpty}</p>
            <p className="mt-1 text-muted-foreground">{t.historyEmptyHint}</p>
          </div>
        ) : null}

        {conversations && conversations.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {conversations.map((conversation) => {
              const title = conversationTitle(conversation, courses);
              const selected = conversation.conversationId === selectedId;
              return (
                <li
                  key={conversation.conversationId}
                  className={cn(
                    "flex items-stretch gap-1 rounded-xl border",
                    selected ? "border-2 border-foreground bg-accent" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    aria-label={t.openConversation(title)}
                    onClick={() => onSelect(conversation.conversationId)}
                    className="min-h-11 min-w-0 flex-1 rounded-xl px-3 py-2 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="block font-semibold break-words">{title}</span>
                    {selected ? (
                      <span className="block text-sm font-semibold">{t.current}</span>
                    ) : null}
                    {conversation.updatedAt ? (
                      <span className="block text-sm text-muted-foreground">
                        {t.lastActive(formatActivity(conversation.updatedAt))}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    variant="ghost"
                    className={cn(TARGET, "self-center")}
                    aria-label={t.deleteConversationFor(title)}
                    onClick={() => onDelete(conversation)}
                  >
                    <Trash2 aria-hidden />
                    {t.deleteConversation}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </nav>
    );
  },
);

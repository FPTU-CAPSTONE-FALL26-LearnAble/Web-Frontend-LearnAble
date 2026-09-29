import { useRef, useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card } from "@/shared/ui/primitives/card";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { announce } from "@/shared/a11y/announcer";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import { useAskAssistant } from "@/features/assistant/api/useAskAssistant";
import type { AssistantReply } from "@/api/assistant";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
}

/** SCR-05 — FR-08, FR-32 (RULE-14: hiển thị nguồn, đánh dấu câu trả lời không nguồn) */
export function AssistantRoute() {
  useRouteAnnouncer(vi.assistant.pageTitle, vi.assistant.title);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const askMutation = useAskAssistant();
  const nextId = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || askMutation.isPending) return;

    setMessages((m) => [...m, { id: nextId.current++, role: "user", text: question }]);
    setInput("");

    askMutation.mutate(
      { question },
      {
        onSuccess: (reply) => {
          setMessages((m) => [
            ...m,
            { id: nextId.current++, role: "assistant", text: reply.answer, reply },
          ]);
          // Chat log không đặt aria-live (tránh đọc chồng) — announce là kênh duy nhất.
          announce(reply.answer);
          inputRef.current?.focus();
        },
        onError: () => {
          announce(vi.assistant.errFailed, { assertive: true });
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
        {vi.assistant.title}
      </h1>

      <ul aria-label={vi.assistant.chatLogLabel} className="flex flex-col gap-4">
        {messages.map((msg) => (
          <li key={msg.id}>
            <Card
              className={cn(
                msg.role === "user" &&
                  "border-[var(--color-selected-text)] bg-[var(--color-selected-bg)]",
              )}
            >
              <p className="font-bold">
                {msg.role === "user" ? vi.assistant.you : vi.assistant.bot}
              </p>
              <p className="mt-2">{msg.text}</p>
              {msg.reply ? <ReplyMeta reply={msg.reply} /> : null}
            </Card>
          </li>
        ))}
        {askMutation.isPending ? (
          <li>
            <p className="text-[var(--color-text-muted)]">{vi.assistant.sending}</p>
          </li>
        ) : null}
      </ul>

      {askMutation.isError ? (
        <p role="alert" className="font-medium text-[var(--color-error)]">
          {vi.assistant.errFailed}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="assistant-input" className="font-medium">
          {vi.assistant.inputLabel}
        </label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={vi.assistant.inputPlaceholder}
          rows={3}
          className="rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[length:var(--text-body)]"
        />
        <Button type="submit" disabled={askMutation.isPending} className="self-start">
          {vi.assistant.send}
        </Button>
      </form>
    </div>
  );
}

function ReplyMeta({ reply }: { reply: AssistantReply }) {
  if (!reply.grounded) {
    // RULE-14: câu trả lời không nguồn phải được đánh dấu rõ — icon + chữ, không chỉ màu.
    return (
      <p className="mt-3 flex items-start gap-2 rounded-[var(--radius)] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
        <TriangleAlert aria-hidden className="mt-1 size-5 shrink-0" />
        {vi.assistant.ungrounded}
      </p>
    );
  }
  return (
    <div className="mt-3">
      <p className="font-medium">{vi.assistant.sources}</p>
      <ul className="mt-1 list-disc ps-6">
        {reply.citations.map((c, i) => (
          <li key={i}>
            {c.title}
            {c.page !== undefined ? ` — trang ${c.page}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

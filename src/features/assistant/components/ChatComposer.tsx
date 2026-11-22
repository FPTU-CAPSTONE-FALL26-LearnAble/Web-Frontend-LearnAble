import { forwardRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { vi } from "@/shared/strings/vi";
import { Button } from "@/shared/ui/primitives/button";
import { FIELD, TARGET } from "@/features/assistant/ui";

const t = vi.assistant;

type Props = {
  pending: boolean;
  /** False until a course is chosen: there is nothing to ask about yet. */
  enabled: boolean;
  textClass: string;
  onSend: (question: string) => void;
};

/** Enter sends, Shift+Enter starts a new line. Focus stays in the field. */
export const ChatComposer = forwardRef<HTMLTextAreaElement, Props>(function ChatComposer(
  { pending, enabled, textClass, onSend },
  ref,
) {
  const [value, setValue] = useState("");
  const canSend = enabled && value.trim().length > 0 && !pending;

  const send = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Leave Enter alone while an input method is composing Vietnamese text.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="assistant-input" className="font-semibold">
        {t.inputLabel}
      </label>
      <textarea
        id="assistant-input"
        ref={ref}
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-describedby="assistant-input-hint"
        className={`${FIELD} ${textClass}`}
      />
      <p id="assistant-input-hint" className="text-muted-foreground">
        {t.composerHint}
      </p>
      <Button type="submit" className={`${TARGET} self-start`} disabled={!canSend}>
        <Send aria-hidden />
        {t.send}
      </Button>
    </form>
  );
});

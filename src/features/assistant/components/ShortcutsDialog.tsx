import { vi } from "@/shared/strings/vi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  ASSISTANT_SHORTCUTS,
  type AssistantShortcut,
} from "@/features/assistant/hooks/useAssistantShortcuts";

const t = vi.assistant.shortcuts;
const ORDER: AssistantShortcut[] = ["newConversation", "toggleMode", "talk", "replay", "latestAnswer", "stop", "help"];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-3">
          {ORDER.map((name) => (
            <div key={name} className="flex flex-wrap items-center justify-between gap-3">
              <dt>{t[name]}</dt>
              <dd>
                <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-mono font-bold">
                  {ASSISTANT_SHORTCUTS[name]}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

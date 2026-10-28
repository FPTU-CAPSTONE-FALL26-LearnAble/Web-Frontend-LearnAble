import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export type SaveState = "saved" | "saving" | "offline" | "error";

const config: Record<SaveState, { text: string; className: string }> = {
  saved: { text: vi.exam.saveStatus.saved, className: "text-success-foreground" },
  saving: { text: vi.exam.saveStatus.saving, className: "text-muted-foreground" },
  offline: {
    text: vi.exam.saveStatus.offline,
    className: "bg-warning text-warning-foreground border border-warning-foreground/30",
  },
  error: { text: vi.exam.saveStatus.error, className: "text-destructive" },
};

const icons: Record<SaveState, typeof Check> = {
  saved: Check,
  saving: Loader2,
  offline: CloudOff,
  error: TriangleAlert,
};

/**
 * Chỉ báo lưu bài luôn hiển thị (FR-06). Trạng thái = icon + chữ, không chỉ màu.
 * KHÔNG tự announce — save queue announce tại thời điểm sự kiện (NFR-12),
 * component này chỉ là lớp hiển thị.
 */
export function SaveStatus({ state }: { state: SaveState }) {
  const { text, className } = config[state];
  const Icon = icons[state];
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1 font-medium",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-5", state === "saving" && "animate-spin")} />
      {text}
    </p>
  );
}

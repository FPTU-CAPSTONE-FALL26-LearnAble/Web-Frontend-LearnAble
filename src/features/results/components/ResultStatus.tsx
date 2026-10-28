import { Check, CircleHelp, Flag, X } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import type { ExamResult } from "@/api/results";

const config: Record<
  ExamResult["status"],
  { text: string; className: string; Icon: typeof Check }
> = {
  passed: { text: vi.results.status.passed, className: "text-success-foreground", Icon: Check },
  failed: { text: vi.results.status.failed, className: "text-destructive", Icon: X },
  pending: {
    text: vi.results.status.pending,
    className: "text-muted-foreground",
    Icon: CircleHelp,
  },
  flagged: {
    text: vi.results.status.flagged,
    className: "bg-warning text-warning-foreground rounded-md border border-warning-foreground/30 px-2",
    Icon: Flag,
  },
};

/** Trạng thái = icon + chữ, không bao giờ chỉ màu (§8.1). */
export function ResultStatus({ status }: { status: ExamResult["status"] }) {
  const { text, className, Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium", className)}>
      <Icon aria-hidden className="size-5" />
      {text}
    </span>
  );
}

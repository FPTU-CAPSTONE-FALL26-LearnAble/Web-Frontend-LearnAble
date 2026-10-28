import { CheckCircle2, Clock3, KeyRound, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExamCodeStatus = "scheduled" | "opening-soon" | "open" | "closed";

const statusConfig = {
  scheduled: {
    label: "Not open yet",
    Icon: LockKeyhole,
    border: "border-border",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
  "opening-soon": {
    label: "Opening soon",
    Icon: Clock3,
    border: "border-warning-foreground/30",
    bg: "bg-warning",
    text: "text-warning-foreground",
  },
  open: {
    label: "Open",
    Icon: CheckCircle2,
    border: "border-success-foreground/30",
    bg: "bg-success",
    text: "text-success-foreground",
  },
  closed: {
    label: "Closed",
    Icon: LockKeyhole,
    border: "border-destructive/30",
    bg: "bg-destructive/15",
    text: "text-destructive",
  },
} as const;

export function ExamCodeCard({
  code,
  status,
  detail,
  compact = false,
  className,
}: {
  code: string;
  status: ExamCodeStatus;
  detail?: string;
  compact?: boolean;
  className?: string;
}) {
  const config = statusConfig[status];
  const StatusIcon = config.Icon;
  const displayedCode = status === "scheduled" || status === "opening-soon" ? "XXXXXX" : code;

  if (compact) {
    return (
      <div
        className={cn(
          "flex w-fit max-w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border-2 px-3 py-2 text-xs font-bold shadow-sm",
          config.border,
          config.bg,
          config.text,
          className,
        )}
      >
        <KeyRound aria-hidden className="size-4 shrink-0" />
        <span className="uppercase">Exam code</span>
        <strong className="whitespace-nowrap tracking-wide">{displayedCode}</strong>
        <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
        <StatusIcon aria-hidden className="size-4 shrink-0" />
        <span className="whitespace-nowrap">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 shadow-sm",
        config.border,
        config.bg,
        config.text,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
          <KeyRound aria-hidden className="size-4" />
          Exam code
        </p>
        <span className="flex items-center gap-1.5 text-xs font-extrabold">
          <StatusIcon aria-hidden className="size-4" />
          {config.label}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 overflow-x-auto whitespace-nowrap rounded-lg border bg-background px-3 py-2 text-center text-base font-extrabold tracking-wide sm:text-lg",
          config.border,
        )}
      >
        {displayedCode}
      </p>
      {detail && <p className="mt-2 text-xs font-bold">{detail}</p>}
    </div>
  );
}

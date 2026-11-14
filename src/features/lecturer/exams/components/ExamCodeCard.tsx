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
    const terminalStatus = status === "scheduled" || status === "closed";
    if (terminalStatus) {
      return (
        <div
          className={cn(
            "flex min-h-10 w-full max-w-60 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-bold shadow-sm",
            config.border,
            config.bg,
            config.text,
            className,
          )}
        >
          <span className="flex items-center gap-2 uppercase">
            <KeyRound aria-hidden className="size-4 shrink-0" />
            Exam code
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusIcon aria-hidden className="size-4" />
            {status === "closed" ? (
              config.label
            ) : (
              <span className="sr-only">{config.label}</span>
            )}
          </span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "w-full max-w-80 rounded-xl border-2 text-xs font-bold shadow-sm",
          config.border,
          config.bg,
          config.text,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <span className="flex shrink-0 items-center gap-2 uppercase">
            <KeyRound aria-hidden className="size-4 shrink-0" />
            <span>Exam code</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <StatusIcon aria-hidden className="size-4" />
            {config.label}
          </span>
        </div>
        <div className={cn("mx-4 mt-2 flex min-h-11 items-center justify-center rounded-lg border bg-background px-4 py-2", config.border)}>
          <strong className="whitespace-nowrap text-base tracking-wide sm:text-lg">
            {displayedCode}
          </strong>
        </div>
        {detail ? (
          <p className="px-4 pb-3 pt-2">
            {detail}
          </p>
        ) : null}
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

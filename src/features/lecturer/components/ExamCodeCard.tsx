import { CheckCircle2, Clock3, KeyRound, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExamCodeStatus = "scheduled" | "opening-soon" | "open" | "closed";

const statusConfig = {
  scheduled: {
    label: "Not open yet",
    Icon: LockKeyhole,
    accent: "var(--color-border)",
    background: "color-mix(in srgb, var(--color-border) 10%, #ffffff)",
  },
  "opening-soon": {
    label: "Opening soon",
    Icon: Clock3,
    accent: "var(--color-warning)",
    background: "var(--color-warning-bg)",
  },
  open: {
    label: "Open",
    Icon: CheckCircle2,
    accent: "var(--color-success)",
    background: "var(--color-success-bg)",
  },
  closed: {
    label: "Closed",
    Icon: LockKeyhole,
    accent: "var(--color-error)",
    background: "var(--color-danger-bg)",
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
        className={cn("flex w-fit max-w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border-2 px-3 py-2 text-xs font-bold shadow-[var(--shadow-control)]", className)}
        style={{ color: "var(--color-text)", background: config.background, borderColor: config.accent }}
      >
        <KeyRound aria-hidden className="size-4 shrink-0" style={{ color: config.accent }} />
        <span className="uppercase">Exam code</span>
        <strong className="whitespace-nowrap tracking-wide">{displayedCode}</strong>
        <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--color-border-subtle)]" />
        <StatusIcon aria-hidden className="size-4 shrink-0" style={{ color: config.accent }} />
        <span className="whitespace-nowrap">{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border-2 p-4 shadow-[var(--shadow-control)]", className)} style={{ color: "var(--color-text)", background: config.background, borderColor: config.accent }}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide"><KeyRound aria-hidden className="size-4" style={{ color: config.accent }} />Exam code</p>
        <span className="flex items-center gap-1.5 text-xs font-extrabold"><StatusIcon aria-hidden className="size-4" style={{ color: config.accent }} />{config.label}</span>
      </div>
      <p className="mt-3 overflow-x-auto whitespace-nowrap rounded-lg border bg-white px-3 py-2 text-center text-base font-extrabold tracking-wide sm:text-lg" style={{ borderColor: config.accent }}>{displayedCode}</p>
      {detail && <p className="mt-2 text-xs font-bold">{detail}</p>}
    </div>
  );
}

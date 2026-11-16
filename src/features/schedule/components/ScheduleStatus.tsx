import { Ban, CalendarCheck, CircleCheck, CircleHelp, DoorOpen } from "lucide-react";
import type { ExamSchedule } from "@/api/exams";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

const config: Record<
  ExamSchedule["status"],
  { className: string; Icon: typeof Ban }
> = {
  Draft: { className: "text-muted-foreground", Icon: CircleHelp },
  Published: { className: "text-foreground", Icon: CalendarCheck },
  Open: { className: "text-success-foreground", Icon: DoorOpen },
  Closed: { className: "text-muted-foreground", Icon: CircleCheck },
  Cancelled: { className: "text-destructive", Icon: Ban },
};

/** Status is always an icon plus words, never colour alone. */
export function ScheduleStatus({ status }: { status: ExamSchedule["status"] }) {
  const { className, Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <Icon aria-hidden className="size-5 shrink-0" />
      {vi.schedule.status[status]}
    </span>
  );
}

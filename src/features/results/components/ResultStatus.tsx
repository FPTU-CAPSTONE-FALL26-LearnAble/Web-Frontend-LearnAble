import { CircleCheck, CircleHelp, Clock } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export type ResultState = "graded" | "pending" | "notReleased";

const config: Record<ResultState, { className: string; Icon: typeof CircleCheck }> = {
  graded: { className: "text-success-foreground", Icon: CircleCheck },
  pending: { className: "text-muted-foreground", Icon: CircleHelp },
  notReleased: { className: "text-muted-foreground", Icon: Clock },
};

/** State is an icon plus words, never colour alone (§8.1). */
export function ResultStatus({ status }: { status: ResultState }) {
  const { className, Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium", className)}>
      <Icon aria-hidden className="size-5" />
      {vi.results.state[status]}
    </span>
  );
}

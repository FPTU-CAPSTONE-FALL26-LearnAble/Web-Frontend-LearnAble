import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { HealthStatus } from "@/api/adminSystem";
import { cn } from "@/lib/utils";

/** Date and time in the admin's locale; an unparsable value stays honest. */
export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const healthStyles: Record<
  HealthStatus,
  { icon: typeof CircleCheck; className: string; label: string }
> = {
  Healthy: {
    icon: CircleCheck,
    className: "bg-success text-success-foreground border-success-foreground/30",
    label: "Healthy",
  },
  Degraded: {
    icon: CircleAlert,
    className: "bg-warning text-warning-foreground border-warning-foreground/30",
    label: "Degraded",
  },
  Down: {
    icon: CircleX,
    className: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Down",
  },
};

/** Status is carried by the word and the icon shape, never by colour alone. */
export function HealthBadge({ status }: { status: HealthStatus }) {
  const style = healthStyles[status];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-extrabold",
        style.className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {style.label}
    </span>
  );
}

/** Numbers from the API may be null; show that plainly instead of zero. */
export const metric = (
  value: number | null | undefined,
  unit = "",
  digits = 0,
) =>
  value === null || value === undefined
    ? "Not available"
    : `${value.toLocaleString("en-GB", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })}${unit}`;

import type { ReactNode } from "react";
import { Link } from "react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/primitives/alert";
import { describeError } from "@/app/providers";
import { toast } from "@/shared/ui/primitives/toast";
import { ChoiceField } from "@/components/workbench/Fields";
import { cn } from "@/lib/utils";
export function ScrollRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  // Scrollable overflow must be keyboard-focusable without changing its region semantics.
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div tabIndex={0} role="region" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export const notConnected = (action: string) =>
  toast({
    title: "Option not available",
    description: `${action} isn’t available yet. Your existing information has not been changed.`,
  });
export const unavailable = "Not available";
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div>
        <h1
          tabIndex={-1}
          className="text-3xl font-extrabold tracking-tight text-primary outline-none"
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </header>
  );
}
export function Breadcrumb({
  parent,
  path,
  current,
  currentClassName,
}: {
  parent: string;
  path: string;
  current: string;
  currentClassName?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
    >
      <Link
        to={path}
        className="inline-flex min-h-11 items-center hover:underline"
      >
        {parent}
      </Link>
      <span aria-hidden>/</span>
      <span aria-current="page" className={currentClassName}>
        {current}
      </span>
    </nav>
  );
}
const summaryToneClasses: Record<string, string> = {
  danger: "bg-destructive/15 text-destructive",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-secondary text-secondary-foreground",
};

export function SummaryCard({
  label,
  value,
  detail,
  icon,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  const tone = /failed|review|urgent|incident/i.test(label)
    ? "danger"
    : /published|compliant|ready|completed/i.test(label)
      ? "success"
      : /running|processing|exam/i.test(label)
        ? "info"
        : /draft|archived/i.test(label)
          ? "warning"
          : /active|published|compliant|ready|completed/i.test(label)
            ? "success"
            : "info";
  if (compact) {
    return (
      <Card size="sm" className="min-w-0 border-border py-0 shadow-none">
        <CardContent className="relative min-h-20 justify-center gap-1 p-4 pr-16">
          <p className="truncate text-sm font-semibold text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "break-words text-2xl font-extrabold leading-none tabular-nums",
              value === unavailable && "text-lg",
            )}
          >
            {value}
          </p>
          {icon ? (
            <span
              className={cn(
                "summary-icon absolute right-4 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg",
                summaryToneClasses[tone] ?? "bg-secondary text-secondary-foreground",
              )}
            >
              {icon}
            </span>
          ) : null}
          {detail ? (
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="min-w-0 overflow-hidden border-border py-0 shadow-none">
      <CardContent>
        <div className="flex items-start justify-between gap-3 pt-5 text-sm font-semibold text-muted-foreground">
          <span>{label}</span>
          {icon && (
            <span
              className={cn(
                "summary-icon flex size-9 shrink-0 items-center justify-center rounded-lg",
                summaryToneClasses[tone] ?? "bg-secondary text-secondary-foreground"
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p
          className={`my-3 break-words font-extrabold tabular-nums ${value === unavailable ? "text-lg" : "text-xl sm:text-2xl"}`}
        >
          {value}
        </p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

const toneClasses: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-success text-success-foreground border-success-foreground/30",
    dot: "bg-success-foreground",
  },
  danger: {
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
  warning: {
    badge: "bg-warning text-warning-foreground border-warning-foreground/30",
    dot: "bg-warning-foreground",
  },
  info: {
    badge: "bg-secondary text-secondary-foreground border-secondary-foreground/30",
    dot: "bg-secondary-foreground",
  },
  neutral: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};

export function StatusBadge({
  value,
  tone: toneOverride,
}: {
  value: string;
  tone?: StatusTone;
}) {
  // `\bactive\b` keeps "Inactive" out of the success bucket.
  const tone: StatusTone =
    toneOverride ??
    (/\bactive\b|published|done|present|submitted|ready/i.test(value)
      ? "success"
      : /failed|error|incident|urgent/i.test(value)
        ? "danger"
        : /pending|draft|waiting|high/i.test(value)
          ? "warning"
          : "info");
  const config = toneClasses[tone];
  return (
    <Badge
      variant="outline"
      className={cn("h-auto gap-1.5 px-2.5 py-1 font-extrabold shadow-none", config.badge)}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", config.dot)}
      />
      {value}
    </Badge>
  );
}
export function ReadState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: unknown;
  retry: () => void;
}) {
  if (pending)
    return (
      <div
        role="status"
        className="flex min-h-40 items-center justify-center gap-3 p-6 text-muted-foreground"
      >
        <Loader2
          aria-hidden
          className="size-5 animate-spin motion-reduce:animate-none"
        />
        Loading data…
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertTitle>Unable to load data</AlertTitle>
        <AlertDescription>
          {describeError(error)}
          <Button variant="outline" className="mt-3" onClick={retry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  return null;
}
export function Pagination({
  page,
  pages,
  size,
  onPage,
  onSize,
}: {
  page: number;
  pages: number;
  size: string;
  onPage: (page: number) => void;
  onSize: (size: string) => void;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4">
      <ChoiceField
        label="Rows per page"
        value={size}
        options={["10", "25", "50"]}
        onChange={onSize}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {Math.max(1, pages)}
        </span>
        <Button
          variant="outline"
          disabled={page >= Math.max(1, pages)}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </footer>
  );
}

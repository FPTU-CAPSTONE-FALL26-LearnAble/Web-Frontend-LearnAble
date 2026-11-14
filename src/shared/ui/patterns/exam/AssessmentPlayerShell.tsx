import type { ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface AssessmentPlayerShellProps {
  candidate: { id: string; name: string };
  /** Line under the candidate, e.g. the connection state. Omit before connecting. */
  status?: ReactNode;
  /** Right side of the top bar: a menu button or the current screen name. */
  trailing?: ReactNode;
  /** Extra header content below the top bar, still part of the fixed header. */
  headerContent?: ReactNode;
  /** Fixed region under the scrolling content. */
  footer?: ReactNode;
  /** Page body; the caller's `main` should be `min-h-0 flex-1` and scroll. */
  children: ReactNode;
  className?: string;
}

/**
 * Full-window frame shared by exam-time screens: fixed header and footer with
 * only the content between them scrolling.
 */
export function AssessmentPlayerShell({
  candidate,
  status,
  trailing,
  headerContent,
  footer,
  children,
  className,
}: AssessmentPlayerShellProps) {
  return (
    <div
      className={cn(
        "relative flex h-dvh flex-col overflow-hidden bg-secondary text-foreground antialiased",
        className,
      )}
    >
      <header className="relative shrink-0 border-b border-border bg-background shadow-xs">
        <div className="flex min-h-16 items-center sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {vi.exam.player.candidate(candidate.id, candidate.name)}
            </p>
            {status ? <div>{status}</div> : null}
          </div>
          <div className="ml-auto" />
          {trailing}
        </div>
        {headerContent}
      </header>
      {children}
      {footer}
    </div>
  );
}

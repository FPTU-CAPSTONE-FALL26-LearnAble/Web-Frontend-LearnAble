import type { ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface AssessmentPlayerShellProps {
  candidate: { id: string; name: string };
  /** Line or badge next to the candidate, e.g. the connection state. Omit before connecting. */
  status?: ReactNode;
  /** Optional course or exam metadata shown under the centered header slot. */
  meta?: ReactNode;
  /** Exam identity (e.g. ExamInfo) shown beside the candidate, after a divider. */
  examInfo?: ReactNode;
  /** Centered header slot, e.g. remaining exam time. */
  center?: ReactNode;
  /** Right side of the top bar: a settings/options button or current screen name. */
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
  meta,
  examInfo,
  center,
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
      <header className="relative shrink-0">
        <div className="grid min-h-[60px] grid-cols-[1fr_auto_1fr] items-center gap-4 p-2">
          <div className="flex min-w-0 items-center gap-3 pl-4">
            <div className="flex min-w-0 flex-col leading-tight">
              <p className="truncate text-base font-medium leading-tight text-foreground">
                {vi.exam.player.candidate(candidate.id, candidate.name)}
              </p>
              {status ? (
                <div className="inline-flex shrink-0 items-center gap-1.5 text-base font-medium leading-tight text-player-connected">
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-player-connected"
                  />
                  <span>{status}</span>
                </div>
              ) : null}
            </div>
            {examInfo ? (
              <>
                <span aria-hidden className="h-8 w-px shrink-0 bg-border" />
                {examInfo}
              </>
            ) : null}
          </div>
          <div className="flex flex-col items-center text-center leading-tight">
            {center ? (
              <div className="text-base font-semibold leading-tight text-foreground">
                {center}
              </div>
            ) : null}
            {meta ? (
              <div className="text-base leading-tight text-muted-foreground">
                {meta}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-end">{trailing}</div>
        </div>
        {headerContent}
      </header>
      {children}
      {footer}
    </div>
  );
}

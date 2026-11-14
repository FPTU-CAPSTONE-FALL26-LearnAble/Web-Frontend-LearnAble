import { ChevronRight } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import { StatusBadge } from "./Workbench";

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** A titled region of a dashboard. Every panel is a labelled landmark so screen readers can jump between them. */
export function DashboardPanel({
  title,
  action,
  id,
  className,
  children,
}: {
  title: string;
  action?: { label: string; to: string };
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={cn("min-w-0 rounded-2xl border border-border bg-card", className)}>
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {action ? (
          <Link
            to={action.to}
            className={cn("inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold underline decoration-primary underline-offset-4", focusRing)}
          >
            {action.label}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Loading, failure and empty states for one panel, so a broken request never blanks the whole page. */
export function PanelState({
  pending,
  error,
  errorText,
  onRetry,
  empty,
  children,
}: {
  pending: boolean;
  error: unknown;
  errorText: string;
  onRetry: () => void;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (pending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading…</span>
        {[0, 1, 2].map((row) => (
          <div key={row} aria-hidden className="h-14 animate-pulse rounded-lg bg-muted/60 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-warning bg-warning p-4 text-warning-foreground">
        <p className="font-semibold">{errorText}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (empty) return <div className="text-muted-foreground">{empty}</div>;
  return <>{children}</>;
}

/** One exam shift: when it runs, what it is, where, and how it stands. */
export function ShiftRow({
  start,
  end,
  title,
  meta,
  status,
  hint,
  live = false,
  action,
}: {
  start: string;
  end: string;
  title: string;
  meta: string;
  status: ReactNode;
  hint?: string;
  live?: boolean;
  action?: { label: string; to: string; description: string };
}) {
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center">
      <div>
        <p className="text-xl font-semibold tabular-nums">{start}</p>
        <p className="text-sm tabular-nums text-muted-foreground">to {end}</p>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold wrap-anywhere">{title}</p>
        <p className="text-sm text-muted-foreground wrap-anywhere">{meta}</p>
        {hint ? (
          <p className={cn("flex items-center gap-2 text-sm", live ? "font-semibold text-success-foreground" : "text-muted-foreground")}>
            {live ? <span aria-hidden className="size-2 rounded-full bg-success-foreground" /> : null}
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {status}
        {action ? (
          <Button variant="outline" asChild>
            <Link to={action.to} aria-label={`${action.label}: ${action.description}`}>
              {action.label}
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** A jump link to the "needs attention" panel, shown only where that panel sits far down the page. */
export function AttentionJump({ count, targetId }: { count: number; targetId: string }) {
  if (!count) return null;
  return (
    <a
      href={`#${targetId}`}
      className={cn("mt-1 inline-flex min-h-11 items-center rounded-md font-semibold underline decoration-primary underline-offset-4 xl:hidden", focusRing)}
    >
      {count === 1 ? "1 item needs attention" : `${count} items need attention`}
    </a>
  );
}

export type AttentionItem = { key: string; label: string; hint: string; count: number; to: string };

/** Things that need a person to act, each linking straight to the place to do it. */
export function AttentionList({ items, emptyText }: { items: AttentionItem[]; emptyText: string }) {
  if (!items.length) return <p className="text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="-my-2 divide-y divide-border">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            to={item.to}
            className={cn("-mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent", focusRing)}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-sm text-muted-foreground">{item.hint}</span>
            </span>
            <span className="min-w-8 rounded-md border border-warning-foreground/30 bg-warning px-2 py-0.5 text-center text-sm font-semibold tabular-nums text-warning-foreground">
              {item.count}
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type Shortcut = { key: string; label: string; hint: string; to: string };

/** Fixed links to the jobs people do most, so the page is useful even before there is any data. */
export function ShortcutList({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <ul className="-my-2 divide-y divide-border">
      {shortcuts.map((shortcut) => (
        <li key={shortcut.key}>
          <Link to={shortcut.to} className={cn("-mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent", focusRing)}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{shortcut.label}</span>
              <span className="block text-sm text-muted-foreground">{shortcut.hint}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type BarSegment ={ label: string; count: number; swatch: string };

/** A single stacked bar with a text legend, so the split never depends on colour alone. */
export function SplitBar({ segments, emptyText }: { segments: BarSegment[]; emptyText: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  if (!total) return <p className="text-muted-foreground">{emptyText}</p>;
  const summary = segments.map((segment) => `${segment.label} ${segment.count}`).join(", ");
  return (
    <div className="space-y-3">
      <div role="img" aria-label={summary} className="flex h-3 overflow-hidden rounded-full bg-muted">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span key={segment.label} className={segment.swatch} style={{ flexGrow: segment.count }} />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-full", segment.swatch)} />
            <span>{segment.label}</span>
            <span className="font-semibold tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Stat = { key: string; label: string; value: string; detail: string; to?: string };

/** One band of headline numbers; each cell links to where the numbers can be acted on. */
export function StatBand({ stats, label = "Overview" }: { stats: Stat[]; label?: string }) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-2xl border border-border bg-border">
      <ul className="grid grid-cols-2 gap-px xl:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
              <span className="text-sm text-muted-foreground wrap-anywhere">{stat.detail}</span>
            </>
          );
          const cell = "flex h-full min-h-28 flex-col gap-1 p-4 sm:p-5";
          return (
            <li key={stat.key} className="bg-card">
              {stat.to ? (
                <Link to={stat.to} className={cn(cell, "hover:bg-accent", focusRing)}>
                  {body}
                </Link>
              ) : (
                <div className={cell}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A compact empty state that says what is missing and offers the way to fix it. */
export function EmptyNote({ title, text, action }: { title: string; text?: string; action?: { label: string; to: string } }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {text ? <p className="mt-1 text-sm text-muted-foreground">{text}</p> : null}
      </div>
      {action ? (
        <Button variant="outline" asChild className="shrink-0">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export type FlowTone = "success" | "warning" | "danger" | "info" | "neutral";
export type FlowStep = {
  key: string;
  title: string;
  summary: string;
  status: { label: string; tone: FlowTone };
  actions: Array<{ label: string; to: string }>;
};

/** An ordered workflow where each step shows how far along it is and the way into it. */
export function FlowList({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="divide-y divide-border">
      {steps.map((step, index) => (
        <li key={step.key} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
          <span aria-hidden className="grid size-8 place-items-center rounded-full border border-border text-sm font-semibold tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{step.title}</h3>
              <StatusBadge value={step.status.label} tone={step.status.tone} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{step.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {step.actions.map((action) => (
              <Button key={action.to} variant="outline" asChild>
                <Link to={action.to}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One record in a short list: what it is, a line of context, and its state. */
export function EntityRow({ title, meta, badge }: { title: string; meta: string; badge?: ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="line-clamp-2 font-semibold wrap-anywhere">{title}</p>
        <p className="text-sm text-muted-foreground wrap-anywhere">{meta}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </li>
  );
}

/** Label and value pairs in a definition list. */
export function FactList({ facts }: { facts: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-1">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-sm text-muted-foreground">{fact.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

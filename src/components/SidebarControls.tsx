import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";
import { Tooltip } from "radix-ui";
import { matchPath, NavLink, useLocation, useResolvedPath } from "react-router";
import { cn } from "@/lib/utils";

const railItem =
  "relative grid size-11 shrink-0 place-items-center rounded-lg border outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
// Every rail icon keeps the same neutral colour; only the background and border show which page is open.
const railIdle = "border-transparent text-muted-foreground hover:bg-sidebar-accent";
const railActive = "border-sidebar-primary/30 bg-sidebar-accent text-muted-foreground";

/**
 * Shows the full name of an icon-only control as soon as it is hovered or focused.
 * It renders in a portal so the scrolling navigation list cannot clip it, stays open
 * while the pointer is over it, and closes with Escape.
 */
function RailTooltip({ label, side = "right", children }: { label: string; side?: "right" | "bottom"; children: ReactElement }) {
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={8}
            className="z-50 max-w-64 rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background shadow-md"
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** Folds a sidebar to its icon rail, or opens it again. */
export function SidebarCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <RailTooltip label={label} side={collapsed ? "right" : "bottom"}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={!collapsed}
        onClick={onToggle}
        className={cn(railItem, "border-border bg-background text-foreground hover:bg-accent")}
      >
        <Icon className="size-5" aria-hidden />
      </button>
    </RailTooltip>
  );
}

type RailLinkProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  onClick?: () => void;
  /** Unread count shown on the icon. */
  badge?: number;
};

/** A destination in the icon rail. Its name appears on hover or focus and is always available to screen readers. */
export function SidebarRailLink({ to, label, icon: Icon, end, onClick, badge }: RailLinkProps) {
  // The tooltip trigger merges props into this link, which turns a function `className` into
  // source text. Work out the active state here so the class name is a plain string.
  const { pathname } = useLocation();
  const target = useResolvedPath(to);
  const isActive = Boolean(matchPath({ path: target.pathname, end: Boolean(end) }, pathname));
  return (
    <RailTooltip label={label}>
      <NavLink
        to={to}
        end={end}
        onClick={onClick}
        aria-label={badge ? `${label}, ${badge} unread` : label}
        className={cn(railItem, isActive ? railActive : railIdle)}
      >
        <Icon className="size-5" aria-hidden />
        {badge ? (
          <span aria-hidden className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-xs font-bold leading-5 text-primary-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </NavLink>
    </RailTooltip>
  );
}

export function SidebarRailButton({ label, icon: Icon, onClick, danger = false }: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }) {
  return (
    <RailTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(railItem, "border-transparent", danger ? "text-destructive hover:bg-destructive/10" : railIdle)}
      >
        <Icon className="size-5" aria-hidden />
      </button>
    </RailTooltip>
  );
}

export function SidebarRailDivider() {
  return <hr aria-hidden className="my-1 w-6 shrink-0 border-border" />;
}

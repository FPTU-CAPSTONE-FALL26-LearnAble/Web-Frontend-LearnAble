import * as React from "react";
import { cn } from "@/shared/ui/cn";

const Table = React.forwardRef<
  HTMLTableElement,
  React.ComponentPropsWithoutRef<"table"> & { containerLabel?: string }
>(({ containerLabel, className, ...props }, ref) => (
  <div
    data-slot="table-container"
    className="relative w-full overflow-x-auto"
    role={containerLabel ? "region" : undefined}
    aria-label={containerLabel}
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- named overflow regions must be keyboard-scrollable.
    tabIndex={containerLabel ? 0 : undefined}
  >
    <table
      ref={ref}
      data-slot="table"
      className={cn("w-full caption-bottom text-[length:var(--text-body)]", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<"thead">
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-slot="table-header"
    className={cn("[&_tr]:border-b-2 [&_tr]:border-[var(--color-border)]", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<"tbody">
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<"tfoot">
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    data-slot="table-footer"
    className={cn(
      "border-t-2 border-[var(--color-border)] bg-[var(--color-surface-muted)] font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentPropsWithoutRef<"tr">
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    className={cn(
      "border-b border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-selected-bg)] has-aria-expanded:bg-[var(--color-selected-bg)] data-[state=selected]:bg-[var(--color-selected-bg)]",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentPropsWithoutRef<"th">
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    data-slot="table-head"
    className={cn(
      "h-12 px-3 text-left align-middle font-bold whitespace-nowrap text-[var(--color-text)] [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentPropsWithoutRef<"td">
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot="table-cell"
    className={cn(
      "p-3 align-middle whitespace-nowrap text-[var(--color-text)] [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.ComponentPropsWithoutRef<"caption">
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    data-slot="table-caption"
    className={cn("mt-4 text-[length:var(--text-sm)] text-[var(--color-text-muted)]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

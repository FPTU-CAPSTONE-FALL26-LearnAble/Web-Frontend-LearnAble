import type { FormEvent, ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/shared/ui/primitives/Dialog";
import { Pagination, ReadState } from "@/components/workbench/Workbench";

/** Dates arrive as ISO date or date-time strings; an unparsable one stays honest. */
export const formatDate = (value: string | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

/** `<input type="date">` needs `yyyy-MM-dd`, which is also what the API accepts. */
export const toDateInput = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : "";

export function FilterPanel({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  onSearch,
  onReset,
  hint,
  children,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="admin-panel shadow-none">
      <CardContent className="space-y-5">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="relative min-w-0 flex-1 basis-60">
            <Search
              aria-hidden
              className="absolute left-3 top-3 size-5 text-muted-foreground"
            />
            <Input
              aria-label={searchLabel}
              placeholder={searchPlaceholder}
              className="pl-10"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
          <Button type="submit">
            <Search aria-hidden />
            Search
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            Reset filters
          </Button>
        </form>
        {children ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {children}
          </div>
        ) : null}
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function TablePanel({
  heading,
  shown,
  total,
  noun,
  tableLabel,
  read,
  page,
  pages,
  size,
  onPage,
  onSize,
  children,
}: {
  heading: string;
  shown: number;
  total: number;
  noun: string;
  tableLabel: string;
  read: { isPending: boolean; error: unknown; refetch: () => unknown };
  page: number;
  pages: number;
  size: string;
  onPage: (page: number) => void;
  onSize: (size: string) => void;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
        <h2 className="text-lg font-bold">{heading}</h2>
        <p role="status" className="text-sm tabular-nums text-muted-foreground">
          Showing {shown} of {total} {noun}
        </p>
      </div>
      <ReadState
        pending={read.isPending}
        error={read.error}
        retry={() => void read.refetch()}
      />
      {!read.isPending && !read.error && (
        <Table containerLabel={tableLabel} className="min-w-[1120px]">
          {children}
        </Table>
      )}
      <Pagination
        page={page}
        pages={pages}
        size={size}
        onPage={onPage}
        onSize={onSize}
      />
    </section>
  );
}

export function EmptyRow({
  columns,
  title,
  hint,
}: {
  columns: number;
  title: string;
  hint: string;
}) {
  return (
    <tr className="border-b">
      <td colSpan={columns} className="h-40 p-4 text-center align-middle">
        <p className="font-bold">{title}</p>
        <p className="mt-2 text-muted-foreground">{hint}</p>
      </td>
    </tr>
  );
}

/**
 * Create/edit shell. Validation errors are listed above the fields and pointed
 * at by `aria-describedby` so they are announced rather than only coloured.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pending,
  errors,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  pending: boolean;
  errors: string[];
  onSubmit: () => void;
  children: ReactNode;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent
          title={title}
          description={description}
          className="max-h-[92vh] w-[min(94vw,640px)] overflow-y-auto"
          aria-describedby={errors.length ? "admin-form-errors" : undefined}
        >
          {/*
            `noValidate` keeps our announced, persistent error list the single
            source of truth. Native constraint validation on email/number/date
            inputs would otherwise block submit and show a transient browser
            tooltip instead, which the accessibility contract forbids.
          */}
          <form onSubmit={submit} noValidate className="space-y-5">
            {errors.length > 0 && (
              <div
                id="admin-form-errors"
                role="alert"
                className="rounded-xl border border-[var(--color-error)] p-4"
                style={{ background: "var(--color-danger-bg)" }}
              >
                <p className="font-bold">Fix the following before saving:</p>
                <ul className="mt-2 list-inside list-disc text-sm">
                  {errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {children}
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2
                    aria-hidden
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                )}
                {pending ? "Saving…" : submitLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/** Lifecycle transitions (activate, approve, archive, delete) confirm first. */
export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}

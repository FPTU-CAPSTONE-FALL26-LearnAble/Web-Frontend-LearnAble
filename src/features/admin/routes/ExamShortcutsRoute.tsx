import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  CircleOff,
  Info,
  Keyboard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createShortcut,
  deleteShortcut,
  getShortcutCatalog,
  getShortcuts,
  updateShortcut,
  type Shortcut,
  type ShortcutAction,
} from "@/api/shortcuts";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { PageHeading, ReadState } from "@/components/workbench/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useAdminWrite, useExpiredAdminSession } from "../api/useAdminData";
import { ConfirmAction, FormDialog } from "../components/AdminSurfaces";
import { formatDateTime } from "../components/SystemSurfaces";
import {
  comboFromEvent,
  comboParts,
  normalizeCombo,
  sameCombo,
  validateCombo,
  type ShortcutRules,
} from "../shortcuts/shortcutKeys";
import { ShortcutTester } from "../shortcuts/ShortcutTester";

const RESOURCE = "exam-shortcuts";

export function KeyCombo({ combo }: { combo: string }) {
  const parts = comboParts(combo);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {/* Read as one phrase ("Ctrl+N"), not key by key. */}
      <span className="sr-only">{combo}</span>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1" aria-hidden>
          <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-sm font-bold">
            {part}
          </kbd>
          {index < parts.length - 1 && <span className="text-muted-foreground">+</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * Records a combination from a real key press. Tab and Shift+Tab are never
 * captured, so keyboard and screen-reader users can always leave the field;
 * Escape is left to the dialog. Backspace or Delete on its own clears it.
 */
function ShortcutCaptureField({
  value,
  onChange,
  error,
  preview,
  rules,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  error: string | null;
  /** What saving the recorded combination will do, once it is valid. */
  preview: string | null;
  rules: ShortcutRules;
}) {
  const id = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const plain = !event.ctrlKey && !event.altKey && !event.metaKey;
    if (event.key === "Tab" && plain) return;
    if (event.key === "Escape") return;
    event.preventDefault();
    if (plain && !event.shiftKey && (event.key === "Backspace" || event.key === "Delete")) {
      onChange(null);
      return;
    }
    const combo = comboFromEvent(event.nativeEvent, rules);
    if (combo) onChange(combo);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>New shortcut</Label>
      <Input
        id={id}
        readOnly
        value={value ?? ""}
        placeholder="Focus here and press the keys"
        onKeyDown={onKeyDown}
        aria-invalid={!!error}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className="font-mono text-base font-bold"
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        Focus the field, hold Ctrl and press the key, for example Ctrl and N
        together. Press Backspace to clear it. Tab still moves to the next
        control. If nothing appears, the browser or operating system has taken
        that combination; choose another.
      </p>
      <p role="status" className="min-h-6 text-sm font-bold">
        {!error && preview ? preview : ""}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** One catalog action and the shortcut configured for it, if any. */
type Row = { action: ShortcutAction; shortcut: Shortcut | null };

/** Exam keyboard shortcuts — FR-52 (FE: Huy · desktop: Duy · backend: Cường). */
export function ExamShortcutsRoute() {
  useRouteAnnouncer("Keyboard shortcuts · LearnAble Admin", "Keyboard shortcuts");
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["catalog"]),
    queryFn: getShortcutCatalog,
  });
  const shortcuts = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["list"]),
    queryFn: getShortcuts,
  });
  useExpiredAdminSession(catalog.error ?? shortcuts.error);

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  const rules: ShortcutRules | null = catalog.data ?? null;
  const rows = useMemo<Row[]>(() => {
    if (!catalog.data || !shortcuts.data) return [];
    const byAction = new Map(shortcuts.data.map((item) => [item.actionCode, item]));
    const listed: Row[] = catalog.data.actions.map((action) => ({
      action,
      shortcut: byAction.get(action.code) ?? null,
    }));
    // A shortcut whose action left the catalog still occupies its keys, so it
    // stays visible and removable instead of silently blocking a combination.
    const known = new Set(catalog.data.actions.map((action) => action.code));
    const orphans: Row[] = shortcuts.data
      .filter((item) => !known.has(item.actionCode))
      .map((item) => ({
        action: {
          code: item.actionCode,
          name: item.actionCode || "Unknown action",
          description: "This action is no longer in the exam app.",
        },
        shortcut: item,
      }));
    return [...listed, ...orphans];
  }, [catalog.data, shortcuts.data]);

  const editing = rows.find((row) => row.action.code === editingCode) ?? null;
  const removing = rows.find((row) => row.action.code === removingCode) ?? null;
  const lastChanged = (shortcuts.data ?? [])
    .map((item) => item.updatedAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);

  /**
   * A refused write usually means the list on screen is stale (someone else
   * edited it, or an exam started), so the rows and their ETags are reloaded.
   */
  const refreshOnFailure = async (work: Promise<unknown>) => {
    try {
      await work;
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resource(RESOURCE) });
      throw error;
    }
  };

  const save = useAdminWrite<{ row: Row; combo: string }>({
    resource: RESOURCE,
    action: "Save shortcut",
    mutationFn: ({ row, combo }) =>
      refreshOnFailure(
        row.shortcut
          ? updateShortcut(
              row.shortcut.shortcutId,
              {
                actionCode: row.action.code,
                keyCombination: combo,
                isEnabled: row.shortcut.isEnabled,
              },
              row.shortcut.eTag,
            )
          : createShortcut({
              actionCode: row.action.code,
              keyCombination: combo,
              isEnabled: true,
            }),
      ),
    onSuccess: () => setEditingCode(null),
  });

  const toggle = useAdminWrite<Shortcut>({
    resource: RESOURCE,
    action: "Update shortcut",
    mutationFn: (shortcut) =>
      refreshOnFailure(
        updateShortcut(
          shortcut.shortcutId,
          {
            actionCode: shortcut.actionCode,
            keyCombination: shortcut.keyCombination,
            isEnabled: !shortcut.isEnabled,
          },
          shortcut.eTag,
        ),
      ),
  });

  const remove = useAdminWrite<Shortcut>({
    resource: RESOURCE,
    action: "Remove shortcut",
    mutationFn: (shortcut) =>
      refreshOnFailure(deleteShortcut(shortcut.shortcutId, shortcut.eTag)),
  });

  const busy = save.isPending || toggle.isPending || remove.isPending;

  const openEditor = (row: Row) => {
    setEditingCode(row.action.code);
    setCaptured(row.shortcut?.keyCombination || null);
    setCaptureError(null);
  };

  /** Why the combination cannot be given to the action being edited, if so. */
  const problemWith = (combo: string | null) => {
    if (!editing || !rules) return null;
    const taken = new Map(
      rows
        .filter((row) => row.shortcut && row.action.code !== editing.action.code)
        .map((row) => [row.shortcut!.keyCombination, row.action.name]),
    );
    return validateCombo(combo, taken, rules);
  };

  const submitEdit = () => {
    if (!editing || !rules) return;
    const problem = problemWith(captured);
    setCaptureError(problem);
    if (problem || !captured) return;
    if (editing.shortcut && sameCombo(editing.shortcut.keyCombination, captured)) {
      setEditingCode(null);
      return;
    }
    save.mutate({ row: editing, combo: normalizeCombo(captured, rules) ?? captured });
  };

  const pending = catalog.isPending || shortcuts.isPending;
  const error = catalog.error ?? shortcuts.error;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Keyboard shortcuts"
        description="Keys students use to operate the exam and practice app."
      />

      {(pending || error) && (
        <ReadState
          pending={pending}
          error={error}
          retry={() => {
            void catalog.refetch();
            void shortcuts.refetch();
          }}
        />
      )}

      {!pending && !error && rules && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Each change is saved as soon as you confirm it.</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                <li>Every shortcut holds Ctrl, so it cannot clash with typing or with NVDA.</li>
                <li>Two actions cannot share the same keys.</li>
                <li>
                  Shortcuts cannot be changed while an exam session is running. The
                  save is refused; try again when the exam has finished.
                </li>
              </ul>
            </div>
          </div>

          {lastChanged && (
            <p className="text-sm text-muted-foreground tabular-nums">
              Last changed {formatDateTime(lastChanged)}
            </p>
          )}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border p-5">
              <Keyboard aria-hidden className="size-5" />
              <h2 className="text-lg font-bold">Exam actions</h2>
            </div>
            <Table containerLabel="Exam keyboard shortcuts table">
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>What it does</TableHead>
                  <TableHead>Shortcut</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Manage</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      The exam app has no configurable actions yet.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const { action, shortcut } = row;
                  return (
                    <TableRow key={action.code}>
                      <TableCell className="font-bold">{action.name}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {action.description ?? "No description"}
                      </TableCell>
                      <TableCell>
                        {shortcut?.keyCombination ? (
                          <KeyCombo combo={shortcut.keyCombination} />
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* The word and the icon shape carry the state, not colour. */}
                        {!shortcut ? (
                          <span className="text-muted-foreground">—</span>
                        ) : shortcut.isEnabled ? (
                          <span className="inline-flex items-center gap-1.5 font-bold">
                            <CircleCheck aria-hidden className="size-4" />
                            On
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-muted-foreground">
                            <CircleOff aria-hidden className="size-4" />
                            Off
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={busy}
                            aria-label={`${shortcut ? "Change" : "Set"} shortcut for ${action.name}`}
                            onClick={() => openEditor(row)}
                          >
                            {shortcut ? <Pencil aria-hidden /> : <Plus aria-hidden />}
                            {shortcut ? "Change" : "Set"}
                          </Button>
                          {shortcut && (
                            <>
                              <Button
                                variant="outline"
                                disabled={busy}
                                aria-label={`Turn ${shortcut.isEnabled ? "off" : "on"} shortcut for ${action.name}`}
                                onClick={() => toggle.mutate(shortcut)}
                              >
                                {shortcut.isEnabled ? "Turn off" : "Turn on"}
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busy}
                                aria-label={`Remove shortcut for ${action.name}`}
                                onClick={() => setRemovingCode(action.code)}
                              >
                                <Trash2 aria-hidden />
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          <ShortcutTester
            rules={rules}
            shortcuts={rows
              .filter((row) => !!row.shortcut?.keyCombination)
              .map((row) => ({
                actionCode: row.action.code,
                actionName: row.action.name,
                keyCombination: row.shortcut!.keyCombination,
                isEnabled: row.shortcut!.isEnabled,
              }))}
          />
        </>
      )}

      {rules && (
        <FormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditingCode(null)}
          title={editing ? `Shortcut for “${editing.action.name}”` : ""}
          description={
            editing?.shortcut?.keyCombination
              ? `Current shortcut: ${editing.shortcut.keyCombination}.`
              : "This action has no shortcut yet."
          }
          submitLabel="Save shortcut"
          pending={save.isPending}
          errors={[]}
          onSubmit={submitEdit}
        >
          <ShortcutCaptureField
            value={captured}
            onChange={(value) => {
              setCaptured(value);
              // Checked on every key press, so the admin tests a combination
              // before saving instead of finding out from a refused save.
              setCaptureError(value ? problemWith(value) : null);
            }}
            error={captureError}
            preview={
              captured && editing
                ? editing.shortcut && sameCombo(editing.shortcut.keyCombination, captured)
                  ? `${captured} is the current shortcut for “${editing.action.name}”.`
                  : `${captured} is free. Saving makes it trigger “${editing.action.name}”.`
                : null
            }
            rules={rules}
          />
        </FormDialog>
      )}

      <ConfirmAction
        open={!!removing?.shortcut}
        onOpenChange={(open) => !open && setRemovingCode(null)}
        title={`Remove the shortcut for “${removing?.action.name ?? ""}”?`}
        description={`${removing?.shortcut?.keyCombination ?? "This shortcut"} will no longer trigger this action in the exam app. You can set a new shortcut afterwards.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removing?.shortcut) remove.mutate(removing.shortcut);
          setRemovingCode(null);
        }}
      />
    </div>
  );
}

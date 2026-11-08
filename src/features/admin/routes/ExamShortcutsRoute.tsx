import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Keyboard, Lock, Pencil, RotateCcw, Save } from "lucide-react";
import {
  getShortcutConfig,
  saveShortcutConfig,
  type ShortcutBinding,
  type ShortcutConfig,
} from "@/api/adminSystem";
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
  validateCombo,
} from "../shortcuts/shortcutKeys";

export function KeyCombo({ combo }: { combo: string }) {
  const parts = comboParts(combo);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {/* Read as one phrase ("Alt+N"), not key by key. */}
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
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  error: string | null;
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
    const combo = comboFromEvent(event.nativeEvent);
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
        Focus the field and press the combination, for example Alt and N
        together. Press Backspace to clear it. Tab still moves to the next
        control.
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type Draft = Record<string, string>;

/** Exam keyboard shortcuts (FE: Huy · gestures: Duy · backend: Cường). */
export function ExamShortcutsRoute() {
  useRouteAnnouncer("Keyboard shortcuts · LearnAble Admin", "Keyboard shortcuts");
  const config = useQuery({
    queryKey: adminKeys.list("exam-shortcuts"),
    queryFn: getShortcutConfig,
  });
  useExpiredAdminSession(config.error);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<ShortcutBinding | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const data: ShortcutConfig | undefined = config.data;
  const locked = (data?.activeExamSessions ?? 0) > 0;
  const keysOf = (binding: ShortcutBinding) =>
    draft?.[binding.actionKey] ?? binding.keys;
  const changed = useMemo(
    () =>
      (data?.bindings ?? []).filter(
        (binding) =>
          draft?.[binding.actionKey] !== undefined &&
          normalizeCombo(draft[binding.actionKey]) !== normalizeCombo(binding.keys),
      ),
    [data, draft],
  );

  const save = useAdminWrite({
    resource: "exam-shortcuts",
    action: "Publish keyboard shortcuts",
    mutationFn: async () => {
      await saveShortcutConfig({
        version: data!.version,
        bindings: data!.bindings.map((binding) => ({
          actionKey: binding.actionKey,
          keys: normalizeCombo(keysOf(binding)) ?? binding.keys,
        })),
      });
    },
    onSuccess: () => {
      setConfirming(false);
      setDraft(null);
    },
  });

  const openEditor = (binding: ShortcutBinding) => {
    setEditing(binding);
    setCaptured(keysOf(binding));
    setCaptureError(null);
  };
  const applyEdit = () => {
    if (!editing || !data) return;
    const taken = new Map(
      data.bindings
        .filter((binding) => binding.actionKey !== editing.actionKey)
        .map((binding) => [normalizeCombo(keysOf(binding)) ?? "", binding.actionName]),
    );
    const problem = validateCombo(captured, taken);
    setCaptureError(problem);
    if (problem) return;
    setDraft((old) => ({ ...old, [editing.actionKey]: normalizeCombo(captured!)! }));
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Keyboard shortcuts"
        description="Keys students use to operate the exam and practice app. Every student gets the same set."
      >
        <Button
          variant="outline"
          disabled={!changed.length || save.isPending}
          onClick={() => setDraft(null)}
        >
          <RotateCcw aria-hidden />
          Discard changes
        </Button>
        <Button
          disabled={!changed.length || locked || save.isPending}
          onClick={() => setConfirming(true)}
        >
          <Save aria-hidden />
          Publish changes
        </Button>
      </PageHeading>

      {(config.isPending || config.error) && (
        <ReadState
          pending={config.isPending}
          error={config.error}
          retry={() => void config.refetch()}
        />
      )}

      {data && (
        <>
          {locked ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-warning-foreground/30 bg-warning p-4 text-warning-foreground"
            >
              <Lock aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-bold">Editing is locked while exams are running.</p>
                <p className="mt-1 text-sm">
                  {data.activeExamSessions} exam{" "}
                  {data.activeExamSessions === 1 ? "session is" : "sessions are"} in
                  progress. Changing keys now would break the exam those
                  students are taking. Try again when they have finished.
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              Publishing creates a new version. Students must download the new
              exam app before their next exam, and they are notified on the
              web and by email.
            </p>
          )}

          <p className="text-sm text-muted-foreground tabular-nums">
            Version {data.version} · last published {formatDateTime(data.updatedAt)}
            {data.updatedBy ? ` by ${data.updatedBy}` : ""}
          </p>

          {changed.length > 0 && (
            <p role="status" className="font-bold">
              {changed.length} unpublished{" "}
              {changed.length === 1 ? "change" : "changes"}.
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
                  <TableHead>
                    <span className="sr-only">Edit</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bindings.map((binding) => {
                  const keys = keysOf(binding);
                  const isChanged = changed.includes(binding);
                  return (
                    <TableRow key={binding.actionKey}>
                      <TableCell className="font-bold">{binding.actionName}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {binding.description ?? "No description"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <KeyCombo combo={keys} />
                          {isChanged && (
                            <span className="text-xs font-bold text-muted-foreground">
                              (was {binding.keys})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          disabled={locked}
                          aria-label={`Change shortcut for ${binding.actionName}`}
                          onClick={() => openEditor(binding)}
                        >
                          <Pencil aria-hidden />
                          Change
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `Shortcut for “${editing.actionName}”` : ""}
        description={
          editing ? `Current shortcut: ${keysOf(editing)}.` : ""
        }
        submitLabel="Use this shortcut"
        pending={false}
        errors={[]}
        onSubmit={applyEdit}
      >
        <ShortcutCaptureField
          value={captured}
          onChange={(value) => {
            setCaptured(value);
            setCaptureError(null);
          }}
          error={captureError}
        />
      </FormDialog>

      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title={`Publish version ${(data?.version ?? 0) + 1}?`}
        description={`${changed.length} ${changed.length === 1 ? "shortcut changes" : "shortcuts change"}. Students must download the new exam app before their next exam and will be notified on the web and by email.`}
        confirmLabel="Publish"
        onConfirm={() => save.mutate()}
      />
    </div>
  );
}

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleOff, History, Lock, TriangleAlert } from "lucide-react";
import {
  gestureSaveError,
  getGestureCatalog,
  getGestureConfig,
  getGestureEditStatus,
  getGestureHistory,
  preferredHands,
  saveGestureConfig,
  type GestureConfig,
  type GestureEditStatus,
  type GestureSettings,
  type PreferredHand,
} from "@/api/gestureConfig";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Separator } from "@/shared/ui/primitives/separator";
import { Switch } from "@/shared/ui/primitives/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
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
import { cn } from "@/lib/utils";
import { adminKeys, useAdminWrite, useExpiredAdminSession } from "../api/useAdminData";
import { ConfirmAction } from "../components/AdminSurfaces";
import { formatDateTime } from "../components/SystemSurfaces";
import {
  countChanges,
  findConflicts,
  gestureUsage,
  setRowEnabled,
  setRowGesture,
  setSettings,
  toBody,
  toDraft,
  unknownBindings,
  validateDraft,
  validateSettings,
  type Draft,
} from "../gestures/gestureModel";
import { GestureHistoryDialog } from "../gestures/GestureHistoryDialog";
import { useAdminName } from "../gestures/useAdminName";

const RESOURCE = "gesture-config";
const EDIT_STATUS_POLL_MS = 30_000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Radix Select can't hold an empty value, so "no gesture" gets its own token. */
const NO_GESTURE = "__none__";

function lockLines(status: GestureEditStatus): string[] {
  return status.blockingReasons.map((reason) => {
    if (reason === "OPEN_EXAM_SCHEDULES")
      return `${plural(status.openScheduleCount, "exam schedule is", "exam schedules are")} open.`;
    if (reason === "ACTIVE_ATTEMPTS")
      return `${plural(status.activeAttemptCount, "student is", "students are")} taking an exam.`;
    return reason;
  });
}

/** Confidence is shown as a percentage and stored as 0..1. */
const toPercent = (value: number) => (Number.isFinite(value) ? +(value * 100).toFixed(2) : "");
const fromPercent = (text: string) => (text.trim() === "" ? Number.NaN : +(Number(text) / 100).toFixed(6));
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const numberValue = (value: number) => (Number.isFinite(value) ? value : "");

function NumberField({
  label,
  help,
  error,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  help: string;
  error?: string;
  value: number | string;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (text: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 max-w-48"
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {help}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function RecognitionSettings({
  settings,
  disabled,
  onChange,
}: {
  settings: GestureSettings;
  disabled: boolean;
  onChange: (patch: Partial<GestureSettings>) => void;
}) {
  const errors = validateSettings(settings);
  const handId = useId();
  const enabledId = useId();
  const releaseId = useId();
  return (
    <section aria-labelledby={`${enabledId}-title`} className="space-y-4">
      <h2 id={`${enabledId}-title`} className="text-lg font-bold">
        Recognition settings
      </h2>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              id={enabledId}
              checked={settings.isEnabled}
              disabled={disabled}
              aria-describedby={`${enabledId}-help`}
              onCheckedChange={(checked) => onChange({ isEnabled: checked })}
            />
            <Label htmlFor={enabledId}>Gesture input for exams</Label>
          </div>
          <p id={`${enabledId}-help`} className="text-sm text-muted-foreground">
            When off, students use the keyboard only.
          </p>
        </div>

        <div className="space-y-2">
          <p id={handId} className="text-sm font-medium">
            Preferred hand
          </p>
          <RadioGroup
            aria-labelledby={handId}
            value={settings.preferredHand}
            disabled={disabled}
            onValueChange={(value) => onChange({ preferredHand: value as PreferredHand })}
            className="flex flex-wrap"
          >
            {preferredHands.map((hand) => (
              <div key={hand} className="flex min-h-11 items-center gap-3">
                <RadioGroupItem value={hand} id={`${handId}-${hand}`} />
                <Label htmlFor={`${handId}-${hand}`}>{hand}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <NumberField
            label="Confidence (%)"
            help="How sure the camera must be before a gesture counts, 0 to 100."
            error={errors.confidenceThreshold}
            value={toPercent(settings.confidenceThreshold)}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            onChange={(text) => onChange({ confidenceThreshold: fromPercent(text) })}
          />
          <NumberField
            label="Hold time (ms)"
            help="How long a gesture must be held before it counts, 0 to 10,000."
            error={errors.holdDurationMs}
            value={numberValue(settings.holdDurationMs)}
            min={0}
            max={10_000}
            step={100}
            disabled={disabled}
            onChange={(text) => onChange({ holdDurationMs: toNumber(text) })}
          />
          <NumberField
            label="Cool-down (ms)"
            help="Pause after a gesture before the next one counts, 0 to 60,000."
            error={errors.cooldownMs}
            value={numberValue(settings.cooldownMs)}
            min={0}
            max={60_000}
            step={100}
            disabled={disabled}
            onChange={(text) => onChange({ cooldownMs: toNumber(text) })}
          />
        </div>

        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id={releaseId}
            checked={settings.requireRelease}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ requireRelease: checked })}
          />
          <Label htmlFor={releaseId}>Require the hand to relax between gestures</Label>
        </div>
      </div>
    </section>
  );
}

/** The version in force and who saved it. */
function VersionLine({
  config,
  focusRef,
  onHistory,
}: {
  config: GestureConfig;
  focusRef: RefObject<HTMLDivElement | null>;
  onHistory: () => void;
}) {
  // The single-version response has no editor; the newest history entry does.
  const latest = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["history", 1, 1]),
    queryFn: () => getGestureHistory(1, 1),
    retry: false,
  });
  const entry = latest.data?.items.find((item) => item.version === config.version);
  const name = useAdminName(entry?.updatedBy);
  const by = name ? ` by ${name}` : "";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div ref={focusRef} tabIndex={-1} className="space-y-1 outline-none">
        <p className="text-sm font-medium text-muted-foreground">Current version</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-bold tabular-nums">Version {config.version}</p>
          <VersionBadge isEnabled={config.isEnabled} />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {config.updatedAt ? `Saved ${formatDateTime(config.updatedAt)}${by}` : "Not saved yet"}
        </p>
      </div>
      <Button variant="outline" onClick={onHistory}>
        <History aria-hidden />
        Version history
      </Button>
    </div>
  );
}

function VersionBadge({ isEnabled }: { isEnabled: boolean }) {
  return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
            isEnabled ? "border-primary" : "border-border text-muted-foreground",
          )}
        >
          {isEnabled ? <CircleCheck aria-hidden className="size-4" /> : <CircleOff aria-hidden className="size-4" />}
          Gesture input {isEnabled ? "on" : "off"}
        </span>
  );
}

type Editing = { base: GestureConfig; draft: Draft };

/** Exam hand gestures — FR-47 · FFCB-284 (backend FFCB-283). */
export function GestureConfigRoute() {
  useRouteAnnouncer("Hand gestures · LearnAble Admin", "Hand gestures");
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["catalog"]),
    queryFn: getGestureCatalog,
    staleTime: Infinity,
  });
  const config = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["current"]),
    queryFn: getGestureConfig,
  });
  const editStatus = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["edit-status"]),
    queryFn: getGestureEditStatus,
    refetchInterval: EDIT_STATUS_POLL_MS,
    refetchOnWindowFocus: true,
  });
  useExpiredAdminSession(catalog.error ?? config.error ?? editStatus.error);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveProblem, setSaveProblem] = useState<string | null>(null);
  const versionRef = useRef<HTMLDivElement>(null);

  // Start editing from the loaded version; follow a newer version only while
  // the admin has no unsaved changes, so their work is never thrown away.
  if (catalog.data && config.data) {
    const stale = editing && editing.base.version !== config.data.version;
    if (!editing || (stale && countChanges(editing.draft, editing.base) === 0)) {
      setEditing({ base: config.data, draft: toDraft(config.data, catalog.data) });
    }
  }

  const save = useAdminWrite<{ draft: Draft; eTag: string }, GestureConfig>({
    resource: RESOURCE,
    action: "Save hand gestures",
    mutationFn: ({ draft, eTag }) => saveGestureConfig(toBody(draft), eTag),
    onSuccess: (saved) => {
      queryClient.setQueryData(adminKeys.list(RESOURCE, ["current"]), saved);
      if (catalog.data) setEditing({ base: saved, draft: toDraft(saved, catalog.data) });
      setSaveProblem(null);
      requestAnimationFrame(() => versionRef.current?.focus());
    },
    onError: async (error) => {
      switch (gestureSaveError(error)) {
        case "locked":
          setSaveProblem("Saving was refused because an exam started. Your changes are kept; save again after it finishes.");
          void editStatus.refetch();
          break;
        case "stale": {
          const fresh = await config.refetch();
          setSaveProblem(
            `Another administrator saved version ${fresh.data?.version ?? "a newer version"}. Review your changes and save again.`,
          );
          break;
        }
        case "forbidden":
          setSaveProblem("Only system administrators can change gestures.");
          break;
        case "invalid":
          setSaveProblem(
            (error as { serverMessage?: string }).serverMessage ?? "The backend refused these gestures. Check the highlighted rows.",
          );
          break;
        default:
          setSaveProblem("The gestures could not be saved. Your changes are kept; try again.");
      }
    },
  });

  const pending = catalog.isPending || config.isPending || editStatus.isPending;
  const error = catalog.error ?? config.error ?? editStatus.error;

  const header = (actions?: ReactNode) => (
    <PageHeading
      title="Hand gestures"
      description="Gestures students can use instead of the keyboard in the exam app. Every student gets the same set."
    >
      {actions}
    </PageHeading>
  );

  if (pending || error || !editing || !catalog.data || !config.data || !editStatus.data) {
    return (
      <div className="space-y-6">
        {header()}
        <ReadState
          pending={pending || (!error && !editing)}
          error={error}
          retry={() => {
            void catalog.refetch();
            void config.refetch();
            void editStatus.refetch();
          }}
        />
      </div>
    );
  }

  const current = config.data;
  const { draft } = editing;
  const status = editStatus.data;
  const locked = !status.canEdit;
  const disabled = locked || save.isPending;
  const changes = countChanges(draft, current);
  const problems = validateDraft(draft);
  const conflicts = findConflicts(draft);
  const usage = gestureUsage(draft);
  const unknown = unknownBindings(current, catalog.data);
  const nextVersion = current.version + 1;
  const canSave = changes > 0 && problems.length === 0 && !disabled;

  const actionName = (code: string) => catalog.data.actions.find((a) => a.code === code)?.name ?? code;
  const gestureName = (code: string) => catalog.data.gestures.find((g) => g.code === code)?.name ?? code;
  const update = (next: Draft) => {
    setEditing({ ...editing, draft: next });
    setSaveProblem(null);
  };

  return (
    <div className="space-y-6">
      {header(
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={changes === 0 || save.isPending}
            onClick={() => {
              setEditing({ base: current, draft: toDraft(current, catalog.data) });
              setSaveProblem(null);
            }}
          >
            Discard changes
          </Button>
          <Button disabled={!canSave} onClick={() => setConfirming(true)}>
            Save as version {nextVersion}
          </Button>
        </div>,
      )}

      {locked && (
        <div role="status" className="flex items-start gap-3 rounded-xl border-2 border-foreground p-4">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Editing is locked while exams are in progress.</p>
            <ul className="mt-1 list-inside list-disc">
              {lockLines(status).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-muted-foreground">Try again after they finish.</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent>
          <VersionLine config={current} focusRef={versionRef} onHistory={() => setHistoryOpen(true)} />
        </CardContent>
      </Card>

      <p role="status" className="min-h-6 font-bold">
        {changes > 0 ? `${plural(changes, "unsaved change", "unsaved changes")}.` : ""}
      </p>

      {(saveProblem || (changes > 0 && problems.length > 0)) && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <ul className="space-y-1">
            {saveProblem && <li>{saveProblem}</li>}
            {changes > 0 && problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </div>
      )}

      {unknown.length > 0 && (
        <p className="rounded-xl border border-border p-4 text-sm">
          {plural(unknown.length, "saved assignment uses", "saved assignments use")} a gesture or action
          the exam app no longer supports. Saving a new version removes{" "}
          {unknown.length === 1 ? "it" : "them"}.
        </p>
      )}

      <RecognitionSettings
        settings={draft.settings}
        disabled={disabled}
        onChange={(patch) => update(setSettings(draft, patch))}
      />

      <Separator />

      <section className="min-w-0">
        <div className="pb-3">
          <h2 className="text-lg font-bold">Exam actions</h2>
        </div>
        <Table containerLabel="Exam gesture assignments">
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>What it does</TableHead>
              <TableHead>Gesture</TableHead>
              <TableHead>On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.rows.map((row) => {
              const code = row.action.code;
              const conflict = conflicts.get(code);
              const selectId = `gesture-${code}`;
              const describedBy = [
                row.gestureCode ? `${selectId}-how` : null,
                conflict ? `${selectId}-error` : null,
              ]
                .filter(Boolean)
                .join(" ");
              const selected = row.gestureCode
                ? catalog.data.gestures.find((g) => g.code === row.gestureCode)
                : null;
              return (
                <TableRow key={code}>
                  <TableCell><span className="font-bold">{row.action.name}</span></TableCell>
                  <TableCell className="max-w-80 whitespace-normal">
                    <span className="text-muted-foreground">{row.action.description ?? "No description"}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="max-w-80 space-y-1">
                      <Select
                        value={row.gestureCode ?? NO_GESTURE}
                        disabled={disabled}
                        onValueChange={(value) =>
                          update(setRowGesture(draft, code, value === NO_GESTURE ? null : value))
                        }
                      >
                        <SelectTrigger
                          id={selectId}
                          aria-label={`Gesture for ${row.action.name}`}
                          aria-invalid={!!conflict}
                          aria-describedby={describedBy || undefined}
                          className="w-full min-w-48"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NO_GESTURE}>No gesture</SelectItem>
                            {catalog.data.gestures.map((gesture) => {
                              const user = usage.get(gesture.code);
                              const usedElsewhere = user && user !== code;
                              return (
                                <SelectItem key={gesture.code} value={gesture.code}>
                                  {usedElsewhere ? `${gesture.name} — used by ${actionName(user)}` : gesture.name}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {selected?.description && (
                        <p id={`${selectId}-how`} className="text-sm text-muted-foreground">
                          {selected.description}
                        </p>
                      )}
                      {row.extraGestures.length > 0 && (
                        <p className="text-sm">
                          Also: {row.extraGestures.map((extra) => gestureName(extra.gestureCode)).join(", ")}
                        </p>
                      )}
                      {conflict && (
                        <p id={`${selectId}-error`} role="alert" className="text-sm font-bold text-destructive">
                          {gestureName(conflict.gestureCode)} is also assigned to{" "}
                          {actionName(conflict.otherActionCode)}. Each gesture can trigger only one action.
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-h-11 min-w-11 items-center justify-center">
                      <Switch
                        checked={row.gestureCode !== null && row.isEnabled}
                        disabled={disabled || row.gestureCode === null}
                        aria-label={`Use the gesture for ${row.action.name}`}
                        onCheckedChange={(checked) => update(setRowEnabled(draft, code, checked))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title={`Save version ${nextVersion}?`}
        description={`${plural(changes, "change", "changes")}. The exam app uses the new gestures from the next exam it starts. Exams already running are not affected.`}
        confirmLabel={`Save version ${nextVersion}`}
        pendingLabel="Saving…"
        pending={save.isPending}
        onConfirm={() => {
          setConfirming(false);
          save.mutate({ draft, eTag: current.eTag });
        }}
      />

      <GestureHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} catalog={catalog.data} />
    </div>
  );
}

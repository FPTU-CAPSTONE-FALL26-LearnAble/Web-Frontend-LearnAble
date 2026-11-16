import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Keyboard } from "lucide-react";
import {
  createShortcut,
  deleteShortcut,
  getShortcuts,
  getShortcutCatalog,
  updateShortcut,
  type Shortcut,
} from "@/api/shortcuts";
import { describeError } from "@/app/providers";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { toast } from "@/shared/ui/primitives/toast";

type ShortcutDraft = { keyCombination: string; isEnabled: boolean };

function ShortcutRow({
  code,
  name,
  description,
  shortcut,
  reserved,
}: {
  code: string;
  name: string;
  description?: string | null;
  shortcut?: Shortcut;
  reserved: Set<string>;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ShortcutDraft>({ keyCombination: shortcut?.keyCombination ?? "", isEnabled: shortcut?.isEnabled ?? true });
  useEffect(() => setDraft({ keyCombination: shortcut?.keyCombination ?? "", isEnabled: shortcut?.isEnabled ?? true }), [shortcut]);
  const save = useMutation({
    mutationFn: () => shortcut
      ? updateShortcut(shortcut.shortcutId, { actionCode: code, ...draft }, shortcut.eTag)
      : createShortcut({ actionCode: code, ...draft }),
    onSuccess: async () => {
      toast({ title: "Shortcut saved", description: `${name} now uses ${draft.keyCombination}.` });
      await queryClient.invalidateQueries({ queryKey: ["my-shortcuts"] });
    },
    onError: (error) => toast({ title: "The shortcut could not be saved", description: describeError(error), variant: "error" }),
  });
  const remove = useMutation({
    mutationFn: () => deleteShortcut(shortcut!.shortcutId, shortcut!.eTag),
    onSuccess: async () => {
      toast({ title: "Shortcut removed", description: `${name} uses the application default again.` });
      await queryClient.invalidateQueries({ queryKey: ["my-shortcuts"] });
    },
    onError: (error) => toast({ title: "The shortcut could not be removed", description: describeError(error), variant: "error" }),
  });
  const normalized = draft.keyCombination.trim().toLowerCase();
  const isReserved = [...reserved].some((value) => value.toLowerCase() === normalized);
  return (
    <li className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)_auto] lg:items-end">
      <div>
        <p className="font-semibold">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description || code}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`shortcut-${code}`}>Key combination</Label>
        <Input id={`shortcut-${code}`} value={draft.keyCombination} placeholder="Ctrl+Alt+N" onChange={(event) => setDraft((value) => ({ ...value, keyCombination: event.target.value }))} />
        {isReserved ? <p role="alert" className="text-sm text-destructive">This combination is reserved by the application.</p> : null}
        <div className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <Checkbox id={`shortcut-enabled-${code}`} checked={draft.isEnabled} onCheckedChange={(checked) => setDraft((value) => ({ ...value, isEnabled: checked === true }))} />
          <Label className="cursor-pointer" htmlFor={`shortcut-enabled-${code}`}>Enabled</Label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcut ? <Button variant="outline" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Removing…" : "Reset"}</Button> : null}
        <Button disabled={!draft.keyCombination.trim() || isReserved || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </li>
  );
}

/** Personal exam shortcuts backed by /me/shortcuts. */
export function PersonalShortcutsRoute() {
  const catalog = useQuery({ queryKey: ["my-shortcuts", "catalog"], queryFn: getShortcutCatalog });
  const shortcuts = useQuery({ queryKey: ["my-shortcuts"], queryFn: getShortcuts });
  const byAction = useMemo(() => new Map((shortcuts.data ?? []).map((shortcut) => [shortcut.actionCode, shortcut])), [shortcuts.data]);
  const reserved = useMemo(() => new Set(catalog.data?.reservedCombinations ?? []), [catalog.data]);
  return (
    <main className="space-y-6">
      <header className="flex items-start gap-3 border-b border-border pb-5">
        <Keyboard className="mt-1 size-7 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Personal keyboard shortcuts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose your own exam controls. Changes apply only to your account.</p>
        </div>
      </header>
      {catalog.data?.requiresControlAltOrMeta ? <p className="rounded-xl border border-warning-foreground/50 bg-warning/40 p-4 text-sm text-warning-foreground">Each custom shortcut must include Ctrl, Alt or Meta. Browser and operating-system shortcuts may still take priority.</p> : null}
      {catalog.isPending || shortcuts.isPending ? <div role="status" aria-label="Loading shortcuts" className="h-40 animate-pulse rounded-xl bg-muted" /> : null}
      {catalog.isError || shortcuts.isError ? <div role="alert" className="rounded-xl border border-destructive p-5 text-destructive">The shortcuts could not be loaded. {describeError(catalog.error ?? shortcuts.error)}</div> : null}
      <ul className="space-y-3">
        {(catalog.data?.actions ?? []).flatMap((action) => action.code ? [<ShortcutRow key={action.code} code={action.code} name={action.name ?? action.code} description={action.description} shortcut={byAction.get(action.code)} reserved={reserved} />] : [])}
      </ul>
      {catalog.isSuccess && !catalog.data.actions.length ? <p className="rounded-xl border border-border p-8 text-center text-muted-foreground">The Backend has not published any customizable shortcut actions.</p> : null}
    </main>
  );
}

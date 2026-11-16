import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getGestureConfigVersion,
  getGestureHistory,
  type GestureCatalog,
  type GestureVersion,
} from "@/api/gestureConfig";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { ReadState } from "@/components/workbench/Workbench";
import { adminKeys } from "../api/useAdminData";
import { formatDateTime } from "../components/SystemSurfaces";
import { useAdminName } from "./useAdminName";

const RESOURCE = "gesture-config";
const PAGE_SIZE = 20;

function SavedBy({ userId }: { userId: string | null }) {
  const name = useAdminName(userId);
  if (!userId) return <span className="text-muted-foreground">System default</span>;
  return <>{name ?? "Loading…"}</>;
}

/** Read-only "Action → Gesture" list for one saved version. */
function VersionDetail({ version, catalog }: { version: number; catalog: GestureCatalog }) {
  const detail = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["version", version]),
    queryFn: () => getGestureConfigVersion(version),
  });
  const actionName = new Map(catalog.actions.map((a) => [a.code, a.name]));
  const gestureName = new Map(catalog.gestures.map((g) => [g.code, g.name]));

  if (detail.isPending || detail.error) {
    return <ReadState pending={detail.isPending} error={detail.error} retry={() => void detail.refetch()} />;
  }
  const config = detail.data;
  const bindings = [...config.bindings].sort((a, b) => {
    const order = catalog.actions.findIndex((x) => x.code === a.actionCode) - catalog.actions.findIndex((x) => x.code === b.actionCode);
    return order !== 0 ? order : a.gestureCode.localeCompare(b.gestureCode);
  });
  return (
    <section aria-labelledby={`gesture-version-${version}`} className="space-y-3 rounded-xl border border-border p-4">
      <h3 id={`gesture-version-${version}`} className="font-bold">
        Version {version} · gesture input {config.isEnabled ? "on" : "off"}
      </h3>
      {bindings.length === 0 ? (
        <p className="text-muted-foreground">No gestures were assigned in this version.</p>
      ) : (
        <ul className="space-y-1">
          {bindings.map((binding) => (
            <li key={`${binding.gestureCode}-${binding.actionCode}`}>
              {actionName.get(binding.actionCode) ?? binding.actionCode}
              {": "}
              <span className="font-bold">{gestureName.get(binding.gestureCode) ?? binding.gestureCode}</span>
              {!binding.isEnabled && <span className="text-muted-foreground"> (off)</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Version history of the system-wide gesture configuration (AC5). */
export function GestureHistoryDialog({
  open,
  onOpenChange,
  catalog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: GestureCatalog;
}) {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const history = useQuery({
    queryKey: adminKeys.list(RESOURCE, ["history", page, PAGE_SIZE]),
    queryFn: () => getGestureHistory(page, PAGE_SIZE),
    enabled: open,
  });

  const close = (next: boolean) => {
    if (!next) {
      setViewing(null);
      setPage(1);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      {open ? (
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gesture version history</DialogTitle>
            <DialogDescription>Every save creates a new version. Newest first.</DialogDescription>
          </DialogHeader>

          {(history.isPending || history.error) && (
            <ReadState pending={history.isPending} error={history.error} retry={() => void history.refetch()} />
          )}

          {history.data && (
            <div className="space-y-4">
              <Table containerLabel="Gesture versions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Saved</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Gesture input</TableHead>
                    <TableHead>Gestures</TableHead>
                    <TableHead>
                      <span className="sr-only">Details</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.items.map((item: GestureVersion) => (
                    <TableRow key={item.version}>
                      <TableCell><span className="font-bold tabular-nums">{item.version}</span></TableCell>
                      <TableCell><span className="tabular-nums">{formatDateTime(item.updatedAt)}</span></TableCell>
                      <TableCell>
                        <SavedBy userId={item.updatedBy} />
                      </TableCell>
                      <TableCell>{item.isEnabled ? "On" : "Off"}</TableCell>
                      <TableCell><span className="tabular-nums">{item.bindingCount}</span></TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          aria-label={`View version ${item.version}`}
                          aria-pressed={viewing === item.version}
                          onClick={() => setViewing(viewing === item.version ? null : item.version)}
                        >
                          {viewing === item.version ? "Hide" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <nav aria-label="History pages" className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={!history.data.hasPreviousPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous page
                </Button>
                <p className="tabular-nums" aria-live="polite">
                  Page {history.data.pageNumber} of {Math.max(1, history.data.totalPages)}
                </p>
                <Button
                  variant="outline"
                  disabled={!history.data.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next page
                </Button>
              </nav>

              {viewing !== null && <VersionDetail version={viewing} catalog={catalog} />}
            </div>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

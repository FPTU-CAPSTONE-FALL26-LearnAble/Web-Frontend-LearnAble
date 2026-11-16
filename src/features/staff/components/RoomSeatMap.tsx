import { Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { RoomSeat } from "@/api/admin";
import { plural } from "@/components/workbench/dashboardTime";
import { ScrollRegion } from "@/components/workbench/Workbench";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import {
  autoSeatCode,
  cellKey,
  cellsInColumn,
  cellsInRow,
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  emptyKeys,
  gridSize,
  keepInside,
  lastColumnIsEmpty,
  lastRowIsEmpty,
  MAX_COLUMNS,
  MAX_ROWS,
  parseCellKey,
  planSeats,
  rowLabel,
  seatsByCell,
  splitSelection,
  toggleKeys,
  type SeatPlan,
} from "../seatMap";

export type SeatCreateReport = { created: string[]; failed: Array<{ key: string; message: string }> };
export type SeatDeleteReport = { deleted: string[]; failed: Array<{ key: string; message: string }> };

type RoomSeatMapProps = {
  seats: RoomSeat[];
  onCreate: (plans: SeatPlan[]) => Promise<SeatCreateReport>;
  onDelete: (seats: RoomSeat[]) => Promise<SeatDeleteReport>;
  onEditSeat: (seat: RoomSeat) => void;
};

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const cell = cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 text-center text-sm transition-colors disabled:opacity-60", focusRing);
const emptyCell = "border-dashed border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/5";
const pickedCell = "border-primary bg-primary/10 font-semibold text-foreground";
const freeSeat = "border-success-border bg-success text-success-foreground hover:brightness-95";
const offSeat = "border-border bg-muted text-muted-foreground hover:bg-accent";
const pickedSeat = "border-destructive ring-2 ring-destructive/40";
const headerButton = cn("min-h-11 w-full rounded-md px-1 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground", focusRing);

function equipmentText(seat: RoomSeat) {
  return [seat.hasComputer && "computer", seat.hasCamera && "camera"].filter(Boolean).join(" and ");
}

/**
 * The seats of one exam room drawn as the room itself: rows across, columns deep.
 * Any cell can be picked: empty ones to create seats, seats that exist to edit or delete them.
 * Clicking a picked cell again lets it go.
 */
export function RoomSeatMap({ seats, onCreate, onDelete, onEditSeat }: RoomSeatMapProps) {
  const [size, setSize] = useState(() => gridSize(seats));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [failures, setFailures] = useState<{ action: "created" | "deleted"; items: Array<{ key: string; message: string }> }>({ action: "created", items: [] });
  const occupied = useMemo(() => seatsByCell(seats), [seats]);
  const { rows, columns } = size;
  const { newKeys, seats: pickedSeats } = useMemo(() => splitSelection(selected, occupied), [selected, occupied]);

  const allEmpty = useMemo(
    () => emptyKeys(Array.from({ length: rows }, (_, index) => cellsInRow(index + 1, columns)).flat(), occupied),
    [rows, columns, occupied],
  );
  const pick = (keys: string[]) => setSelected((current) => toggleKeys(current, emptyKeys(keys, occupied)));
  const toggleCell = (key: string) => {
    setConfirmingDelete(false);
    setSelected((current) => toggleKeys(current, [key]));
  };
  const resize = (next: { rows: number; columns: number }) => {
    setSize(next);
    setSelected((current) => keepInside(current, next.rows, next.columns));
  };
  const clear = () => {
    setConfirmingDelete(false);
    setSelected(new Set());
  };

  const run = async (action: "created" | "deleted", work: () => Promise<{ done: string[]; failed: Array<{ key: string; message: string }> }>) => {
    setBusy(true);
    setConfirmingDelete(false);
    setFailures({ action, items: [] });
    try {
      const report = await work();
      setSelected((current) => new Set([...current].filter((key) => !report.done.includes(key))));
      setFailures({ action, items: report.failed });
    } catch {
      setFailures({ action, items: [{ key: "", message: `The seats could not be ${action}. Try again.` }] });
    } finally {
      setBusy(false);
    }
  };
  const create = () => run("created", async () => {
    const report = await onCreate(planSeats(newKeys));
    return { done: report.created, failed: report.failed };
  });
  const remove = () => run("deleted", async () => {
    const report = await onDelete(pickedSeats);
    return { done: report.deleted, failed: report.failed };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm tabular-nums text-muted-foreground">
          {rows} rows × {columns} columns · {plural(seats.length, "seat")} · {selected.size} selected
        </p>
        <div className="flex flex-wrap gap-2">
          {rows < MAX_ROWS ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => resize({ rows: rows + 1, columns })}>
              <Plus aria-hidden />
              Add row
            </Button>
          ) : null}
          {columns < MAX_COLUMNS ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => resize({ rows, columns: columns + 1 })}>
              <Plus aria-hidden />
              Add column
            </Button>
          ) : null}
          {rows > DEFAULT_ROWS && lastRowIsEmpty(rows, occupied) ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => resize({ rows: rows - 1, columns })}>
              Remove last row
            </Button>
          ) : null}
          {columns > DEFAULT_COLUMNS && lastColumnIsEmpty(columns, occupied) ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => resize({ rows, columns: columns - 1 })}>
              Remove last column
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollRegion label="Seat map" className="overflow-x-auto pb-2">
        <div className="grid gap-2" style={{ gridTemplateColumns: `3rem repeat(${columns}, minmax(4.5rem, 1fr))`, minWidth: `${3 + columns * 5}rem` }}>
          <div aria-hidden />
          {Array.from({ length: columns }, (_, index) => {
            const column = index + 1;
            const free = emptyKeys(cellsInColumn(column, rows), occupied);
            return (
              <div key={column} className="text-center">
                {free.length ? (
                  <button type="button" className={headerButton} disabled={busy} aria-label={`Select every empty cell in column ${column}`} onClick={() => pick(cellsInColumn(column, rows))}>
                    {column}
                  </button>
                ) : (
                  <span className="grid min-h-11 place-items-center text-sm font-semibold text-muted-foreground">{column}</span>
                )}
              </div>
            );
          })}
          {Array.from({ length: rows }, (_, rowIndex) => {
            const row = rowIndex + 1;
            const label = rowLabel(row);
            const free = emptyKeys(cellsInRow(row, columns), occupied);
            return (
              <div key={row} className="contents">
                {free.length ? (
                  <button type="button" className={headerButton} disabled={busy} aria-label={`Select every empty cell in row ${label}`} onClick={() => pick(cellsInRow(row, columns))}>
                    {label}
                  </button>
                ) : (
                  <span className="grid min-h-11 place-items-center text-sm font-semibold text-muted-foreground">{label}</span>
                )}
                {Array.from({ length: columns }, (_, columnIndex) => {
                  const column = columnIndex + 1;
                  const key = cellKey(row, column);
                  const seat = occupied.get(key);
                  if (seat) {
                    const code = seat.seatCode ?? autoSeatCode(row, column);
                    const equipped = equipmentText(seat);
                    const ticked = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={busy}
                        aria-pressed={ticked}
                        className={cn(cell, seat.isAvailable ? freeSeat : offSeat, ticked && pickedSeat)}
                        aria-label={`Seat ${code}: row ${label}, column ${column}, ${seat.isAvailable ? "available" : "unavailable"}${equipped ? `, ${equipped}` : ""}${ticked ? ", selected" : ""}`}
                        onClick={() => toggleCell(key)}
                      >
                        {ticked ? <Check aria-hidden className="absolute right-1 top-1 size-3.5" /> : null}
                        <span className="font-semibold">{code}</span>
                        {!seat.isAvailable ? (
                          <span aria-hidden className="text-xs">
                            Off
                          </span>
                        ) : null}
                      </button>
                    );
                  }
                  const picked = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={busy}
                      aria-pressed={picked}
                      className={cn(cell, picked ? pickedCell : emptyCell)}
                      aria-label={picked ? `Row ${label}, column ${column}: new seat selected` : `Row ${label}, column ${column}: no seat, select to add one`}
                      onClick={() => toggleCell(key)}
                    >
                      {picked ? (
                        <>
                          <Check aria-hidden className="size-4" />
                          <span aria-hidden className="text-xs">
                            {autoSeatCode(row, column)}
                          </span>
                        </>
                      ) : (
                        <Plus aria-hidden className="size-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollRegion>

      <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border border-success-border bg-success" />
          Seat, available
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border border-border bg-muted" />
          Seat, unavailable (marked Off)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border border-primary bg-primary/10" />
          New seat, selected
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border border-destructive bg-success ring-2 ring-destructive/40" />
          Seat, selected (tick mark)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border border-dashed border-border" />
          No seat yet
        </li>
      </ul>

      {failures.items.length ? (
        <div role="alert" className="space-y-1 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">
            {failures.items.length === 1 ? "1 seat" : `${failures.items.length} seats`} could not be {failures.action}:
          </p>
          <ul className="list-disc pl-5">
            {failures.items.map((failure) => {
              const { row, column } = parseCellKey(failure.key);
              return (
                <li key={failure.key || failure.message}>
                  {failure.key ? `Seat ${occupied.get(failure.key)?.seatCode ?? autoSeatCode(row, column)}: ` : ""}
                  {failure.message}
                </li>
              );
            })}
          </ul>
          <p>They stay selected, so you can try again.</p>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">New seats are named by position, for example A1 for row A, column 1. You can change a seat&apos;s code afterwards.</p>

      {/* Stays in view while cells are picked, so creating never needs a scroll back down. */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-border bg-popover py-3">
        {confirmingDelete ? (
          <p className="text-sm font-medium text-destructive">Delete {plural(pickedSeats.length, "seat")} from this room? This cannot be undone.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {selected.size
              ? [newKeys.length ? `${plural(newKeys.length, "new seat")} ready to create` : "", pickedSeats.length ? `${plural(pickedSeats.length, "seat")} selected` : ""].filter(Boolean).join(" · ") + "."
              : "Click empty cells to add seats, or click seats to edit or delete them."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {confirmingDelete ? (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingDelete(false)}>
                Keep {pickedSeats.length === 1 ? "seat" : "seats"}
              </Button>
              <Button type="button" variant="destructive" aria-busy={busy} disabled={busy} onClick={() => void remove()}>
                {busy ? "Deleting…" : `Yes, delete ${plural(pickedSeats.length, "seat")}`}
              </Button>
            </>
          ) : selected.size ? (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={clear}>
                Clear selection
              </Button>
              {pickedSeats.length === 1 && !newKeys.length ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => onEditSeat(pickedSeats[0])}>
                  Edit seat {pickedSeats[0].seatCode}
                </Button>
              ) : null}
              {pickedSeats.length ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingDelete(true)}>
                  Delete {plural(pickedSeats.length, "seat")}
                </Button>
              ) : null}
              {newKeys.length ? (
                <Button type="button" aria-busy={busy} disabled={busy} onClick={() => void create()}>
                  {busy && failures.action === "created" ? "Creating…" : `Create ${plural(newKeys.length, "seat")}`}
                </Button>
              ) : null}
            </>
          ) : allEmpty.length ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(new Set(allEmpty))}>
              Select all empty cells
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

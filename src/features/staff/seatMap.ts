import type { RoomSeat, RoomSeatBody } from "@/api/admin";

/** A new room is drawn as 7 rows by 4 columns until seats or added rows and columns say otherwise. */
export const DEFAULT_ROWS = 7;
export const DEFAULT_COLUMNS = 4;
/** A sanity limit for the editor, far above any real exam room. */
export const MAX_ROWS = 30;
export const MAX_COLUMNS = 30;

export type Cell = { row: number; column: number };
export type SeatPosition = Pick<RoomSeat, "rowNumber" | "columnNumber">;

export const cellKey = (row: number, column: number) => `${row}-${column}`;

export function parseCellKey(key: string): Cell {
  const [row, column] = key.split("-").map(Number);
  return { row, column };
}

/** The grid always shows at least the default size, and grows to hold every seat that exists. */
export function gridSize(seats: SeatPosition[]) {
  return {
    rows: Math.max(DEFAULT_ROWS, ...seats.map((seat) => seat.rowNumber)),
    columns: Math.max(DEFAULT_COLUMNS, ...seats.map((seat) => seat.columnNumber)),
  };
}

/** Spreadsheet-style row names: 1 is A, 26 is Z, 27 is AA. */
export function rowLabel(row: number) {
  let label = "";
  for (let value = row; value > 0; value = Math.floor((value - 1) / 26)) {
    label = String.fromCharCode(65 + ((value - 1) % 26)) + label;
  }
  return label;
}

/** A seat named by where it sits, for example A1 for the first seat of the first row. */
export const autoSeatCode = (row: number, column: number) => `${rowLabel(row)}${column}`;

export function seatsByCell(seats: RoomSeat[]) {
  return new Map(seats.map((seat) => [cellKey(seat.rowNumber, seat.columnNumber), seat]));
}

export const cellsInRow = (row: number, columns: number) => Array.from({ length: columns }, (_, index) => cellKey(row, index + 1));
export const cellsInColumn = (column: number, rows: number) => Array.from({ length: rows }, (_, index) => cellKey(index + 1, column));

export function emptyKeys(keys: string[], occupied: ReadonlyMap<string, unknown>) {
  return keys.filter((key) => !occupied.has(key));
}

/** Selects every key, or clears them all when they were all selected already. */
export function toggleKeys(selected: ReadonlySet<string>, keys: string[]) {
  const next = new Set(selected);
  const allSelected = keys.length > 0 && keys.every((key) => next.has(key));
  keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

export const lastRowIsEmpty = (rows: number, occupied: ReadonlyMap<string, unknown>) => cellsInRow(rows, MAX_COLUMNS).every((key) => !occupied.has(key));
export const lastColumnIsEmpty = (columns: number, occupied: ReadonlyMap<string, unknown>) => cellsInColumn(columns, MAX_ROWS).every((key) => !occupied.has(key));

/** Drops selected cells that no longer exist after the grid shrinks. */
export function keepInside(selected: ReadonlySet<string>, rows: number, columns: number) {
  return new Set([...selected].filter((key) => {
    const { row, column } = parseCellKey(key);
    return row <= rows && column <= columns;
  }));
}

export type SeatPlan = { key: string; body: RoomSeatBody };

/** Every seat in an exam room has a computer and a camera, so new seats always do. */
export function planSeats(keys: Iterable<string>): SeatPlan[] {
  return [...keys]
    .map((key) => ({ key, ...parseCellKey(key) }))
    .sort((a, b) => a.row - b.row || a.column - b.column)
    .map(({ key, row, column }) => ({
      key,
      body: {
        seatCode: autoSeatCode(row, column),
        rowNumber: row,
        columnNumber: column,
        isAvailable: true,
        hasComputer: true,
        hasCamera: true,
        notes: null,
      },
    }));
}

export type CreateResult = { created: string[]; failed: Array<{ key: string; error: unknown }> };
export type DeleteResult = { deleted: string[]; failed: Array<{ key: string; error: unknown }> };

type Task = { key: string; run: () => Promise<void> };

/**
 * The Backend works on one seat per request, so seats are sent a few at a time.
 * Every task is attempted: a failure on one never stops the others, and is reported with its cell.
 */
async function runBatch(tasks: Task[], concurrency: number) {
  const done: string[] = [];
  const failed: Array<{ key: string; error: unknown }> = [];
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      try {
        await task.run();
        done.push(task.key);
      } catch (error) {
        failed.push({ key: task.key, error });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  const order = new Map(tasks.map((task, index) => [task.key, index]));
  done.sort((a, b) => order.get(a)! - order.get(b)!);
  failed.sort((a, b) => order.get(a.key)! - order.get(b.key)!);
  return { done, failed };
}

export async function createSeats(plans: SeatPlan[], create: (body: RoomSeatBody) => Promise<void>, concurrency = 4): Promise<CreateResult> {
  const { done, failed } = await runBatch(plans.map((plan) => ({ key: plan.key, run: () => create(plan.body) })), concurrency);
  return { created: done, failed };
}

export async function deleteSeats(seats: RoomSeat[], remove: (seat: RoomSeat) => Promise<void>, concurrency = 4): Promise<DeleteResult> {
  const tasks = seats.map((seat) => ({ key: cellKey(seat.rowNumber, seat.columnNumber), run: () => remove(seat) }));
  const { done, failed } = await runBatch(tasks, concurrency);
  return { deleted: done, failed };
}

/** The picked cells split by what can be done with them: empty ones can be created, seats can be edited or deleted. */
export function splitSelection(selected: ReadonlySet<string>, occupied: ReadonlyMap<string, RoomSeat>) {
  const keys = [...selected];
  return {
    newKeys: keys.filter((key) => !occupied.has(key)),
    seats: keys.flatMap((key) => occupied.get(key) ?? []),
  };
}

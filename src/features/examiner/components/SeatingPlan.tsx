import { useState } from "react";
import { Camera, Monitor } from "lucide-react";
import type { BulkExamSchedulePlan } from "@/api/exams";

type PlanRoom = BulkExamSchedulePlan["rooms"][number];
type Assigned = PlanRoom["students"][number];

/** A seat of a room as the seat list gives it. */
export type SeatInfo = {
  seatId: string;
  seatCode: string | null;
  rowNumber: number;
  columnNumber: number;
  isAvailable: boolean;
  hasComputer?: boolean;
  hasCamera?: boolean;
};

type Cell = SeatInfo & { student?: Assigned };

/** The seats to draw: every seat of the room when its seat list is known, otherwise only the seats given out. */
export function buildSeatGrid(room: PlanRoom, seats?: SeatInfo[]) {
  const assigned = new Map(room.students.map((student) => [student.seatId, student]));
  const source: SeatInfo[] = seats?.length
    ? seats
    : room.students.map((student) => ({ seatId: student.seatId, seatCode: student.seatCode ?? null, rowNumber: student.rowNumber, columnNumber: student.columnNumber, isAvailable: true }));
  const cells: Cell[] = source.map((seat) => ({ ...seat, student: assigned.get(seat.seatId) }));
  const rows = cells.map((cell) => cell.rowNumber);
  const columns = cells.map((cell) => cell.columnNumber);
  return {
    cells,
    firstRow: rows.length ? Math.min(...rows) : 1,
    firstColumn: columns.length ? Math.min(...columns) : 1,
    rowCount: rows.length ? Math.max(...rows) - Math.min(...rows) + 1 : 0,
    columnCount: columns.length ? Math.max(...columns) - Math.min(...columns) + 1 : 0,
    free: cells.filter((cell) => cell.isAvailable && !cell.student).length,
    blocked: cells.filter((cell) => !cell.isAvailable).length,
    knowsAllSeats: Boolean(seats?.length),
  };
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
const shortName = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).join(" ");

/**
 * Where each student sits in each room, drawn by row and column. Shown once the allocation check is
 * done, so the examiner can see the room before the schedules are created.
 */
export function SeatingPlan({ rooms, seatsByRoom, studentName, roomName }: {
  rooms: PlanRoom[];
  seatsByRoom: Record<string, SeatInfo[] | undefined>;
  studentName: (student: Assigned) => string;
  roomName: (room: PlanRoom) => string;
}) {
  const [chosen, setChosen] = useState(rooms[0]?.roomId ?? "");
  const room = rooms.find((item) => item.roomId === chosen) ?? rooms[0];
  if (!room) return null;
  const grid = buildSeatGrid(room, seatsByRoom[room.roomId]);
  const assigned = [...room.students].sort((a, b) => a.rowNumber - b.rowNumber || a.columnNumber - b.columnNumber);

  return (
    <section aria-label="Seating plan" className="space-y-4 border-t border-border pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Seating plan</h3>
          <p className="text-sm text-muted-foreground">
            {room.students.length} student{room.students.length === 1 ? "" : "s"} seated
            {grid.knowsAllSeats ? ` · ${grid.free} free seat${grid.free === 1 ? "" : "s"}${grid.blocked ? ` · ${grid.blocked} not usable` : ""}` : ""}
          </p>
        </div>
        {rooms.length > 1 ? (
          <div role="group" aria-label="Choose a room" className="flex flex-wrap gap-2">
            {rooms.map((item) => (
              <button
                key={item.roomId}
                type="button"
                aria-pressed={item.roomId === room.roomId}
                onClick={() => setChosen(item.roomId)}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition-colors ${item.roomId === room.roomId ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
              >
                {item.roomCode ?? roomName(item)}
              </button>
            ))}
          </div>
        ) : <p className="font-semibold">{roomName(room)}</p>}
      </header>

      {grid.cells.length ? (
        <>
          <ul aria-label={`Seats of ${roomName(room)}`} className="grid gap-2 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${grid.columnCount}, minmax(4.5rem, 1fr))` }}>
            {grid.cells.map((cell) => {
              const name = cell.student ? studentName(cell.student) : "";
              const state = cell.student ? "taken" : cell.isAvailable ? "free" : "blocked";
              const label = `Seat ${cell.seatCode ?? `row ${cell.rowNumber}, column ${cell.columnNumber}`}, ${cell.student ? name : state === "free" ? "free" : "not usable"}`;
              return (
                <li
                  key={cell.seatId}
                  aria-label={label}
                  title={label}
                  style={{ gridRow: cell.rowNumber - grid.firstRow + 1, gridColumn: cell.columnNumber - grid.firstColumn + 1 }}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center text-xs ${state === "taken" ? "border-success-border bg-success text-success-foreground" : state === "free" ? "border-border bg-background" : "border-dashed border-border bg-muted text-muted-foreground"}`}
                >
                  <span className="font-bold">{cell.seatCode ?? `${cell.rowNumber}-${cell.columnNumber}`}</span>
                  {state === "taken" ? <span className="w-full truncate font-medium">{shortName(name) || initials(name)}</span> : <span>{state === "free" ? "Free" : "Not usable"}</span>}
                  {state !== "blocked" && (cell.hasComputer || cell.hasCamera) ? (
                    <span aria-hidden className="mt-0.5 flex gap-1 opacity-70">
                      {cell.hasComputer ? <Monitor className="size-3" /> : null}
                      {cell.hasCamera ? <Camera className="size-3" /> : null}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <ul aria-label="Legend" className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><span aria-hidden className="size-3 rounded border border-success-border bg-success" />Seated</li>
            <li className="flex items-center gap-2"><span aria-hidden className="size-3 rounded border border-border bg-background" />Free</li>
            <li className="flex items-center gap-2"><span aria-hidden className="size-3 rounded border border-dashed border-border bg-muted" />Not usable</li>
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No seats have been given out in this room.</p>
      )}

      {assigned.length ? (
        <details className="rounded-xl border border-border">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold">Show as a list</summary>
          <table className="w-full text-sm">
            <caption className="sr-only">Seat of each student in {roomName(room)}</caption>
            <thead><tr className="border-t border-border text-left text-muted-foreground"><th scope="col" className="px-4 py-2 font-medium">Seat</th><th scope="col" className="px-4 py-2 font-medium">Student</th></tr></thead>
            <tbody>
              {assigned.map((student) => (
                <tr key={student.studentId} className="border-t border-border">
                  <td className="px-4 py-2 font-semibold">{student.seatCode ?? `${student.rowNumber}-${student.columnNumber}`}</td>
                  <td className="px-4 py-2">{studentName(student)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </section>
  );
}

import { describe, expect, it, vi } from "vitest";
import type { RoomSeat } from "@/api/admin";
import { autoSeatCode, cellKey, cellsInColumn, cellsInRow, createSeats, deleteSeats, emptyKeys, gridSize, keepInside, lastColumnIsEmpty, lastRowIsEmpty, parseCellKey, planSeats, rowLabel, seatsByCell, splitSelection, toggleKeys } from "./seatMap";

const seat = (rowNumber: number, columnNumber: number, seatCode = `S${rowNumber}${columnNumber}`) => ({ seatId: `id-${rowNumber}-${columnNumber}`, rowNumber, columnNumber, seatCode }) as RoomSeat;

describe("grid size", () => {
  it("starts at 7 rows by 4 columns", () => {
    expect(gridSize([])).toEqual({ rows: 7, columns: 4 });
  });

  it("grows to hold every seat that exists, and never shrinks below the default", () => {
    expect(gridSize([seat(9, 3), seat(2, 6)])).toEqual({ rows: 9, columns: 6 });
    expect(gridSize([seat(1, 1)])).toEqual({ rows: 7, columns: 4 });
  });
});

describe("naming", () => {
  it("names rows like a spreadsheet", () => {
    expect([1, 2, 26, 27, 28, 52, 53].map(rowLabel)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
  });

  it("names a seat by its position", () => {
    expect(autoSeatCode(1, 1)).toBe("A1");
    expect(autoSeatCode(4, 7)).toBe("D7");
    expect(autoSeatCode(27, 12)).toBe("AA12");
  });

  it("round-trips a cell key", () => {
    expect(parseCellKey(cellKey(3, 12))).toEqual({ row: 3, column: 12 });
  });
});

describe("cells", () => {
  it("lists a row and a column in order", () => {
    expect(cellsInRow(2, 3)).toEqual(["2-1", "2-2", "2-3"]);
    expect(cellsInColumn(5, 3)).toEqual(["1-5", "2-5", "3-5"]);
  });

  it("finds the seats by cell and the cells that are still empty", () => {
    const occupied = seatsByCell([seat(1, 1), seat(1, 3)]);
    expect(occupied.get("1-3")?.seatCode).toBe("S13");
    expect(emptyKeys(cellsInRow(1, 4), occupied)).toEqual(["1-2", "1-4"]);
  });

  it("toggles a group: selects all of them, or clears them when all were selected", () => {
    const keys = ["1-1", "1-2"];
    expect([...toggleKeys(new Set(["1-1"]), keys)].sort()).toEqual(["1-1", "1-2"]);
    expect([...toggleKeys(new Set(["1-1", "1-2", "2-1"]), keys)]).toEqual(["2-1"]);
    expect(toggleKeys(new Set(["1-1"]), []).size).toBe(1);
  });

  it("only lets an empty last row or column be removed", () => {
    const occupied = seatsByCell([seat(2, 3)]);
    expect(lastRowIsEmpty(7, occupied)).toBe(true);
    expect(lastRowIsEmpty(2, occupied)).toBe(false);
    expect(lastColumnIsEmpty(4, occupied)).toBe(true);
    expect(lastColumnIsEmpty(3, occupied)).toBe(false);
  });

  it("drops selected cells outside a smaller grid", () => {
    expect([...keepInside(new Set(["1-1", "5-2", "2-8"]), 4, 7)]).toEqual(["1-1"]);
  });
});

describe("planSeats", () => {
  it("makes one available seat per cell in reading order, named by position", () => {
    const plans = planSeats(["2-1", "1-3", "1-1"]);
    expect(plans.map((plan) => plan.key)).toEqual(["1-1", "1-3", "2-1"]);
    expect(plans[1].body).toEqual({ seatCode: "A3", rowNumber: 1, columnNumber: 3, isAvailable: true, hasComputer: true, hasCamera: true, notes: null });
  });

  it("gives every new seat a computer and a camera", () => {
    expect(planSeats(["1-1", "4-2"]).every((plan) => plan.body.hasComputer && plan.body.hasCamera)).toBe(true);
  });
});

describe("splitSelection", () => {
  it("separates empty cells to create from seats to edit or delete", () => {
    const occupied = seatsByCell([seat(1, 1), seat(2, 2)]);
    const { newKeys, seats } = splitSelection(new Set(["1-1", "1-3", "2-2", "4-4"]), occupied);
    expect(newKeys).toEqual(["1-3", "4-4"]);
    expect(seats.map((item) => item.seatId)).toEqual(["id-1-1", "id-2-2"]);
  });

  it("is empty for no selection", () => {
    expect(splitSelection(new Set(), seatsByCell([seat(1, 1)]))).toEqual({ newKeys: [], seats: [] });
  });
});

describe("createSeats", () => {
  const plans = planSeats(["1-1", "1-2", "1-3", "1-4", "1-5"]);

  it("creates every seat and reports them in order", async () => {
    const create = vi.fn(async () => undefined);
    const result = await createSeats(plans, create);
    expect(create).toHaveBeenCalledTimes(5);
    expect(result.created).toEqual(["1-1", "1-2", "1-3", "1-4", "1-5"]);
    expect(result.failed).toEqual([]);
  });

  it("keeps going after a failure and reports which cell failed and why", async () => {
    const boom = new Error("Seat code already exists.");
    const create = vi.fn(async (body: { seatCode: string }) => {
      if (body.seatCode === "A2") throw boom;
    });
    const result = await createSeats(plans, create);
    expect(create).toHaveBeenCalledTimes(5);
    expect(result.created).toEqual(["1-1", "1-3", "1-4", "1-5"]);
    expect(result.failed).toEqual([{ key: "1-2", error: boom }]);
  });

  it("never runs more requests at once than the limit", async () => {
    let running = 0;
    let peak = 0;
    const create = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 2));
      running -= 1;
    };
    await createSeats(plans, create, 2);
    expect(peak).toBe(2);
  });

  it("deletes seats the same way, naming each failure by its cell", async () => {
    const seats = [seat(1, 1), seat(1, 2), seat(2, 1)];
    const boom = new Error("Seat is assigned to a candidate.");
    const remove = vi.fn(async (item: RoomSeat) => {
      if (item.seatId === "id-1-2") throw boom;
    });
    const result = await deleteSeats(seats, remove);
    expect(remove).toHaveBeenCalledTimes(3);
    expect(result.deleted).toEqual(["1-1", "2-1"]);
    expect(result.failed).toEqual([{ key: "1-2", error: boom }]);
  });

  it("does nothing for no seats", async () => {
    const create = vi.fn();
    await expect(createSeats([], create)).resolves.toEqual({ created: [], failed: [] });
    expect(create).not.toHaveBeenCalled();
  });
});

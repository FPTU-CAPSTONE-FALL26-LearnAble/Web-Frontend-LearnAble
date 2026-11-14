import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomSeat } from "@/api/admin";
import { RoomSeatMap, type SeatCreateReport, type SeatDeleteReport } from "./RoomSeatMap";

const seat = (rowNumber: number, columnNumber: number, seatCode: string, extra: Partial<RoomSeat> = {}) =>
  ({ seatId: `id-${seatCode}`, examRoomId: "room", seatCode, rowNumber, columnNumber, isAvailable: true, hasComputer: true, hasCamera: false, notes: null, ...extra }) as RoomSeat;
const seats = [seat(1, 1, "A1"), seat(1, 2, "A2", { isAvailable: false }), seat(2, 1, "B1", { hasCamera: true })];
const onCreate = vi.fn<(plans: unknown[]) => Promise<SeatCreateReport>>();
const onDelete = vi.fn<(picked: RoomSeat[]) => Promise<SeatDeleteReport>>();
const onEditSeat = vi.fn();

function renderMap(items: RoomSeat[] = seats) {
  return render(<RoomSeatMap seats={items} onCreate={onCreate as never} onDelete={onDelete} onEditSeat={onEditSeat} />);
}
const cellNamed = (name: RegExp) => screen.getByRole("button", { name });
const summary = () => screen.getByRole("status");

beforeEach(() => {
  onCreate.mockReset();
  onEditSeat.mockReset();
  onDelete.mockReset();
  onDelete.mockImplementation(async (picked) => ({ deleted: picked.map((item) => `${item.rowNumber}-${item.columnNumber}`), failed: [] }));
  onCreate.mockImplementation(async (plans) => ({ created: (plans as Array<{ key: string }>).map((plan) => plan.key), failed: [] }));
});

describe("RoomSeatMap", () => {
  it("draws a 7 by 4 room with the seats that exist and a place to add the rest", () => {
    renderMap();
    expect(summary()).toHaveTextContent("7 rows × 4 columns · 3 seats · 0 selected");
    const map = screen.getByRole("region", { name: "Seat map" });
    expect(within(map).getAllByRole("button", { name: /no seat, select to add one/ })).toHaveLength(25);
    expect(within(map).getAllByRole("button", { name: /^Seat [A-Z]\d/ })).toHaveLength(3);
  });

  it("names every seat with its place, state and equipment", () => {
    renderMap();
    expect(cellNamed(/^Seat A1: row A, column 1, available, computer$/)).toBeInTheDocument();
    expect(cellNamed(/^Seat A2: row A, column 2, unavailable, computer$/)).toHaveTextContent("Off");
    expect(cellNamed(/^Seat B1: row B, column 1, available, computer and camera$/)).toBeInTheDocument();
  });

  it("selects a seat when it is clicked and lets it go when it is clicked again", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(cellNamed(/^Seat B1/));
    expect(cellNamed(/^Seat B1.*, selected$/)).toHaveAttribute("aria-pressed", "true");
    expect(summary()).toHaveTextContent("1 selected");
    expect(onEditSeat).not.toHaveBeenCalled();
    await user.click(cellNamed(/^Seat B1/));
    expect(cellNamed(/^Seat B1/)).toHaveAttribute("aria-pressed", "false");
    expect(summary()).toHaveTextContent("0 selected");
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it("offers to edit a seat only when exactly that one seat is selected", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(cellNamed(/^Seat B1/));
    await user.click(screen.getByRole("button", { name: "Edit seat B1" }));
    expect(onEditSeat).toHaveBeenCalledWith(seats[2]);
    await user.click(cellNamed(/^Seat A1/));
    expect(screen.queryByRole("button", { name: /^Edit seat/ })).not.toBeInTheDocument();
  });

  it("deletes the selected seats after one confirmation, and keeps them if asked", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(cellNamed(/^Seat A1/));
    await user.click(cellNamed(/^Seat B1/));
    await user.click(screen.getByRole("button", { name: "Delete 2 seats" }));
    expect(screen.getByText("Delete 2 seats from this room? This cannot be undone.")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep seats" }));
    expect(screen.getByRole("button", { name: "Delete 2 seats" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete 2 seats" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete 2 seats" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith([seats[0], seats[2]]));
    await waitFor(() => expect(summary()).toHaveTextContent("0 selected"));
  });

  it("creates new seats and deletes seats from the same selection, each acting only on its own", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(cellNamed(/^Seat A1/));
    await user.click(cellNamed(/Row A, column 3: no seat/));
    expect(screen.getByText("1 new seat ready to create · 1 seat selected.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 1 seat" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toHaveLength(1);
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(summary()).toHaveTextContent("1 selected"));
  });

  it("names the seats that could not be deleted and keeps them selected", async () => {
    const user = userEvent.setup();
    onDelete.mockResolvedValue({ deleted: ["1-1"], failed: [{ key: "2-1", message: "Seat is assigned to a candidate." }] });
    renderMap();
    await user.click(cellNamed(/^Seat A1/));
    await user.click(cellNamed(/^Seat B1/));
    await user.click(screen.getByRole("button", { name: "Delete 2 seats" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete 2 seats" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("1 seat could not be deleted:");
    expect(alert).toHaveTextContent("Seat B1: Seat is assigned to a candidate.");
    expect(summary()).toHaveTextContent("1 selected");
  });

  it("grows to hold seats beyond the default size", () => {
    renderMap([seat(6, 9, "F9")]);
    expect(summary()).toHaveTextContent("7 rows × 9 columns · 1 seat · 0 selected");
  });

  it("selects an empty cell and offers to create it, and clears it again", async () => {
    const user = userEvent.setup();
    renderMap();
    expect(screen.queryByRole("button", { name: /^Create/ })).not.toBeInTheDocument();
    expect(screen.getByText("Click empty cells to add seats, or click seats to edit or delete them.")).toBeInTheDocument();
    const target = cellNamed(/Row A, column 3: no seat/);
    await user.click(target);
    expect(cellNamed(/Row A, column 3: new seat selected/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Create 1 seat" })).toBeInTheDocument();
    expect(summary()).toHaveTextContent("1 selected");
    await user.click(cellNamed(/Row A, column 3: new seat selected/));
    expect(screen.queryByRole("button", { name: /^Create/ })).not.toBeInTheDocument();
  });

  it("selects every empty cell of a row or a column from its heading", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Select every empty cell in row A" }));
    expect(summary()).toHaveTextContent("2 selected");
    await user.click(screen.getByRole("button", { name: "Select every empty cell in row A" }));
    expect(summary()).toHaveTextContent("0 selected");
    await user.click(screen.getByRole("button", { name: "Select every empty cell in column 1" }));
    expect(summary()).toHaveTextContent("5 selected");
  });

  it("selects every empty cell at once, then clears the selection", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Select all empty cells" }));
    expect(screen.getByRole("button", { name: "Create 25 seats" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(summary()).toHaveTextContent("0 selected");
  });

  it("adds rows and columns to the room", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Add row" }));
    await user.click(screen.getByRole("button", { name: "Add column" }));
    expect(summary()).toHaveTextContent("8 rows × 5 columns");
    expect(screen.getByRole("button", { name: /Row H, column 5: no seat/ })).toBeInTheDocument();
  });

  it("only offers to remove rows and columns that were added, never the default room", () => {
    renderMap();
    expect(screen.queryByRole("button", { name: "Remove last row" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove last column" })).not.toBeInTheDocument();
  });

  it("removes an added last row or column, with any selection in it", async () => {
    const user = userEvent.setup();
    renderMap([seat(4, 3, "D3")]);
    await user.click(screen.getByRole("button", { name: "Add row" }));
    await user.click(screen.getByRole("button", { name: "Add column" }));
    await user.click(cellNamed(/Row H, column 2: no seat/));
    expect(summary()).toHaveTextContent("8 rows × 5 columns · 1 seat · 1 selected");
    await user.click(screen.getByRole("button", { name: "Remove last row" }));
    await user.click(screen.getByRole("button", { name: "Remove last column" }));
    expect(summary()).toHaveTextContent("7 rows × 4 columns · 1 seat · 0 selected");
  });

  it("never removes a row or column that holds a seat", async () => {
    renderMap([seat(9, 1, "I1"), seat(2, 6, "B6")]);
    expect(summary()).toHaveTextContent("9 rows × 6 columns");
    expect(screen.queryByRole("button", { name: "Remove last row" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove last column" })).not.toBeInTheDocument();
  });

  it("creates the selected seats named by position, each with a computer and a camera", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(cellNamed(/Row A, column 3: no seat/));
    await user.click(cellNamed(/Row C, column 1: no seat/));
    expect(screen.getByText("2 new seats ready to create.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 2 seats" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toEqual([
      { key: "1-3", body: { seatCode: "A3", rowNumber: 1, columnNumber: 3, isAvailable: true, hasComputer: true, hasCamera: true, notes: null } },
      { key: "3-1", body: { seatCode: "C1", rowNumber: 3, columnNumber: 1, isAvailable: true, hasComputer: true, hasCamera: true, notes: null } },
    ]);
    await waitFor(() => expect(summary()).toHaveTextContent("0 selected"));
  });

  it("shows which seats failed and why, and keeps only those selected to try again", async () => {
    const user = userEvent.setup();
    onCreate.mockResolvedValue({ created: ["1-3"], failed: [{ key: "1-4", message: "Seat code already exists." }] });
    renderMap();
    await user.click(cellNamed(/Row A, column 3: no seat/));
    await user.click(cellNamed(/Row A, column 4: no seat/));
    await user.click(screen.getByRole("button", { name: "Create 2 seats" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("1 seat could not be created:");
    expect(alert).toHaveTextContent("Seat A4: Seat code already exists.");
    expect(summary()).toHaveTextContent("1 selected");
    expect(cellNamed(/Row A, column 4: new seat selected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create 1 seat" })).toBeInTheDocument();
  });

  it("holds the map still while seats are being created", async () => {
    const user = userEvent.setup();
    let finish: (report: SeatCreateReport) => void = () => undefined;
    onCreate.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderMap();
    await user.click(cellNamed(/Row A, column 3: no seat/));
    await user.click(screen.getByRole("button", { name: "Create 1 seat" }));
    expect(await screen.findByRole("button", { name: "Creating…" })).toBeDisabled();
    expect(cellNamed(/Row A, column 4: no seat/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add row" })).toBeDisabled();
    finish({ created: ["1-3"], failed: [] });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Creating…" })).not.toBeInTheDocument());
  });

  it("explains how seats are named", () => {
    renderMap();
    expect(screen.getByText(/named by position, for example A1 for row A, column 1/)).toBeInTheDocument();
  });
});

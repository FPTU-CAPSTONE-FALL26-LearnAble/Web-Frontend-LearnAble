import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { bulkExamSchedulePlanSchema } from "@/api/exams";
import { buildSeatGrid, SeatingPlan, type SeatInfo } from "./SeatingPlan";

const student = (studentId: string, studentName: string, seatId: string, seatCode: string, rowNumber: number, columnNumber: number) =>
  ({ studentId, studentName, seatId, seatCode, rowNumber, columnNumber, extraTimeMinutes: 0, accommodationNotes: null });
const room = (roomId: string, roomCode: string, students: ReturnType<typeof student>[]) => ({ roomId, roomCode, roomName: `Lab ${roomCode}`, capacity: 6, students, invigilators: [] });
const plan = bulkExamSchedulePlanSchema.parse({
  requestId: "x", isValid: true, planHash: null, unusedRoomIds: [], unusedLecturerIds: [], issues: [],
  rooms: [
    room("r1", "A302", [student("s1", "Tran Quoc Toan", "seat-1", "A1", 1, 1), student("s2", "Ronal Do", "seat-3", "B1", 2, 1)]),
    room("r2", "B204", [student("s3", "Nguyen Van Muoi", "seat-9", "A1", 1, 1)]),
  ],
});
const seats: SeatInfo[] = [
  { seatId: "seat-1", seatCode: "A1", rowNumber: 1, columnNumber: 1, isAvailable: true, hasComputer: true, hasCamera: true },
  { seatId: "seat-2", seatCode: "A2", rowNumber: 1, columnNumber: 2, isAvailable: true, hasComputer: true },
  { seatId: "seat-3", seatCode: "B1", rowNumber: 2, columnNumber: 1, isAvailable: true, hasComputer: true },
  { seatId: "seat-4", seatCode: "B2", rowNumber: 2, columnNumber: 2, isAvailable: false },
];
const props = { rooms: plan.rooms, seatsByRoom: { r1: seats } as Record<string, SeatInfo[] | undefined>, studentName: (s: { studentName?: string | null }) => s.studentName ?? "Student", roomName: (r: { roomCode?: string | null; roomName?: string | null }) => `${r.roomCode} · ${r.roomName}` };

describe("buildSeatGrid", () => {
  it("lays every seat of the room out by row and column and counts the free and unusable ones", () => {
    const grid = buildSeatGrid(plan.rooms[0], seats);
    expect(grid).toMatchObject({ rowCount: 2, columnCount: 2, free: 1, blocked: 1, knowsAllSeats: true });
    expect(grid.cells.find((cell) => cell.seatId === "seat-1")?.student?.studentName).toBe("Tran Quoc Toan");
  });

  it("draws only the seats given out when the room's seat list is not known", () => {
    const grid = buildSeatGrid(plan.rooms[1], undefined);
    expect(grid).toMatchObject({ rowCount: 1, columnCount: 1, knowsAllSeats: false });
  });
});

describe("SeatingPlan", () => {
  it("shows who sits where, the free seats and the seats that cannot be used", () => {
    render(<SeatingPlan {...props} />);
    const seatsList = screen.getByRole("list", { name: "Seats of A302 · Lab A302" });
    expect(within(seatsList).getByLabelText("Seat A1, Tran Quoc Toan")).toBeInTheDocument();
    expect(within(seatsList).getByLabelText("Seat B1, Ronal Do")).toBeInTheDocument();
    expect(within(seatsList).getByLabelText("Seat A2, free")).toBeInTheDocument();
    expect(within(seatsList).getByLabelText("Seat B2, not usable")).toBeInTheDocument();
    expect(screen.getByText("2 students seated · 1 free seat · 1 not usable")).toBeInTheDocument();
  });

  it("switches between the rooms of the plan", () => {
    render(<SeatingPlan {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "B204" }));
    expect(screen.getByRole("button", { name: "B204" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Seat A1, Nguyen Van Muoi")).toBeInTheDocument();
    expect(screen.getByText("1 student seated")).toBeInTheDocument();
  });

  it("also lists the seats as a table for people who do not read the drawing", () => {
    render(<SeatingPlan {...props} />);
    const list = screen.getByRole("table", { name: "Seat of each student in A302 · Lab A302" });
    expect(within(list).getAllByRole("row").map((row) => row.textContent)).toEqual(["SeatStudent", "A1Tran Quoc Toan", "B1Ronal Do"]);
  });
});

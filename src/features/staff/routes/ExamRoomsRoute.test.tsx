import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure } from "@/api/client";
import { useAuthStore } from "@/features/auth/store/authStore";

// Dialogs and Radix controls are slow to drive when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  createRoomSeat: vi.fn(),
  deleteRoomSeat: vi.fn(),
  getExamRooms: vi.fn(),
  getRoomSeats: vi.fn(),
  updateRoomSeat: vi.fn(),
}));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { ExamRoomsRoute } from "./ExamRoomsRoute";

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, pageSize: 10, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const room = { examRoomId: "room-1", universityId: "uni-1", roomCode: "202", name: "Cong tac sinh vien", building: "Alpha", floor: 2, capacity: 3, isActive: true };
const seat = (rowNumber: number, columnNumber: number, seatCode: string) => ({ seatId: `seat-${seatCode}`, examRoomId: "room-1", seatCode, rowNumber, columnNumber, isAvailable: true, hasComputer: true, hasCamera: true, notes: null });
const seats = [seat(1, 1, "01"), seat(1, 2, "02"), seat(2, 1, "03")];

function renderRoute() {
  useAuthStore.setState({ user: { id: "staff-1", fullName: "Staff One", email: "staff@fpt.edu.vn", role: "Staff", universityId: "uni-1" } });
  const router = createMemoryRouter([{ path: "/", element: <ExamRoomsRoute /> }], { initialEntries: ["/"] });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function openSeats() {
  const user = userEvent.setup();
  renderRoute();
  await user.click(await screen.findByRole("button", { name: "Manage seats" }));
  const dialog = await screen.findByRole("dialog", { name: /202/ });
  await within(dialog).findByRole("region", { name: "Seat map" });
  return { user, dialog };
}

beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getExamRooms.mockResolvedValue(page([room]));
  api.getRoomSeats.mockResolvedValue(seats);
  api.createRoomSeat.mockResolvedValue(undefined);
  api.updateRoomSeat.mockResolvedValue(undefined);
  api.deleteRoomSeat.mockResolvedValue(undefined);
});

describe("Seat count in the room list", () => {
  it("shows how many seats each room has", async () => {
    api.getExamRooms.mockResolvedValue(page([room, { ...room, examRoomId: "room-2", roomCode: "203", name: "Phong 203" }]));
    api.getRoomSeats.mockImplementation(async (roomId: string) => (roomId === "room-1" ? seats : []));
    renderRoute();
    const first = (await screen.findByText("Cong tac sinh vien")).closest("tr") as HTMLElement;
    expect(await within(first).findByText("3 seats")).toBeInTheDocument();
    const second = screen.getByText("Phong 203").closest("tr") as HTMLElement;
    expect(await within(second).findByText("0 seats")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Seats" })).toBeInTheDocument();
  });

  it("says how many of them cannot be used", async () => {
    api.getRoomSeats.mockResolvedValue([seat(1, 1, "01"), { ...seat(1, 2, "02"), isAvailable: false }]);
    renderRoute();
    const row = (await screen.findByText("Cong tac sinh vien")).closest("tr") as HTMLElement;
    expect(await within(row).findByText("2 seats")).toBeInTheDocument();
    expect(within(row).getByText("1 unavailable")).toBeInTheDocument();
  });

  it("says so when a room's seats cannot be read, without hiding the room", async () => {
    api.getRoomSeats.mockRejectedValue(new ApiFailure({ kind: "server", status: 500 }));
    renderRoute();
    const row = (await screen.findByText("Cong tac sinh vien")).closest("tr") as HTMLElement;
    expect(await within(row).findByText("Not available")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Manage seats" })).toBeInTheDocument();
  });
});

describe("Exam room seat map", () => {
  it("shows the room's seats as a map, with no separate add-seat button", async () => {
    const { dialog } = await openSeats();
    expect(within(dialog).getByRole("status")).toHaveTextContent("7 rows × 4 columns · 3 seats · 0 selected");
    expect(within(dialog).getAllByRole("button", { name: /^Seat \d/ })).toHaveLength(3);
    expect(within(dialog).queryByRole("button", { name: "Add seat" })).not.toBeInTheDocument();
    expect(api.getRoomSeats).toHaveBeenCalledWith("room-1");
  });

  it("creates one seat per selected cell, named by position, then refreshes the map", async () => {
    const { user, dialog } = await openSeats();
    const readsBefore = api.getRoomSeats.mock.calls.length;
    await user.click(within(dialog).getByRole("button", { name: /Row A, column 3: no seat/ }));
    await user.click(within(dialog).getByRole("button", { name: /Row A, column 4: no seat/ }));
    await user.click(within(dialog).getByRole("button", { name: "Create 2 seats" }));
    await waitFor(() => expect(api.createRoomSeat).toHaveBeenCalledTimes(2));
    expect(api.createRoomSeat).toHaveBeenCalledWith("room-1", expect.objectContaining({ seatCode: "A3", rowNumber: 1, columnNumber: 3, isAvailable: true, hasComputer: true, hasCamera: true }));
    expect(api.createRoomSeat).toHaveBeenCalledWith("room-1", expect.objectContaining({ seatCode: "A4", rowNumber: 1, columnNumber: 4 }));
    await waitFor(() => expect(api.getRoomSeats.mock.calls.length).toBeGreaterThan(readsBefore));
  });

  it("says which seat could not be created and why, and creates the others", async () => {
    api.createRoomSeat.mockImplementation(async (_roomId: string, body: { seatCode: string }) => {
      if (body.seatCode === "A4") throw new ApiFailure({ kind: "server", status: 409 }, "Seat code already exists in this room.");
    });
    const { user, dialog } = await openSeats();
    await user.click(within(dialog).getByRole("button", { name: /Row A, column 3: no seat/ }));
    await user.click(within(dialog).getByRole("button", { name: /Row A, column 4: no seat/ }));
    await user.click(within(dialog).getByRole("button", { name: "Create 2 seats" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Seat A4: Seat code already exists in this room.");
    expect(api.createRoomSeat).toHaveBeenCalledTimes(2);
  });

  it("opens a seat to edit from the map and saves it", async () => {
    const { user, dialog } = await openSeats();
    await user.click(within(dialog).getByRole("button", { name: /^Seat 02/ }));
    await user.click(within(dialog).getByRole("button", { name: "Edit seat 02" }));
    const form = await screen.findByRole("dialog", { name: "Edit seat" });
    const code = within(form).getByLabelText("Seat code");
    expect(code).toHaveValue("02");
    await user.clear(code);
    await user.type(code, "B2");
    await user.click(within(form).getByRole("button", { name: "Save seat" }));
    await waitFor(() => expect(api.updateRoomSeat).toHaveBeenCalledTimes(1));
    expect(api.updateRoomSeat).toHaveBeenCalledWith("room-1", "seat-02", expect.objectContaining({ seatCode: "B2", rowNumber: 1, columnNumber: 2 }));
  });

  it("deletes the selected seats from the map after one confirmation", async () => {
    const { user, dialog } = await openSeats();
    const readsBefore = api.getRoomSeats.mock.calls.length;
    await user.click(within(dialog).getByRole("button", { name: /^Seat 02/ }));
    await user.click(within(dialog).getByRole("button", { name: /^Seat 03/ }));
    await user.click(within(dialog).getByRole("button", { name: "Delete 2 seats" }));
    expect(api.deleteRoomSeat).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Yes, delete 2 seats" }));
    await waitFor(() => expect(api.deleteRoomSeat).toHaveBeenCalledTimes(2));
    expect(api.deleteRoomSeat).toHaveBeenCalledWith("room-1", "seat-02");
    expect(api.deleteRoomSeat).toHaveBeenCalledWith("room-1", "seat-03");
    await waitFor(() => expect(api.getRoomSeats.mock.calls.length).toBeGreaterThan(readsBefore));
  });

  it("says which seat could not be deleted and why", async () => {
    api.deleteRoomSeat.mockImplementation(async (_roomId: string, seatId: string) => {
      if (seatId === "seat-03") throw new ApiFailure({ kind: "server", status: 409 }, "Seat is assigned to a candidate.");
    });
    const { user, dialog } = await openSeats();
    await user.click(within(dialog).getByRole("button", { name: /^Seat 03/ }));
    await user.click(within(dialog).getByRole("button", { name: "Delete 1 seat" }));
    await user.click(within(dialog).getByRole("button", { name: "Yes, delete 1 seat" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Seat 03: Seat is assigned to a candidate.");
  });
});

import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { plural } from "@/components/workbench/dashboardTime";
import { DoorOpen, LayoutGrid, Plus, Trash2 } from "lucide-react";
import {
  createExamRoom,
  createRoomSeat,
  deleteExamRoom,
  deleteRoomSeat,
  getExamRooms,
  getRoomSeats,
  updateExamRoom,
  updateRoomSeat,
  type ExamRoom,
  type RoomSeat,
} from "@/api/admin";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import {
  adminKeys,
  useAdminWrite,
  useUniversityScope,
} from "@/features/admin/api/useAdminData";
import {
  ConfirmAction,
  EmptyRow,
  FormDialog,
  TablePanel,
} from "@/features/admin/components/AdminSurfaces";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/toast";
import { RoomSeatMap, type SeatCreateReport, type SeatDeleteReport } from "../components/RoomSeatMap";
import { createSeats, deleteSeats, type SeatPlan } from "../seatMap";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { describeError } from "@/app/providers";

type RoomDraft = {
  roomCode: string;
  name: string;
  building: string;
  floor: string;
  isActive: string;
};
type SeatDraft = {
  seatCode: string;
  rowNumber: string;
  columnNumber: string;
  isAvailable: string;
  hasComputer: string;
  hasCamera: string;
  notes: string;
};
const emptyRoom: RoomDraft = {
  roomCode: "",
  name: "",
  building: "",
  floor: "",
  isActive: "true",
};
const emptySeat: SeatDraft = {
  seatCode: "",
  rowNumber: "1",
  columnNumber: "1",
  isAvailable: "true",
  hasComputer: "true",
  hasCamera: "false",
  notes: "",
};
const yesNo = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export function ExamRoomsRoute() {
  useRouteAnnouncer("Exam Rooms & Seats · LearnAble", "Exam Rooms & Seats");
  const scope = useUniversityScope();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(emptyRoom);
  const [seatDraft, setSeatDraft] = useState<SeatDraft>(emptySeat);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | null>(null);
  const [editingSeat, setEditingSeat] = useState<RoomSeat | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<ExamRoom | null>(null);
  const [confirmingSeatDelete, setConfirmingSeatDelete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const rooms = useQuery({
    queryKey: adminKeys.list("examRooms", [page, size]),
    queryFn: () => getExamRooms({ Page: page, PageSize: Number(size) }),
  });
  const seats = useQuery({
    queryKey: adminKeys.list("roomSeats", [selectedRoom?.examRoomId ?? "none"]),
    queryFn: () => getRoomSeats(selectedRoom!.examRoomId),
    enabled: !!selectedRoom,
  });
  const rows = rooms.data?.items ?? [];
  const seatRows = seats.data ?? [];
  // The room list has no seat count of its own, so each listed room's seats are read. The key is shared
  // with the seat map above, so creating, editing or deleting seats refreshes these counts too.
  const seatCounts = useQueries({
    queries: rows.map((room) => ({
      queryKey: adminKeys.list("roomSeats", [room.examRoomId]),
      queryFn: () => getRoomSeats(room.examRoomId),
    })),
  });
  const tenantUniversityId = scope.universityId || rows[0]?.universityId || "";
  const universityScopePending = !scope.universityId && rooms.isPending;

  const closeRoomForm = () => {
    setCreatingRoom(false);
    setEditingRoom(null);
    setRoomDraft(emptyRoom);
    setErrors([]);
  };
  const closeSeatForm = () => {
    setConfirmingSeatDelete(false);
    setEditingSeat(null);
    setSeatDraft(emptySeat);
    setErrors([]);
  };
  const roomBody = () => ({
    universityId: editingRoom?.universityId ?? tenantUniversityId,
    roomCode: roomDraft.roomCode.trim(),
    name: roomDraft.name.trim(),
    building: roomDraft.building.trim(),
    floor: roomDraft.floor ? Number(roomDraft.floor) : null,
    isActive: roomDraft.isActive === "true",
  });
  const seatBody = () => ({
    seatCode: seatDraft.seatCode.trim(),
    rowNumber: Number(seatDraft.rowNumber),
    columnNumber: Number(seatDraft.columnNumber),
    isAvailable: seatDraft.isAvailable === "true",
    hasComputer: seatDraft.hasComputer === "true",
    hasCamera: seatDraft.hasCamera === "true",
    notes: seatDraft.notes.trim() || null,
  });
  const addRoom = useAdminWrite({
    resource: "examRooms",
    action: "Create exam room",
    mutationFn: () => createExamRoom(roomBody()),
    onSuccess: closeRoomForm,
  });
  const saveRoom = useAdminWrite({
    resource: "examRooms",
    action: "Update exam room",
    mutationFn: () => updateExamRoom(editingRoom!.examRoomId, roomBody()),
    onSuccess: closeRoomForm,
  });
  const removeRoom = useAdminWrite<string>({
    resource: "examRooms",
    action: "Delete exam room",
    mutationFn: deleteExamRoom,
    onSuccess: () => {
      setDeletingRoom(null);
      setSelectedRoom(null);
    },
  });
  /** Creates the picked seats one request each, then reports which cells worked and which did not. */
  const createSeatsAt = async (plans: SeatPlan[]): Promise<SeatCreateReport> => {
    const roomId = selectedRoom!.examRoomId;
    const result = await createSeats(plans, (body) => createRoomSeat(roomId, body));
    await queryClient.invalidateQueries({ queryKey: adminKeys.resource("roomSeats") });
    if (result.created.length)
      toast({
        title: result.created.length === 1 ? "1 seat created" : `${result.created.length} seats created`,
        description: result.failed.length ? `${result.failed.length} could not be created. They stay selected.` : undefined,
      });
    return {
      created: result.created,
      failed: result.failed.map((failure) => ({ key: failure.key, message: describeError(failure.error) })),
    };
  };
  /** Deletes the picked seats one request each, then reports which worked and which did not. */
  const deleteSeatsAt = async (picked: RoomSeat[]): Promise<SeatDeleteReport> => {
    const roomId = selectedRoom!.examRoomId;
    const result = await deleteSeats(picked, (seat) => deleteRoomSeat(roomId, seat.seatId));
    await queryClient.invalidateQueries({ queryKey: adminKeys.resource("roomSeats") });
    if (result.deleted.length)
      toast({
        title: result.deleted.length === 1 ? "1 seat deleted" : `${result.deleted.length} seats deleted`,
        description: result.failed.length ? `${result.failed.length} could not be deleted. They stay selected.` : undefined,
      });
    return {
      deleted: result.deleted,
      failed: result.failed.map((failure) => ({ key: failure.key, message: describeError(failure.error) })),
    };
  };
  const saveSeat = useAdminWrite({
    resource: "roomSeats",
    action: "Update seat",
    mutationFn: () =>
      updateRoomSeat(selectedRoom!.examRoomId, editingSeat!.seatId, seatBody()),
    onSuccess: closeSeatForm,
  });
  const removeSeat = useAdminWrite<string>({
    resource: "roomSeats",
    action: "Delete seat",
    mutationFn: (id) => deleteRoomSeat(selectedRoom!.examRoomId, id),
    onSuccess: closeSeatForm,
  });

  const validateRoom = () => {
    const found: string[] = [];
    if (!tenantUniversityId && !editingRoom)
      found.push(
        "Your Staff account is not assigned to a university. Sign out and sign in again; if this remains, ask an administrator to assign a university to your account.",
      );
    if (!roomDraft.roomCode.trim()) found.push("Room code is required.");
    if (!roomDraft.name.trim()) found.push("Room name is required.");
    if (!roomDraft.building.trim()) found.push("Building is required.");
    if (roomDraft.floor && !Number.isInteger(Number(roomDraft.floor)))
      found.push("Floor must be a whole number.");
    setErrors(found);
    if (!found.length) (creatingRoom ? addRoom : saveRoom).mutate();
  };
  const validateSeat = () => {
    const found: string[] = [];
    if (!seatDraft.seatCode.trim()) found.push("Seat code is required.");
    if (
      !Number.isInteger(Number(seatDraft.rowNumber)) ||
      Number(seatDraft.rowNumber) < 1
    )
      found.push("Row must be a positive whole number.");
    if (
      !Number.isInteger(Number(seatDraft.columnNumber)) ||
      Number(seatDraft.columnNumber) < 1
    )
      found.push("Column must be a positive whole number.");
    setErrors(found);
    if (!found.length) saveSeat.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Exam Rooms & Seats"
        description="Manage exam rooms and their seats so every exam can be arranged accurately."
      >
        <Button
          disabled={universityScopePending}
          onClick={() => {
            setRoomDraft(emptyRoom);
            setErrors([]);
            setCreatingRoom(true);
          }}
        >
          <Plus aria-hidden /> New room
        </Button>
      </PageHeading>
      <section aria-label="Room summary" className="grid grid-cols-2 gap-3">
        <SummaryCard
          compact
          label="Exam rooms"
          value={rooms.data?.totalCount ?? "Not available"}
          detail="Rooms available for scheduling"
          icon={<DoorOpen aria-hidden className="size-5" />}
        />
        <SummaryCard
          compact
          label="Selected room seats"
          value={selectedRoom ? seatRows.length : "—"}
          detail={
            selectedRoom
              ? `${selectedRoom.roomCode ?? "Room"} seat inventory`
              : "Select a room to inspect seats"
          }
          icon={<LayoutGrid aria-hidden className="size-5" />}
        />
      </section>
      <TablePanel
        heading="Exam rooms"
        shown={rows.length}
        total={rooms.data?.totalCount ?? 0}
        noun="rooms"
        tableLabel="Exam rooms table"
        tableClassName="min-w-[680px]"
        read={rooms}
        page={page}
        pages={rooms.data?.totalPages ?? 1}
        size={size}
        onPage={setPage}
        onSize={(value) => {
          setSize(value);
          setPage(1);
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={row.examRoomId}
              aria-selected={selectedRoom?.examRoomId === row.examRoomId}
            >
              <TableCell>
                <p className="font-bold">{row.roomCode ?? "Not available"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.name ?? "Not available"}
                </p>
              </TableCell>
              <TableCell>
                {row.building ?? "Not available"}
                {row.floor === null ? "" : ` · Floor ${row.floor}`}
              </TableCell>
              <TableCell>
                {seatCounts[index]?.isError ? (
                  <p className="text-muted-foreground">Not available</p>
                ) : seatCounts[index]?.data ? (
                  <>
                    <p className="font-semibold">{plural(seatCounts[index].data.length, "seat")}</p>
                    {seatCounts[index].data.some((seat) => !seat.isAvailable) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {seatCounts[index].data.filter((seat) => !seat.isAvailable).length} unavailable
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">…</p>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge
                  value={row.isActive ? "Active" : "Inactive"}
                  tone={row.isActive ? "success" : "neutral"}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRoom(row)}
                  >
                    Manage seats
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingRoom(row);
                      setRoomDraft({
                        roomCode: row.roomCode ?? "",
                        name: row.name ?? "",
                        building: row.building ?? "",
                        floor: row.floor === null ? "" : String(row.floor),
                        isActive: String(row.isActive),
                      });
                      setErrors([]);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${row.roomCode ?? "room"}`}
                    onClick={() => setDeletingRoom(row)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={5}
              title="No exam rooms are configured."
              hint="Create the first room, then define its seats."
            />
          )}
        </TableBody>
      </TablePanel>

      <Dialog
        open={selectedRoom !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoom(null);
            closeSeatForm();
          }
        }}
      >
        {selectedRoom ? (
          <DialogContent className="max-h-[88vh] w-[min(96vw,1120px)] max-w-[1120px] gap-5 overflow-hidden p-0">
            {/* A flex column keeps the title and Close in view while only the map scrolls. */}
            <div className="flex max-h-[88vh] min-h-0 flex-col">
              <DialogHeader className="shrink-0 border-b border-border px-6 pt-6">
                <div className="pb-4 pr-10">
                  <DialogTitle>
                    {selectedRoom.roomCode} · {selectedRoom.name}
                  </DialogTitle>
                  <DialogDescription>
                    Draw the seats of this room. Select empty cells to create seats, or click a seat to edit it.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5">
                <ReadState
                  pending={seats.isPending}
                  error={seats.error}
                  retry={() => void seats.refetch()}
                />
                {!seats.isPending && !seats.error ? (
                  <RoomSeatMap
                    key={selectedRoom.examRoomId}
                    seats={seatRows}
                    onCreate={createSeatsAt}
                    onDelete={deleteSeatsAt}
                    onEditSeat={(seat) => {
                      setEditingSeat(seat);
                      setSeatDraft({
                        seatCode: seat.seatCode ?? "",
                        rowNumber: String(seat.rowNumber),
                        columnNumber: String(seat.columnNumber),
                        isAvailable: String(seat.isAvailable),
                        hasComputer: String(seat.hasComputer),
                        hasCamera: String(seat.hasCamera),
                        notes: seat.notes ?? "",
                      });
                      setErrors([]);
                    }}
                  />
                ) : null}
              </div>
              <DialogFooter
                showCloseButton
                className="shrink-0 border-t border-border px-6 py-4"
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <FormDialog
        open={creatingRoom || !!editingRoom}
        onOpenChange={(open) => {
          if (!open) closeRoomForm();
        }}
        title={creatingRoom ? "New exam room" : "Edit exam room"}
        description="Room data is used by exam scheduling. Seat capacity comes from the seat inventory below."
        submitLabel={creatingRoom ? "Create room" : "Save room"}
        pending={addRoom.isPending || saveRoom.isPending}
        errors={[
          ...errors,
          ...((creatingRoom ? addRoom.error : saveRoom.error)
            ? [describeError(creatingRoom ? addRoom.error : saveRoom.error)]
            : []),
        ]}
        onSubmit={validateRoom}
      >
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-semibold">University</p>
          <p className="mt-1 text-muted-foreground">
            {tenantUniversityId
              ? "Automatically linked to the university assigned to your Staff account."
              : "No university is assigned to this Staff account."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Room code"
            value={roomDraft.roomCode}
            onChange={(value) =>
              setRoomDraft((old) => ({ ...old, roomCode: value }))
            }
          />
          <TextField
            label="Room name"
            value={roomDraft.name}
            onChange={(value) =>
              setRoomDraft((old) => ({ ...old, name: value }))
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Building"
            value={roomDraft.building}
            onChange={(value) =>
              setRoomDraft((old) => ({ ...old, building: value }))
            }
          />
          <TextField
            label="Floor"
            type="number"
            value={roomDraft.floor}
            onChange={(value) =>
              setRoomDraft((old) => ({ ...old, floor: value }))
            }
          />
        </div>
        <ChoiceField
          label="Active room"
          value={roomDraft.isActive}
          options={yesNo}
          onChange={(value) =>
            setRoomDraft((old) => ({ ...old, isActive: value }))
          }
        />
      </FormDialog>
      <FormDialog
        open={!!editingSeat}
        onOpenChange={(open) => {
          if (!open) closeSeatForm();
        }}
        title="Edit seat"
        description={`Seat ${editingSeat?.seatCode ?? ""} in ${selectedRoom?.roomCode ?? "the selected room"}.`}
        submitLabel="Save seat"
        pending={saveSeat.isPending}
        errors={[...errors, ...(saveSeat.error ? [describeError(saveSeat.error)] : [])]}
        onSubmit={validateSeat}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Seat code"
            value={seatDraft.seatCode}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, seatCode: value }))
            }
          />
          <TextField
            label="Row"
            type="number"
            min="1"
            value={seatDraft.rowNumber}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, rowNumber: value }))
            }
          />
          <TextField
            label="Column"
            type="number"
            min="1"
            value={seatDraft.columnNumber}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, columnNumber: value }))
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ChoiceField
            label="Available"
            value={seatDraft.isAvailable}
            options={yesNo}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, isAvailable: value }))
            }
          />
          <ChoiceField
            label="Computer"
            value={seatDraft.hasComputer}
            options={yesNo}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, hasComputer: value }))
            }
          />
          <ChoiceField
            label="Camera"
            value={seatDraft.hasCamera}
            options={yesNo}
            onChange={(value) =>
              setSeatDraft((old) => ({ ...old, hasCamera: value }))
            }
          />
        </div>
        <TextField
          label="Notes"
          multiline
          value={seatDraft.notes}
          onChange={(value) =>
            setSeatDraft((old) => ({ ...old, notes: value }))
          }
        />
        {confirmingSeatDelete ? (
          <div className="space-y-3 rounded-xl border border-destructive p-4">
            <p className="font-semibold">Delete seat {editingSeat?.seatCode}?</p>
            <p className="text-sm text-muted-foreground">This seat will no longer be available for candidate allocation.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={removeSeat.isPending} onClick={() => setConfirmingSeatDelete(false)}>
                Keep seat
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={removeSeat.isPending}
                onClick={() => editingSeat && removeSeat.mutate(editingSeat.seatId)}
              >
                {removeSeat.isPending ? "Deleting…" : "Delete seat"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="destructive" onClick={() => setConfirmingSeatDelete(true)}>
            <Trash2 aria-hidden /> Delete this seat
          </Button>
        )}
      </FormDialog>
      <ConfirmAction
        open={!!deletingRoom}
        onOpenChange={(open) => {
          if (!open && !removeRoom.isPending) setDeletingRoom(null);
        }}
        title="Delete exam room?"
        description="This room cannot be deleted while it is still used by an exam schedule."
        confirmLabel="Delete room"
        pending={removeRoom.isPending}
        onConfirm={() => {
          if (deletingRoom && !removeRoom.isPending)
            removeRoom.mutate(deletingRoom.examRoomId);
        }}
      />
    </div>
  );
}

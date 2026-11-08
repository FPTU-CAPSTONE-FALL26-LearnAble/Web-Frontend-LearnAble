import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { PageHeading, ReadState, StatusBadge, SummaryCard } from "@/components/workbench/Workbench";
import { adminKeys, useAdminWrite, useUniversityScope } from "@/features/admin/api/useAdminData";
import { ConfirmAction, EmptyRow, FormDialog, TablePanel } from "@/features/admin/components/AdminSurfaces";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
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
const emptyRoom: RoomDraft = { roomCode: "", name: "", building: "", floor: "", isActive: "true" };
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
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(emptyRoom);
  const [seatDraft, setSeatDraft] = useState<SeatDraft>(emptySeat);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | null>(null);
  const [editingSeat, setEditingSeat] = useState<RoomSeat | null>(null);
  const [creatingSeat, setCreatingSeat] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<ExamRoom | null>(null);
  const [deletingSeat, setDeletingSeat] = useState<RoomSeat | null>(null);
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
  const tenantUniversityId = scope.universityId || rows[0]?.universityId || "";

  const closeRoomForm = () => {
    setCreatingRoom(false);
    setEditingRoom(null);
    setRoomDraft(emptyRoom);
    setErrors([]);
  };
  const closeSeatForm = () => {
    setCreatingSeat(false);
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
  const addRoom = useAdminWrite({ resource: "examRooms", action: "Create exam room", mutationFn: () => createExamRoom(roomBody()), onSuccess: closeRoomForm });
  const saveRoom = useAdminWrite({ resource: "examRooms", action: "Update exam room", mutationFn: () => updateExamRoom(editingRoom!.examRoomId, roomBody()), onSuccess: closeRoomForm });
  const removeRoom = useAdminWrite<string>({ resource: "examRooms", action: "Delete exam room", mutationFn: deleteExamRoom, onSuccess: () => { setDeletingRoom(null); setSelectedRoom(null); } });
  const addSeat = useAdminWrite({ resource: "roomSeats", action: "Create seat", mutationFn: () => createRoomSeat(selectedRoom!.examRoomId, seatBody()), onSuccess: closeSeatForm });
  const saveSeat = useAdminWrite({ resource: "roomSeats", action: "Update seat", mutationFn: () => updateRoomSeat(selectedRoom!.examRoomId, editingSeat!.seatId, seatBody()), onSuccess: closeSeatForm });
  const removeSeat = useAdminWrite<string>({ resource: "roomSeats", action: "Delete seat", mutationFn: (id) => deleteRoomSeat(selectedRoom!.examRoomId, id), onSuccess: () => setDeletingSeat(null) });

  const validateRoom = () => {
    const found: string[] = [];
    if (!tenantUniversityId && !editingRoom) found.push("Your university could not be identified. Refresh the room list and try again.");
    if (!roomDraft.roomCode.trim()) found.push("Room code is required.");
    if (!roomDraft.name.trim()) found.push("Room name is required.");
    if (!roomDraft.building.trim()) found.push("Building is required.");
    if (roomDraft.floor && !Number.isInteger(Number(roomDraft.floor))) found.push("Floor must be a whole number.");
    setErrors(found);
    if (!found.length) (creatingRoom ? addRoom : saveRoom).mutate();
  };
  const validateSeat = () => {
    const found: string[] = [];
    if (!seatDraft.seatCode.trim()) found.push("Seat code is required.");
    if (!Number.isInteger(Number(seatDraft.rowNumber)) || Number(seatDraft.rowNumber) < 1) found.push("Row must be a positive whole number.");
    if (!Number.isInteger(Number(seatDraft.columnNumber)) || Number(seatDraft.columnNumber) < 1) found.push("Column must be a positive whole number.");
    setErrors(found);
    if (!found.length) (creatingSeat ? addSeat : saveSeat).mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Exam Rooms & Seats" description="Maintain physical exam rooms and the exact seat inventory used by scheduling and automatic allocation.">
        <Button onClick={() => { setRoomDraft(emptyRoom); setErrors([]); setCreatingRoom(true); }}>
          <Plus aria-hidden /> New room
        </Button>
      </PageHeading>
      <section aria-label="Room summary" className="grid grid-cols-2 gap-3">
        <SummaryCard compact label="Exam rooms" value={rooms.data?.totalCount ?? "Not available"} detail="Current Backend records" icon={<DoorOpen aria-hidden className="size-5" />} />
        <SummaryCard compact label="Selected room seats" value={selectedRoom ? seatRows.length : "—"} detail={selectedRoom ? `${selectedRoom.roomCode ?? "Room"} seat inventory` : "Select a room to inspect seats"} icon={<LayoutGrid aria-hidden className="size-5" />} />
      </section>
      <TablePanel heading="Exam rooms" shown={rows.length} total={rooms.data?.totalCount ?? 0} noun="rooms" tableLabel="Exam rooms table" tableClassName="min-w-[680px]" read={rooms} page={page} pages={rooms.data?.totalPages ?? 1} size={size} onPage={setPage} onSize={(value) => { setSize(value); setPage(1); }}>
        <TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.examRoomId} aria-selected={selectedRoom?.examRoomId === row.examRoomId}>
              <TableCell><p className="font-bold">{row.roomCode ?? "Not available"}</p><p className="mt-1 text-xs text-muted-foreground">{row.name ?? "Not available"}</p></TableCell>
              <TableCell>{row.building ?? "Not available"}{row.floor === null ? "" : ` · Floor ${row.floor}`}</TableCell>
              <TableCell><StatusBadge value={row.isActive ? "Active" : "Inactive"} tone={row.isActive ? "success" : "neutral"} /></TableCell>
              <TableCell><div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setSelectedRoom(row)}>Manage seats</Button>
                <Button variant="ghost" onClick={() => { setEditingRoom(row); setRoomDraft({ roomCode: row.roomCode ?? "", name: row.name ?? "", building: row.building ?? "", floor: row.floor === null ? "" : String(row.floor), isActive: String(row.isActive) }); setErrors([]); }}>Edit</Button>
                <Button variant="ghost" aria-label={`Delete ${row.roomCode ?? "room"}`} onClick={() => setDeletingRoom(row)}><Trash2 aria-hidden /></Button>
              </div></TableCell>
            </TableRow>
          ))}
          {!rows.length && <EmptyRow columns={4} title="No exam rooms are configured." hint="Create the first room, then define its seats." />}
        </TableBody>
      </TablePanel>

      {selectedRoom ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle>{selectedRoom.roomCode} · {selectedRoom.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Seats are saved individually through the room-seat API.</p></div>
              <Button onClick={() => { setSeatDraft(emptySeat); setErrors([]); setCreatingSeat(true); }}><Plus aria-hidden /> Add seat</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReadState pending={seats.isPending} error={seats.error} retry={() => void seats.refetch()} />
            {!seats.isPending && !seats.error ? (
              <Table containerLabel={`${selectedRoom.roomCode} seats`}>
                <TableHeader><TableRow><TableHead>Seat</TableHead><TableHead>Position</TableHead><TableHead>Equipment</TableHead><TableHead>Availability</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {seatRows.map((seat) => (
                    <TableRow key={seat.seatId}><TableCell><strong>{seat.seatCode ?? "Not available"}</strong></TableCell><TableCell>Row {seat.rowNumber} · Column {seat.columnNumber}</TableCell><TableCell>{[seat.hasComputer && "Computer", seat.hasCamera && "Camera"].filter(Boolean).join(" · ") || "Standard seat"}</TableCell><TableCell><StatusBadge value={seat.isAvailable ? "Available" : "Unavailable"} tone={seat.isAvailable ? "success" : "neutral"} /></TableCell><TableCell><div className="flex gap-2"><Button variant="outline" onClick={() => { setEditingSeat(seat); setSeatDraft({ seatCode: seat.seatCode ?? "", rowNumber: String(seat.rowNumber), columnNumber: String(seat.columnNumber), isAvailable: String(seat.isAvailable), hasComputer: String(seat.hasComputer), hasCamera: String(seat.hasCamera), notes: seat.notes ?? "" }); setErrors([]); }}>Edit</Button><Button variant="ghost" aria-label={`Delete ${seat.seatCode ?? "seat"}`} onClick={() => setDeletingSeat(seat)}><Trash2 aria-hidden /></Button></div></TableCell></TableRow>
                  ))}
                  {!seatRows.length && <EmptyRow columns={5} title="This room has no seats yet." hint="Add seats so the scheduling service can allocate candidates." />}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <FormDialog open={creatingRoom || !!editingRoom} onOpenChange={(open) => { if (!open) closeRoomForm(); }} title={creatingRoom ? "New exam room" : "Edit exam room"} description="Room data is used by exam scheduling. Seat capacity comes from the seat inventory below." submitLabel={creatingRoom ? "Create room" : "Save room"} pending={addRoom.isPending || saveRoom.isPending} errors={[...errors, ...((creatingRoom ? addRoom.error : saveRoom.error) ? [describeError((creatingRoom ? addRoom.error : saveRoom.error))] : [])]} onSubmit={validateRoom}>
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Room code" value={roomDraft.roomCode} onChange={(value) => setRoomDraft((old) => ({ ...old, roomCode: value }))} /><TextField label="Room name" value={roomDraft.name} onChange={(value) => setRoomDraft((old) => ({ ...old, name: value }))} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Building" value={roomDraft.building} onChange={(value) => setRoomDraft((old) => ({ ...old, building: value }))} /><TextField label="Floor" type="number" value={roomDraft.floor} onChange={(value) => setRoomDraft((old) => ({ ...old, floor: value }))} /></div>
        <ChoiceField label="Active room" value={roomDraft.isActive} options={yesNo} onChange={(value) => setRoomDraft((old) => ({ ...old, isActive: value }))} />
      </FormDialog>
      <FormDialog open={creatingSeat || !!editingSeat} onOpenChange={(open) => { if (!open) closeSeatForm(); }} title={creatingSeat ? "Add seat" : "Edit seat"} description={`Seat inventory for ${selectedRoom?.roomCode ?? "the selected room"}.`} submitLabel={creatingSeat ? "Add seat" : "Save seat"} pending={addSeat.isPending || saveSeat.isPending} errors={[...errors, ...((creatingSeat ? addSeat.error : saveSeat.error) ? [describeError((creatingSeat ? addSeat.error : saveSeat.error))] : [])]} onSubmit={validateSeat}>
        <div className="grid gap-4 sm:grid-cols-3"><TextField label="Seat code" value={seatDraft.seatCode} onChange={(value) => setSeatDraft((old) => ({ ...old, seatCode: value }))} /><TextField label="Row" type="number" min="1" value={seatDraft.rowNumber} onChange={(value) => setSeatDraft((old) => ({ ...old, rowNumber: value }))} /><TextField label="Column" type="number" min="1" value={seatDraft.columnNumber} onChange={(value) => setSeatDraft((old) => ({ ...old, columnNumber: value }))} /></div>
        <div className="grid gap-4 sm:grid-cols-3"><ChoiceField label="Available" value={seatDraft.isAvailable} options={yesNo} onChange={(value) => setSeatDraft((old) => ({ ...old, isAvailable: value }))} /><ChoiceField label="Computer" value={seatDraft.hasComputer} options={yesNo} onChange={(value) => setSeatDraft((old) => ({ ...old, hasComputer: value }))} /><ChoiceField label="Camera" value={seatDraft.hasCamera} options={yesNo} onChange={(value) => setSeatDraft((old) => ({ ...old, hasCamera: value }))} /></div>
        <TextField label="Notes" multiline value={seatDraft.notes} onChange={(value) => setSeatDraft((old) => ({ ...old, notes: value }))} />
      </FormDialog>
      <ConfirmAction open={!!deletingRoom} onOpenChange={(open) => { if (!open && !removeRoom.isPending) setDeletingRoom(null); }} title="Delete exam room?" description="This removes the room through the Backend. The request can be rejected if schedules still reference it." confirmLabel="Delete room" pending={removeRoom.isPending} onConfirm={() => { if (deletingRoom && !removeRoom.isPending) removeRoom.mutate(deletingRoom.examRoomId); }} />
      <ConfirmAction open={!!deletingSeat} onOpenChange={(open) => { if (!open && !removeSeat.isPending) setDeletingSeat(null); }} title="Delete seat?" description="This seat will no longer be available for candidate allocation." confirmLabel="Delete seat" pending={removeSeat.isPending} onConfirm={() => { if (deletingSeat && !removeSeat.isPending) removeSeat.mutate(deletingSeat.seatId); }} />
    </div>
  );
}

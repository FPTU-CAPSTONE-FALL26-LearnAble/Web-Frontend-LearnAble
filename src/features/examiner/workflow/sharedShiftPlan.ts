export type RoomSlot = { scheduleId: string; roomId: string; roomLabel: string; seats: number };

export type RoomPlan = {
  scheduleId: string;
  roomLabel: string;
  studentIds: string[];
  invigilators: Array<{ lecturerId: string; assignmentRole: "Chief" | "Assistant" }>;
};

export type PeoplePlan = { rooms: RoomPlan[]; problems: string[] };

/**
 * Spreads students and invigilators over the rooms of a shared shift.
 * Students are dealt out one room at a time so the rooms fill evenly, never past their seats.
 * Each room gets its own invigilators; the first of them is the chief.
 */
export function planSharedShiftPeople(input: {
  rooms: RoomSlot[];
  studentIds: string[];
  lecturerIds: string[];
  perRoom: number;
}): PeoplePlan {
  const { rooms, studentIds, lecturerIds, perRoom } = input;
  const problems: string[] = [];
  const seats = rooms.reduce((total, room) => total + room.seats, 0);
  if (!rooms.length) problems.push("This shift has no rooms.");
  if (!studentIds.length) problems.push("Select at least one student.");
  if (studentIds.length > seats) problems.push(`${studentIds.length} students need seats, but the rooms have ${seats}.`);
  const needed = rooms.length * perRoom;
  if (lecturerIds.length < needed) problems.push(`${rooms.length} room${rooms.length === 1 ? "" : "s"} with ${perRoom} invigilator${perRoom === 1 ? "" : "s"} each need ${needed} lecturers, but ${lecturerIds.length} are selected.`);

  const plans: RoomPlan[] = rooms.map((room, index) => ({
    scheduleId: room.scheduleId,
    roomLabel: room.roomLabel,
    studentIds: [],
    invigilators: lecturerIds.slice(index * perRoom, (index + 1) * perRoom).map((lecturerId, position) => ({ lecturerId, assignmentRole: position === 0 ? "Chief" : "Assistant" })),
  }));
  let turn = 0;
  for (const studentId of studentIds) {
    let tried = 0;
    while (tried < plans.length && plans[turn % plans.length].studentIds.length >= rooms[turn % plans.length].seats) {
      turn += 1;
      tried += 1;
    }
    if (tried === plans.length) break;
    plans[turn % plans.length].studentIds.push(studentId);
    turn += 1;
  }
  return { rooms: plans, problems };
}

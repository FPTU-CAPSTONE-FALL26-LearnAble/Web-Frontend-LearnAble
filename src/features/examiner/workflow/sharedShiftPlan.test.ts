import { planSharedShiftPeople, type RoomSlot } from "./sharedShiftPlan";

const room = (id: string, seats: number): RoomSlot => ({ scheduleId: `s-${id}`, roomId: id, roomLabel: `Room ${id}`, seats });
const people = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

describe("planSharedShiftPeople", () => {
  it("deals students out so the rooms fill evenly", () => {
    const plan = planSharedShiftPeople({ rooms: [room("a", 30), room("b", 30)], studentIds: people(7, "st"), lecturerIds: people(2, "l"), perRoom: 1 });
    expect(plan.problems).toEqual([]);
    expect(plan.rooms.map((item) => item.studentIds.length)).toEqual([4, 3]);
    expect(plan.rooms[0].studentIds).toEqual(["st1", "st3", "st5", "st7"]);
  });

  it("never puts more students in a room than it has seats", () => {
    const plan = planSharedShiftPeople({ rooms: [room("small", 2), room("big", 10)], studentIds: people(8, "st"), lecturerIds: people(2, "l"), perRoom: 1 });
    expect(plan.rooms[0].studentIds).toHaveLength(2);
    expect(plan.rooms[1].studentIds).toHaveLength(6);
    expect(plan.problems).toEqual([]);
  });

  it("gives every room its own invigilators with the first as chief", () => {
    const plan = planSharedShiftPeople({ rooms: [room("a", 5), room("b", 5)], studentIds: people(2, "st"), lecturerIds: people(4, "l"), perRoom: 2 });
    expect(plan.rooms[0].invigilators).toEqual([{ lecturerId: "l1", assignmentRole: "Chief" }, { lecturerId: "l2", assignmentRole: "Assistant" }]);
    expect(plan.rooms[1].invigilators.map((item) => item.lecturerId)).toEqual(["l3", "l4"]);
  });

  it("names every shortage instead of planning around it", () => {
    const plan = planSharedShiftPeople({ rooms: [room("a", 2)], studentIds: people(3, "st"), lecturerIds: [], perRoom: 1 });
    expect(plan.problems).toEqual(["3 students need seats, but the rooms have 2.", "1 room with 1 invigilator each need 1 lecturers, but 0 are selected."]);
  });

  it("asks for students when none are selected", () => {
    expect(planSharedShiftPeople({ rooms: [room("a", 5)], studentIds: [], lecturerIds: ["l1"], perRoom: 1 }).problems).toEqual(["Select at least one student."]);
  });
});

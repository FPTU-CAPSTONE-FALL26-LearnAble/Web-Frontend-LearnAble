import { getMyExamSchedules } from "./exams";
import { ApiFailure } from "./client";

const schedule = {
  examScheduleId: "5d000000-0000-4000-8000-000000000001",
  examSubjectId: "5a000000-0000-4000-8000-000000000001",
  examName: "PRO192 — Final Exam",
  examShiftId: "5b000000-0000-4000-8000-000000000001",
  examRoomId: "5c000000-0000-4000-8000-000000000001",
  roomName: "FPTU-EXAM-902",
  startsAt: "2026-11-23T01:00:00Z",
  endsAt: "2026-11-23T02:30:00Z",
  entryOpensAt: "2026-11-23T00:30:00Z",
  entryClosesAt: "2026-11-23T01:15:00Z",
  openedAt: null,
  openedBy: null,
  closedAt: null,
  status: "Published",
  invigilationSlotId: null,
};
const paged = (items: unknown[]) => ({
  items,
  pageNumber: 1,
  pageSize: 100,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});
const reply = (data: unknown, init: ResponseInit = { status: 200 }, success = true) =>
  new Response(JSON.stringify({ success, message: null, data, errors: null }), init);

describe("student exam schedule API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the student's schedules with their seat from /me/exam-schedules", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply(paged([{ schedule, seatCode: "A-12", invigilatorRole: null }])));
    const page = await getMyExamSchedules();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me\/exam-schedules\?Page=1&PageSize=100$/);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].seatCode).toBe("A-12");
    expect(page.items[0].schedule).toMatchObject({ examName: "PRO192 — Final Exam", roomName: "FPTU-EXAM-902", status: "Published" });
  });

  it("accepts the nullable fields of the contract: no seat, no exam or room name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply(paged([{ schedule: { ...schedule, examName: null, roomName: null }, seatCode: null }])),
    );
    const page = await getMyExamSchedules();
    expect(page.items[0].seatCode).toBeNull();
    expect(page.items[0].schedule.examName).toBeNull();
  });

  it("passes the date range filters of the contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(paged([])));
    await getMyExamSchedules({ From: "2026-11-01T00:00:00Z" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("From=2026-11-01T00%3A00%3A00Z");
  });

  it("rejects a schedule status the contract does not define", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply(paged([{ schedule: { ...schedule, status: "Postponed" }, seatCode: null }])),
    );
    await expect(getMyExamSchedules()).rejects.toMatchObject({ detail: { kind: "parse" } });
  });

  it("fails when the session has expired", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, { status: 401 }, false));
    const error = await getMyExamSchedules().catch((e) => e);
    expect(error).toBeInstanceOf(ApiFailure);
    expect(error.detail.kind).toBe("unauthorized");
  });
});

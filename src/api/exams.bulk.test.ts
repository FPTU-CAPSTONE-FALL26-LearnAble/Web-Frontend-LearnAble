import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBulkExamSchedules, deleteExamSchedule, deleteExamShift, previewBulkExamSchedules, type BulkExamScheduleInput } from "./exams";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

const input: BulkExamScheduleInput = {
  requestId: "11111111-1111-4111-8111-111111111111",
  examSubjectId: "22222222-2222-4222-8222-222222222222",
  name: "Morning shift",
  startsAt: "2026-11-08T02:00:00.000Z",
  endsAt: "2026-11-08T04:00:00.000Z",
  entryOpensAt: "2026-11-08T02:00:00.000Z",
  entryClosesAt: "2026-11-08T02:30:00.000Z",
  roomIds: ["33333333-3333-4333-8333-333333333333"],
  students: [{ studentId: "44444444-4444-4444-8444-444444444444", extraTimeMinutes: 0, accommodationNotes: null }],
  lecturerIds: ["55555555-5555-4555-8555-555555555555"],
  invigilationSlotId: "66666666-6666-4666-8666-666666666666",
  invigilatorsPerRoom: 1,
};

describe("bulk exam schedule API", () => {
  beforeEach(() => client.request.mockReset());

  it("previews the exact shared room and people pool", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: {
      requestId: input.requestId, isValid: true, planHash: "plan-hash", rooms: [], unusedRoomIds: [], unusedLecturerIds: [], issues: [],
    } });

    await previewBulkExamSchedules(input);

    expect(client.request).toHaveBeenCalledWith("/examschedules/bulk/preview", expect.anything(), { method: "POST", json: input });
  });

  it("creates from the same request and expected preview hash", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: {
      requestId: input.requestId, planHash: "plan-hash", createdAt: "2026-11-06T00:00:00Z", schedules: [],
    } });

    await createBulkExamSchedules({ ...input, expectedPlanHash: "plan-hash" });

    expect(client.request).toHaveBeenCalledWith("/examschedules/bulk", expect.anything(), {
      method: "POST",
      json: { ...input, expectedPlanHash: "plan-hash" },
    });
  });

  it("deletes only the selected schedule resource", async () => {
    client.request.mockResolvedValue({ success: true, message: "Schedule deleted successfully", errors: null, data: null });

    await deleteExamSchedule("schedule-1");

    expect(client.request).toHaveBeenCalledWith("/examschedules/schedule-1", expect.anything(), { method: "DELETE" });
  });

  it("deletes only the selected unused shift resource", async () => {
    client.request.mockResolvedValue({ success: true, message: "Shift deleted successfully", errors: null, data: null });

    await deleteExamShift("shift-1");

    expect(client.request).toHaveBeenCalledWith("/examshifts/shift-1", expect.anything(), { method: "DELETE" });
  });
});

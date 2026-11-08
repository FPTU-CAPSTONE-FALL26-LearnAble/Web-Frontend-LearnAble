import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

import { deleteInvigilationSlot, updateInvigilationPeriod, updateLecturerAvailability } from "./invigilation";

const periodId = "11111111-1111-1111-1111-111111111111";
const slotId = "22222222-2222-2222-2222-222222222222";
const revision = "33333333-3333-3333-3333-333333333333";
const etag = '"11111111111111111111111111111111-33333333333333333333333333333333"';

describe("invigilation API concurrency", () => {
  beforeEach(() => client.request.mockReset());

  it("updates a period using the Backend ETag format", async () => {
    const input = { semesterId: "semester-1", name: "Fall duty", description: null, examFromDate: "2026-11-10", examToDate: "2026-11-20", registrationOpensAt: "2026-11-01T00:00:00Z", registrationClosesAt: "2026-11-05T00:00:00Z" };
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { periodId, universityId: "university-1", semesterId: input.semesterId, name: input.name, description: null, examFromDate: input.examFromDate, examToDate: input.examToDate, registrationOpensAt: input.registrationOpensAt, registrationClosesAt: input.registrationClosesAt, status: "Draft", canRegister: false, createdBy: "examiner-1", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", revision, slotCount: 0, registrationCount: 0 } });
    await updateInvigilationPeriod(periodId, input, revision);
    expect(client.request).toHaveBeenCalledWith(`/invigilation-periods/${periodId}`, expect.anything(), { method: "PUT", headers: { "If-Match": etag }, json: input });
  });

  it("uses the slot id when deleting a slot", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: null });
    await deleteInvigilationSlot(periodId, slotId, revision);
    expect(client.request).toHaveBeenCalledWith(`/invigilation-periods/${periodId}/slots/${slotId}`, expect.anything(), { method: "DELETE", headers: { "If-Match": '"22222222222222222222222222222222-33333333333333333333333333333333"' } });
  });

  it("keys Lecturer availability concurrency by period", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { periodId, lecturerId: "lecturer-1", status: "Open", canRegister: true, slotIds: [slotId], choices: [], revision } });
    await updateLecturerAvailability(periodId, [slotId], revision);
    expect(client.request).toHaveBeenCalledWith(`/lecturer/invigilation-periods/${periodId}/availability`, expect.anything(), { method: "PUT", headers: { "If-Match": etag }, json: { slotIds: [slotId] } });
  });
});

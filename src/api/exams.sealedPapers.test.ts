import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure } from "@/api/client";
import {
  getShiftPaperSelection,
  handoverSealedPaper,
  releaseShiftPaper,
  sealExamPaper,
  selectShiftPaper,
  withdrawSealedPaper,
} from "./exams";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

const envelope = (data: unknown) => ({ success: true, message: null, errors: null, data });
const paperId = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const shiftId = "33333333-3333-4333-8333-333333333333";
const sealed = {
  versionId, paperId, examSubjectId: "e", subjectId: "s", examTypeId: "t", name: "CSD201 FE", versionNumber: 1, questionCount: 20,
  totalScore: 10, status: "Sealed", sealedAt: "2026-11-13T01:00:00Z", publishedToPoolAt: null, eTag: '"v-1"', semesterId: "m",
  durationMinutes: 90, passScore: 5, cameraRequired: true, scoringPolicy: "Highest",
};
const selection = { selectionId: "a", shiftId, versionId, operationId: "b", selectedAt: "2026-11-13T02:00:00Z", releasedAt: null, consumedAt: null };

describe("sealed paper API", () => {
  beforeEach(() => client.request.mockReset());

  it("seals a paper with its ETag in If-Match", async () => {
    client.request.mockResolvedValue(envelope(sealed));
    await expect(sealExamPaper(paperId, '"p-1"')).resolves.toMatchObject({ versionId });
    expect(client.request).toHaveBeenCalledWith(`/lecturer/exam-papers/${paperId}/seal`, expect.anything(), { method: "POST", headers: { "If-Match": '"p-1"' } });
  });

  it("hands a package over and takes it back with the version ETag", async () => {
    client.request.mockResolvedValue(envelope(sealed));
    await handoverSealedPaper(paperId, versionId, '"v-1"');
    await withdrawSealedPaper(paperId, versionId, '"v-1"');
    expect(client.request).toHaveBeenNthCalledWith(1, `/lecturer/exam-papers/${paperId}/versions/${versionId}/handover`, expect.anything(), { method: "POST", headers: { "If-Match": '"v-1"' } });
    expect(client.request).toHaveBeenNthCalledWith(2, `/lecturer/exam-papers/${paperId}/versions/${versionId}/withdraw`, expect.anything(), { method: "POST", headers: { "If-Match": '"v-1"' } });
  });

  it("asks the Backend to attach a package with only an idempotency key", async () => {
    client.request.mockResolvedValue(envelope(selection));
    await selectShiftPaper(shiftId, '"s-1"', "44444444-4444-4444-8444-444444444444");
    expect(client.request).toHaveBeenCalledWith(`/exam-shifts/${shiftId}/paper-selection`, expect.anything(), {
      method: "POST",
      headers: { "If-Match": '"s-1"' },
      json: { operationId: "44444444-4444-4444-8444-444444444444" },
    });
  });

  it("reports no package when none was attached or it was released", async () => {
    client.request.mockRejectedValueOnce(new ApiFailure({ kind: "not_found" }));
    await expect(getShiftPaperSelection(shiftId)).resolves.toBeNull();
    client.request.mockResolvedValueOnce(envelope({ ...selection, releasedAt: "2026-11-13T03:00:00Z" }));
    await expect(getShiftPaperSelection(shiftId)).resolves.toBeNull();
    client.request.mockResolvedValueOnce(envelope(selection));
    await expect(getShiftPaperSelection(shiftId)).resolves.toMatchObject({ versionId });
  });

  it("releases a package with the shift ETag", async () => {
    client.request.mockResolvedValue(envelope({ shiftId, name: null, startsAt: "a", endsAt: "b", publishedAt: null, openedAt: null, status: "Draft", eTag: '"s-2"', scheduleIds: null, examSubjectId: "e" }));
    await expect(releaseShiftPaper(shiftId, '"s-1"')).resolves.toMatchObject({ shiftId });
    expect(client.request).toHaveBeenCalledWith(`/exam-shifts/${shiftId}/paper-selection/release`, expect.anything(), { method: "POST", headers: { "If-Match": '"s-1"' } });
  });

  it("does not hide a real failure behind an empty package", async () => {
    client.request.mockRejectedValueOnce(new ApiFailure({ kind: "server", status: 500 }));
    await expect(getShiftPaperSelection(shiftId)).rejects.toThrow("api:server");
  });
});

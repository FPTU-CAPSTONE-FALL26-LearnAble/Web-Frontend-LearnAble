import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyExamShiftAllocation, createDraftFromSealedPaper, getSealedExamPaper, previewExamShiftAllocation } from "./exams";
import { createAttemptRecording, getRecordingPolicy, submitRecordingConsent } from "./proctoring";
import { createShortcut, deleteShortcut, getShortcutCatalog, updateShortcut } from "./shortcuts";

const client = vi.hoisted(() => ({ request: vi.fn(), requestBlob: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request, requestBlob: client.requestBlob };
});

const envelope = (data: unknown) => ({ success: true, message: null, errors: null, data });

describe("new server API contracts", () => {
  beforeEach(() => {
    client.request.mockReset();
    client.requestBlob.mockReset();
  });

  it("previews and applies a shift allocation with the plan hash and ETag", async () => {
    const input = { requestId: "r", students: [], lecturerIds: ["l"], invigilatorsPerRoom: 1 };
    const plan = { shiftId: "s", requestId: "r", revision: 1, eTag: '"s-1"', isValid: true, planHash: "hash", rooms: [], unusedLecturerIds: [], issues: [] };
    client.request.mockResolvedValueOnce(envelope(plan)).mockResolvedValueOnce(envelope({ ...plan, appliedAt: "2026-11-15T10:00:00Z" }));

    await previewExamShiftAllocation("s", input);
    await applyExamShiftAllocation("s", { ...input, expectedPlanHash: "hash" }, '"s-1"');

    expect(client.request).toHaveBeenNthCalledWith(1, "/exam-shifts/s/allocation/preview", expect.anything(), { method: "POST", json: input });
    expect(client.request).toHaveBeenNthCalledWith(2, "/exam-shifts/s/allocation", expect.anything(), {
      method: "POST", headers: { "If-Match": '"s-1"' }, json: { ...input, expectedPlanHash: "hash" },
    });
  });

  it("reads a sealed version and creates a new editable draft", async () => {
    client.request.mockResolvedValueOnce(envelope({
      versionId: "v", paperId: "p", examSubjectId: "e", subjectId: "s", examTypeId: "t", name: null,
      versionNumber: 1, questionCount: 1, totalScore: 10, status: "Sealed", sealedAt: "now", publishedToPoolAt: null,
      eTag: null, semesterId: "m", durationMinutes: 90, passScore: 5, cameraRequired: true, scoringPolicy: null,
    })).mockResolvedValueOnce(envelope({
      examPaperId: "draft", examSubjectId: "e", paperCode: null, name: null, version: 2, status: "Draft",
      publishedAt: null, createdAt: "now", totalScore: 0, questions: [], eTag: null,
    }));
    await getSealedExamPaper("v");
    await createDraftFromSealedPaper("p", "v");
    expect(client.request).toHaveBeenNthCalledWith(1, "/sealed-exam-papers/v", expect.anything(), undefined);
    expect(client.request).toHaveBeenNthCalledWith(2, "/lecturer/exam-papers/p/versions/v/draft", expect.anything(), { method: "POST" });
  });

  it("creates and updates personal shortcuts with optimistic concurrency", async () => {
    client.request.mockResolvedValue(envelope({ shortcutId: "x", actionCode: "NEXT", keyCombination: "Alt+N", isEnabled: true, createdAt: "a", updatedAt: "b", eTag: '"x-1"' }));
    await createShortcut({ actionCode: "NEXT", keyCombination: "Alt+N", isEnabled: true });
    await updateShortcut("x", { actionCode: "NEXT", keyCombination: "Alt+Right", isEnabled: true }, '"x-1"');
    await deleteShortcut("x", '"x-2"');
    expect(client.request.mock.calls[1][2]).toMatchObject({ method: "PUT", headers: { "If-Match": '"x-1"' } });
    expect(client.request.mock.calls[2][2]).toMatchObject({ method: "DELETE", headers: { "If-Match": '"x-2"' } });
  });

  it("loads the shortcut catalog and recording policy, records consent, and starts a recording", async () => {
    client.request
      .mockResolvedValueOnce(envelope({ actions: [], keyCodes: [], modifierOrder: [], reservedCombinations: [], requiresControlAltOrMeta: true }))
      .mockResolvedValueOnce(envelope({ enabled: true, recordingRequired: true, cameraUnavailablePolicy: "Block", policyVersion: "1", retentionDays: 30, consentAccepted: false, uploadGraceSeconds: 60, segmentDurationSeconds: 10, uploadJitterMaxSeconds: 2, maxSegmentSizeBytes: 1000 }))
      .mockResolvedValueOnce(envelope({ scheduleId: "s", recordingConsentAt: "now", policyVersion: "1" }))
      .mockResolvedValueOnce(envelope({ recordingId: "r", attemptId: "a", status: "Uploading", revision: "rev", startedAt: "now", completedAt: null, expiresAt: "later", uploadDeadlineAt: "later", lastSequenceNumber: null, segmentDurationSeconds: 10, uploadJitterMaxSeconds: 2, maxSegmentSizeBytes: 1000, maxSegmentsPerRecording: 50, policyVersion: "1", segments: null, missingSequenceNumbers: [] }));
    await getShortcutCatalog();
    await getRecordingPolicy("s");
    await submitRecordingConsent("s", true, "1");
    await createAttemptRecording("a", "client-r");
    expect(client.request.mock.calls[2][2]).toMatchObject({ method: "POST", json: { accepted: true, policyVersion: "1" } });
    expect(client.request.mock.calls[3][2]).toMatchObject({ method: "POST", json: { clientRecordingId: "client-r" } });
  });
});

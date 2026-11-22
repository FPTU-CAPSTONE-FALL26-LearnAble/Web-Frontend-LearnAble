import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExamCameraPolicy, updateExamCameraPolicy } from "./exams";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

const examSubjectId = "22222222-2222-4222-8222-222222222222";
const policy = { examSubjectId, cameraRequired: true, cameraUnavailablePolicy: "AllowWithFlag", eTag: '"abc"' };
const envelope = (data: unknown) => ({ success: true, message: null, errors: null, data });

describe("exam camera policy API", () => {
  beforeEach(() => client.request.mockReset());

  it("reads the camera policy of an exam subject", async () => {
    client.request.mockResolvedValue(envelope(policy));
    await expect(getExamCameraPolicy(examSubjectId)).resolves.toEqual(policy);
    expect(client.request).toHaveBeenCalledWith(`/examsubjects/${examSubjectId}/camera-policy`, expect.anything(), undefined);
  });

  it("updates the camera policy with the ETag in If-Match", async () => {
    const input = { cameraRequired: false, cameraUnavailablePolicy: "Allow" as const };
    client.request.mockResolvedValue(envelope({ ...policy, ...input }));
    await updateExamCameraPolicy(examSubjectId, input, '"abc"');
    expect(client.request).toHaveBeenCalledWith(`/examsubjects/${examSubjectId}/camera-policy`, expect.anything(), {
      method: "PUT",
      headers: { "If-Match": '"abc"' },
      json: input,
    });
  });

  it("rejects a camera policy value the Backend does not define", async () => {
    client.request.mockResolvedValue(envelope({ ...policy, cameraUnavailablePolicy: "Maybe" }));
    await expect(getExamCameraPolicy(examSubjectId)).rejects.toThrow();
  });
});

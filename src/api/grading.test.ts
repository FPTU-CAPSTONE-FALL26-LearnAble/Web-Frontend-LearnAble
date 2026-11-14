import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

import { getLecturerGradingAssignments } from "./grading";

describe("grading API", () => {
  beforeEach(() => client.request.mockReset());

  it("accepts the current Backend assignment completion fields", async () => {
    const assignment = {
      attemptId: "11111111-1111-1111-1111-111111111111",
      revision: "22222222-2222-2222-2222-222222222222",
      lecturerId: "33333333-3333-3333-3333-333333333333",
      assignedBy: null,
      assignedAt: "2026-11-07T12:00:00Z",
      assignmentNote: null,
      gradingStatus: "ManualReview",
      markingCompletedAt: "2026-11-07T13:00:00Z",
      markingCompletedBy: "33333333-3333-3333-3333-333333333333",
    };
    client.request.mockResolvedValue({
      success: true,
      message: null,
      errors: null,
      data: { items: [assignment], totalCount: 1, pageNumber: 1, pageSize: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    await expect(getLecturerGradingAssignments()).resolves.toMatchObject({ items: [assignment] });
    expect(client.request).toHaveBeenCalledWith("/lecturer/grading-assignments?Page=1&PageSize=100", expect.anything(), undefined);
  });
});

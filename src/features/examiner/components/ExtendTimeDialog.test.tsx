import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExtendTimeDialog } from "./ExtendTimeDialog";

const api = vi.hoisted(() => ({
  getAttemptTimeExtension: vi.fn(),
  extendAttemptTime: vi.fn(),
}));

vi.mock("@/api/timeExtensions", () => api);

function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ExtendTimeDialog attemptId="attempt-1" studentName="Nguyen Van A" />
    </QueryClientProvider>,
  );
}

describe("ExtendTimeDialog", () => {
  it("adds time to an active attempt without leaving monitoring", async () => {
    api.getAttemptTimeExtension.mockResolvedValue({
      attemptId: "attempt-1",
      enrollmentId: "enrollment-1",
      scheduleId: "schedule-1",
      studentId: "student-1",
      status: "InProgress",
      startedAt: "2026-11-23T08:00:00Z",
      deadlineAt: "2026-11-23T09:30:00Z",
      shiftEndsAt: "2026-11-23T10:00:00Z",
      extraTimeMinutes: 5,
      enrollmentExtraTimeMinutes: 0,
      serverNow: "2026-11-23T09:00:00Z",
      remainingSeconds: 1800,
      canExtend: true,
      maxAdditionalMinutes: 30,
      revision: "revision-1",
    });
    api.extendAttemptTime.mockResolvedValue({});
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole("button", { name: "Add time" }));
    expect(await screen.findAllByText("30 min")).toHaveLength(2);
    await user.clear(screen.getByLabelText("Additional minutes"));
    await user.type(screen.getByLabelText("Additional minutes"), "15");
    await user.type(
      screen.getByLabelText("Reason"),
      "Approved accessibility accommodation",
    );
    await user.click(screen.getByRole("button", { name: "Add 15 minutes" }));

    await waitFor(() =>
      expect(api.extendAttemptTime).toHaveBeenCalledWith(
        "attempt-1",
        "revision-1",
        expect.objectContaining({
          additionalMinutes: 15,
          reason: "Approved accessibility accommodation",
        }),
      ),
    );
  });
});

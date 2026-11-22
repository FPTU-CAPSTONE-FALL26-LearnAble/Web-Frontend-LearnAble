import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProctoringPolicyRoute } from "./ProctoringPolicyRoute";

const exams = vi.hoisted(() => ({ getExamSubjects: vi.fn(), getExamCameraPolicy: vi.fn(), updateExamCameraPolicy: vi.fn(async () => ({})) }));
vi.mock("@/api/exams", () => exams);

const subject = (id: string, name: string, status = "Ready") => ({ examSubjectId: id, name, status, durationMinutes: 90 });

function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ProctoringPolicyRoute /></QueryClientProvider>);
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = () => {};
});
beforeEach(() => {
  vi.clearAllMocks();
  exams.getExamSubjects.mockResolvedValue({ items: [subject("x1", "CSD201 FE"), subject("x2", "Old exam", "Archived")] });
  exams.getExamCameraPolicy.mockResolvedValue({ examSubjectId: "x1", cameraRequired: true, cameraUnavailablePolicy: "Block", eTag: '"p-1"' });
});

describe("ProctoringPolicyRoute", () => {
  it("lists the exams that are not archived with their current policy", async () => {
    show();
    expect(await screen.findByRole("article", { name: "CSD201 FE" })).toBeInTheDocument();
    expect(screen.queryByText("Old exam")).not.toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: "Camera is required" })).toBeChecked();
    expect(screen.getByText("The student cannot start without a working camera.")).toBeInTheDocument();
  });

  it("saves a change with the policy ETag and keeps Save off until something changes", async () => {
    const user = userEvent.setup();
    show();
    const save = await screen.findByRole("button", { name: "Save policy" });
    expect(save).toBeDisabled();
    await user.click(screen.getByLabelText("When the camera is not available"));
    await user.click(await screen.findByRole("option", { name: "Allow and flag the session" }));
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    await waitFor(() => expect(exams.updateExamCameraPolicy).toHaveBeenCalledWith("x1", { cameraRequired: true, cameraUnavailablePolicy: "AllowWithFlag" }, '"p-1"'));
  });

  it("switching the camera off disables the fallback choice", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("checkbox", { name: "Camera is required" }));
    expect(screen.getByLabelText("When the camera is not available")).toBeDisabled();
    expect(screen.getByText("Not used while the camera is not required.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByRole("checkbox", { name: "Camera is required" })).toBeChecked();
  });

  it("says so when there is no exam configuration yet", async () => {
    exams.getExamSubjects.mockResolvedValue({ items: [] });
    show();
    expect(await screen.findByText(/No exam configuration exists yet/)).toBeInTheDocument();
  });
});

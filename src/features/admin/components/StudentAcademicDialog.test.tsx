import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Major, StudentProfile } from "@/api/admin";
import { ApiFailure } from "@/api/client";

// Selecting options is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({ getCurriculums: vi.fn(), updateStudentAcademic: vi.fn() }));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { StudentAcademicDialog } from "./StudentAcademicDialog";

const revision = "22222222-2222-4222-8222-222222222222";
const profile = { userId: "u1", majorId: "m1", curriculumId: "c1", intakeYear: 2026, academicRevision: revision } as StudentProfile;
const majors = [
  { majorId: "m1", majorCode: "SE", majorName: "Software Engineering" },
  { majorId: "m2", majorCode: "AI", majorName: "Artificial Intelligence" },
] as Major[];
const curriculum = (curriculumId: string, majorId: string, curriculumCode: string) => ({ curriculumId, majorId, curriculumCode, version: "1.0", intakeYear: 2026 });
const all = [curriculum("c1", "m1", "SE-2026"), curriculum("c2", "m2", "AI-2026")];
const page = (items: unknown[]) => ({ items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const onClose = vi.fn();

function renderDialog(currentCurriculumLabel: string | null = "SE-2026 · 1.0") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentAcademicDialog profile={profile} studentLabel="SV001 · Student One" currentCurriculumLabel={currentCurriculumLabel} majors={majors} onClose={onClose} />
    </QueryClientProvider>,
  );
}
const combo = (name: string) => screen.getByRole("combobox", { name });

beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  onClose.mockReset();
  api.getCurriculums.mockImplementation(async (filters: { MajorId?: string }) => page(all.filter((row) => !filters.MajorId || row.majorId === filters.MajorId)));
  api.updateStudentAcademic.mockResolvedValue(undefined);
});

describe("StudentAcademicDialog", () => {
  it("starts from the student's current academic record", async () => {
    renderDialog();
    expect(combo("Major of student")).toHaveTextContent("SE · Software Engineering");
    await waitFor(() => expect(combo("Curriculum of student")).toHaveTextContent("SE-2026 · 1.0 · 2026"));
    expect(screen.getByLabelText("Intake year of student")).toHaveValue(2026);
    expect(screen.getByText(/SV001 · Student One/)).toBeInTheDocument();
  });

  it("saves a corrected intake year with the academic revision and closes", async () => {
    const user = userEvent.setup();
    renderDialog();
    fireEvent.change(screen.getByLabelText("Intake year of student"), { target: { value: "2027" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateStudentAcademic).toHaveBeenCalledTimes(1));
    expect(api.updateStudentAcademic).toHaveBeenCalledWith("u1", { majorId: "m1", curriculumId: "c1", intakeYear: 2027 }, revision);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("clears the curriculum when the major changes and requires a new one", async () => {
    const user = userEvent.setup();
    renderDialog();
    await waitFor(() => expect(combo("Curriculum of student")).toBeEnabled());
    await user.click(combo("Major of student"));
    await user.click(await screen.findByRole("option", { name: "AI · Artificial Intelligence" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Curriculum is required.")).toBeInTheDocument();
    expect(api.updateStudentAcademic).not.toHaveBeenCalled();
    await waitFor(() => expect(combo("Curriculum of student")).toBeEnabled());
    await user.click(combo("Curriculum of student"));
    await user.click(await screen.findByRole("option", { name: /AI-2026/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateStudentAcademic).toHaveBeenCalled());
    expect(api.updateStudentAcademic).toHaveBeenCalledWith("u1", { majorId: "m2", curriculumId: "c2", intakeYear: 2026 }, revision);
  });

  it.each(["1899", "2101", "", "20.5"])("refuses an intake year of %j", async (value) => {
    const user = userEvent.setup();
    renderDialog();
    fireEvent.change(screen.getByLabelText("Intake year of student"), { target: { value } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect((await screen.findAllByText("Intake year must be a year from 1900 to 2100.")).length).toBeGreaterThan(0);
    expect(api.updateStudentAcademic).not.toHaveBeenCalled();
  });

  it("asks for a change before saving", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Change the major, curriculum or intake year before saving.")).toBeInTheDocument();
    expect(api.updateStudentAcademic).not.toHaveBeenCalled();
  });

  it("still shows the current curriculum when the curriculum list does not include it", async () => {
    api.getCurriculums.mockResolvedValue(page([]));
    renderDialog("SE-2026 · 1.0");
    await waitFor(() => expect(combo("Curriculum of student")).toHaveTextContent("SE-2026 · 1.0"));
  });

  it("shows the Backend's reason and stays open when the save is rejected", async () => {
    api.updateStudentAcademic.mockRejectedValue(new ApiFailure({ kind: "server", status: 412 }, "Resource changed. Reload and retry."));
    const user = userEvent.setup();
    renderDialog();
    fireEvent.change(screen.getByLabelText("Intake year of student"), { target: { value: "2027" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Resource changed. Reload and retry./)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Intake year of student")).toHaveValue(2027);
  });
});

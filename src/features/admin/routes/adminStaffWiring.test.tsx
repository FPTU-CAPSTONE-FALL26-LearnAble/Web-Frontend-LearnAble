import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/authStore";

// Opening dialogs is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  getAdminSubjects: vi.fn(),
  getAdminUsers: vi.fn(),
  getCurriculumSubjects: vi.fn(),
  getCurriculums: vi.fn(),
  getMajors: vi.fn(),
  getStudentProfiles: vi.fn(),
  setCurriculumSubjects: vi.fn(),
  updateStudentAcademic: vi.fn(),
}));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { CurriculumsRoute } from "./CurriculumsRoute";
import { StudentProfilesRoute } from "./StudentProfilesRoute";

const page = (items: unknown[]) => ({ items, pageNumber: 1, pageSize: 10, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const curriculum = {
  curriculumId: "c1",
  majorId: "m1",
  curriculumCode: "SE-2026",
  curriculumName: "Software Engineering",
  version: "1.0",
  intakeYear: 2026,
  effectiveFrom: null,
  effectiveTo: null,
  status: "Active",
  approvedBy: null,
  approvedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderAs(role: "Staff" | "Admin", element: ReactNode) {
  useAuthStore.setState({ user: { id: "viewer-1", fullName: "Viewer", email: "viewer@fpt.edu.vn", role, universityId: "uni-1" } });
  const router = createMemoryRouter([{ path: "/", element }], { initialEntries: ["/"] });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getMajors.mockResolvedValue(page([{ majorId: "m1", departmentId: "d1", majorCode: "SE", majorName: "Software Engineering" }]));
  api.getCurriculums.mockResolvedValue(page([curriculum]));
  api.getAdminSubjects.mockResolvedValue(page([{ subjectId: "s1", subjectCode: "SE101", subjectNameEn: "Intro", isActive: true }]));
  api.getCurriculumSubjects.mockResolvedValue({ subjectIds: [], revision: null });
  api.getAdminUsers.mockResolvedValue(page([{ userId: "u1", userCode: "SV001", fullName: "Student One", role: "Student", status: "Active" }]));
  api.getStudentProfiles.mockResolvedValue(page([{ userId: "u1", majorId: "m1", curriculumId: "c1", intakeYear: 2026, enrollmentStatus: "Studying", academicRevision: "rev", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }]));
  api.setCurriculumSubjects.mockResolvedValue(undefined);
  api.updateStudentAcademic.mockResolvedValue(undefined);
});

describe.each(["Staff", "Admin"] as const)("Curriculum subject assignment as %s", (role) => {
  it("opens the subject manager from an enabled button and saves", async () => {
    const user = userEvent.setup();
    renderAs(role, <CurriculumsRoute />);
    const button = await screen.findByRole("button", { name: "Manage subjects of SE-2026" });
    expect(button).toBeEnabled();
    await user.click(button);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Manage subjects");
    expect(dialog).toHaveTextContent("SE-2026");
    await user.click(await within(dialog).findByRole("checkbox", { name: /SE101/ }));
    await user.click(within(dialog).getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(api.setCurriculumSubjects).toHaveBeenCalledWith("c1", ["s1"], null));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Curriculum row actions", () => {
  const rowFor = async (code: string) => (await screen.findByText(code)).closest("tr") as HTMLElement;

  it("keeps every action in one compact row of icon buttons that still have names", async () => {
    api.getCurriculums.mockResolvedValue(page([{ ...curriculum, status: "Draft" }]));
    renderAs("Staff", <CurriculumsRoute />);
    const row = await rowFor("SE-2026");
    const labels = within(row).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual(["Edit SE-2026", "Manage subjects of SE-2026", "Approve SE-2026", "Archive SE-2026"]);
    expect(within(row).getByRole("button", { name: "Archive SE-2026" })).toHaveAttribute("title", "Archive");
  });

  it("offers Archive but not Approve on an active curriculum", async () => {
    renderAs("Staff", <CurriculumsRoute />);
    const row = await rowFor("SE-2026");
    expect(within(row).queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Archive/ })).toBeInTheDocument();
  });

  it("explains that an archived curriculum cannot be reopened yet", async () => {
    api.getCurriculums.mockResolvedValue(page([{ ...curriculum, status: "Archived" }]));
    renderAs("Staff", <CurriculumsRoute />);
    const row = await rowFor("SE-2026");
    expect(within(row).getByText("Reopening is not available yet.")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Archive|Approve/ })).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Edit/ })).toBeInTheDocument();
  });
});

describe("Student profile academic edit", () => {
  it("opens the academic record editor from the table and saves", async () => {
    const user = userEvent.setup();
    renderAs("Staff", <StudentProfilesRoute />);
    await user.click(await screen.findByRole("button", { name: /Edit academic record of SV001/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Edit academic record");
    await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Curriculum of student" })).toBeEnabled());
    const year = within(dialog).getByLabelText("Intake year of student");
    await user.clear(year);
    await user.type(year, "2027");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateStudentAcademic).toHaveBeenCalledWith("u1", { majorId: "m1", curriculumId: "c1", intakeYear: 2027 }, "rev"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("no longer calls the academic record permanent when creating a profile", async () => {
    const user = userEvent.setup();
    renderAs("Staff", <StudentProfilesRoute />);
    await user.click(await screen.findByRole("button", { name: "New student profile" }));
    expect(await screen.findByRole("dialog")).not.toHaveTextContent(/permanent/);
  });
});

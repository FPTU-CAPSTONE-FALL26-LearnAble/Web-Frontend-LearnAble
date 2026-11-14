import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure } from "@/api/client";
import { useAuthStore } from "@/features/auth/store/authStore";

// Typing into dialogs is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  activateUser: vi.fn(),
  changeUserRole: vi.fn(),
  deactivateUser: vi.fn(),
  getAdminUsers: vi.fn(),
  getCurriculums: vi.fn(),
  getDepartments: vi.fn(),
  getMajors: vi.fn(),
  getUniversityLookup: vi.fn(),
  resetUserPassword: vi.fn(),
}));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { UsersRoute } from "./UsersRoute";

const page = (items: unknown[]) => ({ items, pageNumber: 1, pageSize: 10, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const account = (userId: string, fullName: string, role: string, status = "Active") => ({
  userId,
  revision: `${userId}-rev`,
  universityId: "uni-1",
  userCode: userId.toUpperCase(),
  email: `${userId}@fpt.edu.vn`,
  fullName,
  phone: null,
  dateOfBirth: null,
  gender: null,
  role,
  status,
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
});
const accounts = [
  account("u1", "Student One", "Student"),
  account("u2", "Student Two", "Student", "Inactive"),
  account("u3", "Lecturer Three", "Lecturer"),
  account("u4", "Admin Four", "Admin"),
  account("u5", "Staff Five", "Staff"),
];

function renderAs(role: "Staff" | "Admin", id = "viewer-1") {
  useAuthStore.setState({ user: { id, fullName: "Viewer", email: "viewer@fpt.edu.vn", role, universityId: "uni-1" } });
  const router = createMemoryRouter([{ path: "/", element: <UsersRoute /> }], { initialEntries: ["/"] });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
const rowOf = async (name: string) => (await screen.findByText(name)).closest("tr") as HTMLElement;
const names = (row: HTMLElement) => within(row).queryAllByRole("button").map((button) => button.textContent);

beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getAdminUsers.mockResolvedValue(page(accounts));
  api.getUniversityLookup.mockResolvedValue(page([{ universityId: "uni-1", code: "FPTU", name: "FPT University" }]));
  api.getDepartments.mockResolvedValue(page([]));
  api.getMajors.mockResolvedValue(page([]));
  api.getCurriculums.mockResolvedValue(page([]));
  [api.activateUser, api.changeUserRole, api.deactivateUser, api.resetUserPassword].forEach((mock) => mock.mockResolvedValue(undefined));
});

describe("Account actions on the Users screen", () => {
  it("offers Reactivate only on inactive accounts a Staff member may manage", async () => {
    renderAs("Staff");
    expect(names(await rowOf("Student Two"))).toContain("Reactivate");
    expect(names(await rowOf("Student One"))).not.toContain("Reactivate");
    expect(names(await rowOf("Lecturer Three"))).not.toContain("Reactivate");
  });

  it("reactivates an account after confirmation, sending its revision", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student Two")).getByRole("button", { name: "Reactivate" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Reactivate account?");
    expect(api.activateUser).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Reactivate" }));
    await waitFor(() => expect(api.activateUser).toHaveBeenCalledWith("u2", "u2-rev"));
  });

  it("says deactivation can be undone now that reactivation exists", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Deactivate" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/reactivate the account later/);
  });

  it("hides every sensitive action on Admin and Staff accounts from a Staff member", async () => {
    renderAs("Staff");
    for (const name of ["Admin Four", "Staff Five"]) {
      const labels = names(await rowOf(name));
      expect(labels).not.toContain("Reset password");
      expect(labels).not.toContain("Change role");
      expect(labels).not.toContain("Reactivate");
    }
    expect(names(await rowOf("Student One"))).toEqual(expect.arrayContaining(["Reset password", "Change role"]));
  });

  it("does not let an account reset its own password or change its own role", async () => {
    renderAs("Admin", "u3");
    const own = names(await rowOf("Lecturer Three"));
    expect(own).not.toContain("Reset password");
    expect(own).not.toContain("Change role");
    expect(names(await rowOf("Student One"))).toEqual(expect.arrayContaining(["Reset password", "Change role"]));
  });

  it("resets a password with a temporary password and a reason", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Reset password" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Temporary password"), "Temp#2026");
    await user.type(within(dialog).getByLabelText("Reason"), "Locked out before the exam");
    await user.click(within(dialog).getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(api.resetUserPassword).toHaveBeenCalledTimes(1));
    expect(api.resetUserPassword).toHaveBeenCalledWith("u1", { temporaryPassword: "Temp#2026", reason: "Locked out before the exam" }, "u1-rev");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("checks the temporary password and the reason before calling the API", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Reset password" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Temporary password"), "short");
    await user.click(within(dialog).getByRole("button", { name: "Reset password" }));
    expect(await within(dialog).findByText("The temporary password must be at least 8 characters.")).toBeInTheDocument();
    expect(within(dialog).getByText("Give a reason for this change.")).toBeInTheDocument();
    expect(api.resetUserPassword).not.toHaveBeenCalled();
  });

  it("refuses a reason longer than 500 characters", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Reset password" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Temporary password"), "Temp#2026");
    await user.click(within(dialog).getByLabelText("Reason"));
    await user.paste("x".repeat(501));
    await user.click(within(dialog).getByRole("button", { name: "Reset password" }));
    expect(await within(dialog).findByText("The reason must be 500 characters or fewer.")).toBeInTheDocument();
    expect(api.resetUserPassword).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the reason when the Backend rejects the reset", async () => {
    api.resetUserPassword.mockRejectedValue(new ApiFailure({ kind: "server", status: 400 }, "Password does not meet the policy."));
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Reset password" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Temporary password"), "password");
    await user.type(within(dialog).getByLabelText("Reason"), "Forgot it");
    await user.click(within(dialog).getByRole("button", { name: "Reset password" }));
    expect(await within(dialog).findByText(/Password does not meet the policy\./)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("changes a role to another managed role with a reason", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Change role" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/currently Student/);
    await user.click(within(dialog).getByRole("combobox", { name: "New role" }));
    expect(screen.queryByRole("option", { name: "Student" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Admin" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "Examiner" }));
    await user.type(within(dialog).getByLabelText("Reason"), "Moved to exam operations");
    await user.click(within(dialog).getByRole("button", { name: "Change role" }));
    await waitFor(() => expect(api.changeUserRole).toHaveBeenCalledTimes(1));
    expect(api.changeUserRole).toHaveBeenCalledWith("u1", { role: "Examiner", reason: "Moved to exam operations" }, "u1-rev");
  });

  it("requires a reason to change a role", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Change role" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Change role" }));
    expect(await screen.findByText("Give a reason for this change.")).toBeInTheDocument();
    expect(api.changeUserRole).not.toHaveBeenCalled();
  });

  it("lets an Admin choose Staff and Admin roles too", async () => {
    const user = userEvent.setup();
    renderAs("Admin");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Change role" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("combobox", { name: "New role" }));
    expect(await screen.findByRole("option", { name: "Staff" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
  });

  it("explains that the Backend decides about linked profiles", async () => {
    const user = userEvent.setup();
    renderAs("Staff");
    await user.click(within(await rowOf("Student One")).getByRole("button", { name: "Change role" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/Backend applies its own rules for any linked student or lecturer profile/);
  });
});

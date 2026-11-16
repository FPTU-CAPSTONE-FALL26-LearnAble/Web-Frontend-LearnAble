import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure } from "@/api/client";
import { useAuthStore } from "@/features/auth/store/authStore";

const api = vi.hoisted(() => ({ getUniversityExamPolicy: vi.fn(), updateUniversityExamPolicy: vi.fn() }));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { StaffPolicyRoute } from "./StaffPolicyRoute";

const revision = "22222222-2222-4222-8222-222222222222";
const policy = { defaultDurationMinutes: 120, shuffleQuestions: false, shuffleOptions: true, scoringPolicy: "AllOrNothing", cameraRequired: true, cameraUnavailablePolicy: "Block", revision };

function renderRoute(universityId: string | undefined = "uni-1") {
  useAuthStore.setState({ user: { id: "staff-1", fullName: "Staff One", email: "staff@fpt.edu.vn", role: "Staff", universityId } });
  const router = createMemoryRouter([{ path: "/", element: <StaffPolicyRoute /> }], { initialEntries: ["/"] });
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
  api.updateUniversityExamPolicy.mockResolvedValue(undefined);
});

describe("Default exam policy", () => {
  it("shows the saved policy and offers no save button until something changes", async () => {
    api.getUniversityExamPolicy.mockResolvedValue(policy);
    renderRoute();
    expect(await screen.findByLabelText("Default duration (minutes)")).toHaveValue(120);
    expect(screen.getByRole("checkbox", { name: "Shuffle questions" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Shuffle answer options" })).toBeChecked();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save defaults" })).not.toBeInTheDocument();
    expect(api.getUniversityExamPolicy).toHaveBeenCalledWith("uni-1");
  });

  it("starts from the built-in defaults when no policy has been saved", async () => {
    api.getUniversityExamPolicy.mockResolvedValue(null);
    renderRoute();
    expect(await screen.findByLabelText("Default duration (minutes)")).toHaveValue(90);
    expect(screen.getByText("Built-in defaults, not saved yet")).toBeInTheDocument();
  });

  it("saves the edited policy with the revision, then shows it as saved", async () => {
    api.getUniversityExamPolicy.mockResolvedValueOnce(policy).mockResolvedValue({ ...policy, defaultDurationMinutes: 150, revision: "33333333-3333-4333-8333-333333333333" });
    const user = userEvent.setup();
    renderRoute();
    fireEvent.change(await screen.findByLabelText("Default duration (minutes)"), { target: { value: "150" } });
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save defaults" }));
    await waitFor(() => expect(api.updateUniversityExamPolicy).toHaveBeenCalledTimes(1));
    expect(api.updateUniversityExamPolicy).toHaveBeenCalledWith(
      "uni-1",
      { defaultDurationMinutes: 150, shuffleQuestions: false, shuffleOptions: true, scoringPolicy: "AllOrNothing", cameraRequired: true, cameraUnavailablePolicy: "Block" },
      revision,
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save defaults" })).not.toBeInTheDocument();
  });

  it("saves a changed camera policy and checkbox", async () => {
    api.getUniversityExamPolicy.mockResolvedValue(policy);
    const user = userEvent.setup();
    renderRoute();
    await user.click(await screen.findByRole("checkbox", { name: "Shuffle questions" }));
    await user.click(screen.getByRole("combobox", { name: "If a camera is unavailable" }));
    await user.click(await screen.findByRole("option", { name: "Allow without a flag" }));
    await user.click(screen.getByRole("button", { name: "Save defaults" }));
    await waitFor(() => expect(api.updateUniversityExamPolicy).toHaveBeenCalled());
    expect(api.updateUniversityExamPolicy.mock.calls[0][1]).toMatchObject({ shuffleQuestions: true, cameraUnavailablePolicy: "Allow" });
  });

  it.each(["0", "1441", "", "90.5"])("refuses a duration of %j without calling the API", async (value) => {
    api.getUniversityExamPolicy.mockResolvedValue(policy);
    const user = userEvent.setup();
    renderRoute();
    fireEvent.change(await screen.findByLabelText("Default duration (minutes)"), { target: { value } });
    await user.click(screen.getByRole("button", { name: "Save defaults" }));
    expect(await screen.findByText(/whole number of minutes from 1 to 1440/)).toBeInTheDocument();
    expect(api.updateUniversityExamPolicy).not.toHaveBeenCalled();
  });

  it("keeps the edits and says so when saving fails", async () => {
    api.getUniversityExamPolicy.mockResolvedValue(policy);
    api.updateUniversityExamPolicy.mockRejectedValue(new ApiFailure({ kind: "server", status: 412 }, "Resource changed. Reload and retry."));
    const user = userEvent.setup();
    renderRoute();
    fireEvent.change(await screen.findByLabelText("Default duration (minutes)"), { target: { value: "100" } });
    await user.click(screen.getByRole("button", { name: "Save defaults" }));
    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Default duration (minutes)")).toHaveValue(100);
    expect(screen.getByRole("button", { name: "Save defaults" })).toBeEnabled();
  });

  it("restores the saved values with Reset changes", async () => {
    api.getUniversityExamPolicy.mockResolvedValue(policy);
    const user = userEvent.setup();
    renderRoute();
    fireEvent.change(await screen.findByLabelText("Default duration (minutes)"), { target: { value: "30" } });
    await user.click(screen.getByRole("button", { name: "Reset changes" }));
    expect(screen.getByLabelText("Default duration (minutes)")).toHaveValue(120);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("offers a retry when the policy cannot be loaded", async () => {
    api.getUniversityExamPolicy.mockRejectedValueOnce(new ApiFailure({ kind: "server", status: 500 })).mockResolvedValue(policy);
    const user = userEvent.setup();
    renderRoute();
    await user.click(await screen.findByRole("button", { name: /retry|try again/i }));
    expect(await screen.findByLabelText("Default duration (minutes)")).toHaveValue(120);
  });

  it("explains when the account has no university", () => {
    renderRoute("");
    expect(screen.getByRole("alert")).toHaveTextContent(/not linked to a university/);
    expect(api.getUniversityExamPolicy).not.toHaveBeenCalled();
  });
});

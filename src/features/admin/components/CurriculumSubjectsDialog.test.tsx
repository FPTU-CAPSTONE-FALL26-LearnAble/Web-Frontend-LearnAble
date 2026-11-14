import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Curriculum } from "@/api/admin";
import { ApiFailure } from "@/api/client";

const api = vi.hoisted(() => ({ getAdminSubjects: vi.fn(), getCurriculumSubjects: vi.fn(), setCurriculumSubjects: vi.fn() }));
vi.mock("@/api/admin", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/admin")>()), ...api }));

import { CurriculumSubjectsDialog } from "./CurriculumSubjectsDialog";

const revision = "22222222-2222-4222-8222-222222222222";
const curriculum = { curriculumId: "c1", curriculumCode: "SE-2027" } as Curriculum;
const subject = (subjectId: string, subjectCode: string, subjectNameEn: string, isActive = true) => ({ subjectId, subjectCode, subjectNameEn, isActive });
const page = (items: unknown[], pageNumber = 1, totalPages = 1) => ({ items, pageNumber, pageSize: 100, totalCount: items.length, totalPages, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages });
const catalog = [subject("s1", "SE101", "Intro to Software"), subject("s2", "SE102", "Algorithms"), subject("s3", "OLD1", "Legacy Course", false)];
const onClose = vi.fn();

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CurriculumSubjectsDialog curriculum={curriculum} onClose={onClose} />
    </QueryClientProvider>,
  );
}
const box = (name: RegExp) => screen.getByRole("checkbox", { name });

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  onClose.mockReset();
  api.getAdminSubjects.mockResolvedValue(page(catalog));
  api.getCurriculumSubjects.mockResolvedValue({ subjectIds: ["s1"], revision });
  api.setCurriculumSubjects.mockResolvedValue(undefined);
});

describe("CurriculumSubjectsDialog", () => {
  it("shows the assigned subjects as selected", async () => {
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /SE101/ })).toBeChecked();
    expect(box(/SE102/)).not.toBeChecked();
    expect(screen.getByText(/1 selected · 3 shown/)).toBeInTheDocument();
    expect(api.getCurriculumSubjects).toHaveBeenCalledWith("c1");
  });

  it("saves the full list with the loaded revision and closes", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(await screen.findByRole("checkbox", { name: /SE102/ }));
    expect(screen.getByText(/2 selected · not saved/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(api.setCurriculumSubjects).toHaveBeenCalledTimes(1));
    const [id, ids, sentRevision] = api.setCurriculumSubjects.mock.calls[0];
    expect(id).toBe("c1");
    expect([...ids].sort()).toEqual(["s1", "s2"]);
    expect(sentRevision).toBe(revision);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("removes a subject that is cleared", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(await screen.findByRole("checkbox", { name: /SE101/ }));
    await user.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(api.setCurriculumSubjects).toHaveBeenCalled());
    expect(api.setCurriculumSubjects.mock.calls[0][1]).toEqual([]);
  });

  it("does not offer inactive subjects unless they are already assigned", async () => {
    api.getCurriculumSubjects.mockResolvedValue({ subjectIds: ["s3"], revision });
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /OLD1/ })).toBeEnabled();
    expect(box(/OLD1/)).toBeChecked();
  });

  it("disables an inactive subject that is not assigned", async () => {
    api.getAdminSubjects.mockResolvedValue(page(catalog));
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /OLD1/ })).toBeDisabled();
  });

  it("filters the list by code or name", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(await screen.findByLabelText("Search subjects"), "algo");
    expect(screen.getByRole("checkbox", { name: /SE102/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /SE101/ })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search subjects"));
    await user.type(screen.getByLabelText("Search subjects"), "zzz");
    expect(screen.getByText("No subject matches your search.")).toBeInTheDocument();
  });

  it("keeps an assigned subject that is missing from the catalog, so a save does not drop it", async () => {
    api.getCurriculumSubjects.mockResolvedValue({ subjectIds: ["s1", "ghost-subject-id"], revision });
    const user = userEvent.setup();
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /Unknown subject \(ghost-su\)/ })).toBeChecked();
    await user.click(box(/SE102/));
    await user.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(api.setCurriculumSubjects).toHaveBeenCalled());
    expect([...api.setCurriculumSubjects.mock.calls[0][1]].sort()).toEqual(["ghost-subject-id", "s1", "s2"]);
  });

  it("reads every page of the subject catalog at most 100 per request", async () => {
    api.getAdminSubjects.mockImplementation(async ({ PageNumber }: { PageNumber: number }) =>
      PageNumber === 1 ? page([subject("s1", "SE101", "Intro")], 1, 2) : page([subject("s9", "SE900", "Capstone")], 2, 2),
    );
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /SE900/ })).toBeInTheDocument();
    expect(api.getAdminSubjects).toHaveBeenCalledWith(expect.objectContaining({ PageNumber: 1, PageSize: 100 }));
    expect(api.getAdminSubjects).toHaveBeenCalledWith(expect.objectContaining({ PageNumber: 2, PageSize: 100 }));
  });

  it("refuses to save when the current subjects could not be loaded", async () => {
    api.getCurriculumSubjects.mockRejectedValue(new ApiFailure({ kind: "parse" }));
    const user = userEvent.setup();
    renderDialog();
    await user.click(await screen.findByRole("button", { name: "Save subjects" }));
    expect(await screen.findByText(/could not be loaded, so nothing can be saved/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(api.setCurriculumSubjects).not.toHaveBeenCalled();
  });

  it("asks for a change before saving", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(await screen.findByRole("button", { name: "Save subjects" }));
    expect(await screen.findByText("Select or clear at least one subject before saving.")).toBeInTheDocument();
    expect(api.setCurriculumSubjects).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the reason when the Backend rejects the save", async () => {
    api.setCurriculumSubjects.mockRejectedValue(new ApiFailure({ kind: "server", status: 412 }, "Resource changed. Reload and retry."));
    const user = userEvent.setup();
    renderDialog();
    await user.click(await screen.findByRole("checkbox", { name: /SE102/ }));
    await user.click(screen.getByRole("button", { name: "Save subjects" }));
    expect(await screen.findByText(/Resource changed. Reload and retry./)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(box(/SE102/)).toBeChecked();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LearningMaterialsRoute } from "./LearningMaterialsRoute";
import { UploadMaterialRoute, validateMaterialFile } from "./UploadMaterialRoute";
import { AttendanceRoute } from "./AttendanceRoute";
import { ExamScheduleRoute } from "./ExamScheduleRoute";
import { LecturerLayout } from "../components/LecturerLayout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getMaterials } from "@/api/lecturer";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

vi.mock("@/api/lecturer", () => ({
  getSubjects: vi.fn(async () => ({ items: [{ subjectId: "s1", subjectCode: "SWE201", subjectNameEn: "Software Engineering" }] })),
  getTopics: vi.fn(async () => ({ items: [{ topicId: "t1", subjectId: "s1", topicName: "Architecture" }] })),
  getMaterials: vi.fn(async () => ({ items: [{ materialId: "m1", topicId: "t1", title: "Architecture Notes", fileName: "notes.pdf", fileSizeBytes: 2048000, materialType: "PDF", status: "Published", ocrStatus: "Done", isTtsReady: true }], totalCount: 11, totalPages: 2 })),
}));
function view(element: React.ReactNode, path = "/") {
  useAuthStore.setState({ user: { id: "lecturer-test", fullName: "Lecturer One", email: "test@fpt.edu.vn", role: "Lecturer" } });
  const router = createMemoryRouter([{ path: path.includes("attendance") ? "/lecturer/exams/:examId/attendance" : path, element }, { path: "/lecturer/materials", element: <p>Material list destination</p> }], { initialEntries: [path] });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); });
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});
describe("Lecturer workspaces", { timeout: 30000 }, () => {
  it("reads user-scoped materials, searches, paginates and selects without writing", async () => {
    const user = userEvent.setup(); const result = view(<LearningMaterialsRoute />);
    expect(await screen.findByText("Architecture Notes")).toBeInTheDocument();
    expect(getMaterials).toHaveBeenCalledWith(expect.objectContaining({ UploadedBy: "lecturer-test", PageNumber: 1 }));
    await user.click(screen.getByLabelText("Select Architecture Notes")); expect(screen.getByText("1 materials selected")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search materials"), "Architecture"); await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ SearchTerm: "Architecture" })));
    await user.click(screen.getByRole("button", { name: "Next" })); await waitFor(() => expect(getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ PageNumber: 2 })));
    await expectNoAxeViolations(result.container);
  });
  it("filters by server status and resets material filters", async () => {
    const user = userEvent.setup(); view(<LearningMaterialsRoute />); await screen.findByText("Architecture Notes");
    await user.click(screen.getByLabelText("Material status")); await user.click(screen.getByRole("option", { name: "Archived" }));
    await waitFor(() => expect(getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ Status: "Archived" })));
    await user.click(screen.getByRole("button", { name: "Reset filters" })); await waitFor(() => expect(getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ Status: undefined })));
  });
  it("supports all six local material file extensions and rejects others", () => {
    for (const ext of ["pdf", "docx", "pptx", "mp3", "mp4", "epub"]) expect(validateMaterialFile(new File(["data"], `lecture.${ext}`))).toBe("");
    expect(validateMaterialFile(new File(["data"], "program.exe"))).toContain("Choose a PDF");
  });
  it("selects a file locally, validates metadata and protects unsaved navigation", async () => {
    const user = userEvent.setup(); const result = view(<UploadMaterialRoute />);
    await user.upload(screen.getByLabelText("Material file"), new File(["sample"], "lecture.pdf", { type: "application/pdf" }));
    expect(screen.getByText("Selected locally · Not uploaded")).toBeInTheDocument(); expect(screen.getByLabelText("Material title (required)")).toHaveValue("lecture");
    await user.click(screen.getByRole("button", { name: "Continue to Review" })); expect(screen.getByText(/Select a file, enter a title/)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Back to list" })); expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" })); await expectNoAxeViolations(result.container);
  });
  it("filters the seat map and searches the student list without changing attendance", async () => {
    const user = userEvent.setup(); const result = view(<AttendanceRoute />, "/lecturer/exams/swe201-final/attendance");
    await user.click(screen.getAllByRole("button", { name: "Not checked in (3)" })[0]);
    expect(screen.getByRole("button", { name: /Seat 5, Vũ Quang Huy, Not checked in/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Seat 1, Nguyễn Minh Long/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Search attendance students"), "Nguyễn Minh Long");
    expect(screen.getAllByText("Nguyễn Minh Long")).toHaveLength(1);
    expect(screen.getByText(/CCCD: 001206100000/)).toBeInTheDocument();
    expect(screen.getByText(/Seat A1 · HE180100/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Nguyễn Minh Long student avatar" })).toBeInTheDocument();
    expect(screen.queryByText("Standard workstation")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View Nguyễn Minh Long student photo" }));
    expect(screen.getByRole("dialog", { name: "Nguyễn Minh Long" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    const spy = vi.spyOn(globalThis, "fetch"); await user.click(screen.getByRole("button", { name: "Mark all present" })); expect(spy).not.toHaveBeenCalled(); spy.mockRestore();
    await expectNoAxeViolations(result.container);
  });
  it("handles an unknown exam without rendering another room", () => { view(<AttendanceRoute />, "/lecturer/exams/unknown/attendance"); expect(screen.getByRole("heading", { name: "Exam shift not found" })).toBeInTheDocument(); });
  it("renders weekly schedule and links to the correct attendance room", async () => {
    const result = view(<ExamScheduleRoute />); expect(screen.getByRole("heading", { name: "Next week (Sep 22–28, 2026)" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Attendance" })[0]).toHaveAttribute("href", "/lecturer/exams/swe201-final/attendance"); await expectNoAxeViolations(result.container);
  });
  it("opens the shared mobile navigation and closes it with the keyboard", async () => {
    const user = userEvent.setup(); const result = view(<LecturerLayout />);
    await user.click(screen.getByRole("button", { name: "Open navigation" })); expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Learning Materials" }).at(-1)).toHaveAttribute("href", "/lecturer/materials");
    await user.keyboard("{Escape}"); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(result.container.querySelector('img[alt="FPT University"]')).toHaveClass("object-contain");
  });
});

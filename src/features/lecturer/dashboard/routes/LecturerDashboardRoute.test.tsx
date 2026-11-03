import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LecturerDashboardRoute } from "./LecturerDashboardRoute";
import { useAuthStore } from "@/features/auth/store/authStore";

const api = vi.hoisted(() => ({ getQuestions: vi.fn(), getMaterials: vi.fn(), getMyExamSchedules: vi.fn() }));
vi.mock("@/api/lecturer", () => ({ getQuestions: api.getQuestions, getMaterials: api.getMaterials }));
vi.mock("@/api/exams", () => ({ getMyExamSchedules: api.getMyExamSchedules }));

describe("LecturerDashboardRoute", () => {
  it("renders counts and schedules returned by the Backend clients", async () => {
    api.getQuestions.mockResolvedValue({ items: [], totalCount: 12, totalPages: 1, pageNumber: 1, pageSize: 1 });
    api.getMaterials.mockResolvedValue({ items: [], totalCount: 4, totalPages: 1, pageNumber: 1, pageSize: 1 });
    api.getMyExamSchedules.mockResolvedValue({ items: [], totalCount: 0, totalPages: 0, pageNumber: 1, pageSize: 100 });
    useAuthStore.setState({ user: { id: "lecturer-1", fullName: "Dr. Nguyen Van A", email: "lecturer@fpt.edu.vn", role: "Lecturer" } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LecturerDashboardRoute /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: /Welcome, Dr\. Nguyen Van A/i })).toBeInTheDocument();
    await waitFor(() => expect(api.getQuestions).toHaveBeenCalled());
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("You have no upcoming invigilation shifts.")).toBeInTheDocument();
  });

  it("keeps question and material data visible when schedules are unavailable", async () => {
    api.getQuestions.mockResolvedValue({ items: [], totalCount: 12, totalPages: 1, pageNumber: 1, pageSize: 1 });
    api.getMaterials.mockResolvedValue({ items: [], totalCount: 4, totalPages: 1, pageNumber: 1, pageSize: 1 });
    api.getMyExamSchedules.mockRejectedValue(new Error("Schedule service unavailable"));
    useAuthStore.setState({ user: { id: "lecturer-1", fullName: "Dr. Nguyen Van A", email: "lecturer@fpt.edu.vn", role: "Lecturer" } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LecturerDashboardRoute /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Exam schedules are temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

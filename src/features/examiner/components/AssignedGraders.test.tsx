import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AssignedGraders } from "./AssignedGraders";

vi.mock("@/api/grading", () => ({ getScheduleGradingAssignments: vi.fn(async () => ({ items: [
  { attemptId: "a1", lecturerId: "l1", assignedAt: "2026-11-20T01:00:00Z", markingCompletedAt: "2026-11-21T01:00:00Z", assignmentNote: "Check reasoning" },
  { attemptId: "a2", lecturerId: "l1", assignedAt: "2026-11-20T01:00:00Z", markingCompletedAt: null },
  { attemptId: "a3", lecturerId: "l2", markingCompletedAt: "2026-11-21T01:00:00Z" },
  { attemptId: "a4", lecturerId: null },
] })) }));

describe("Assigned graders summary", () => {
  it("shows saved lecturer details and confirmation counts without choosing a new grader", async () => {
    render(<QueryClientProvider client={new QueryClient()}><AssignedGraders scheduleId="s1" candidates={[{ lecturerId: "l1", userCode: "LEC0002", fullName: "Lecturer Two", departmentId: null }]} /></QueryClientProvider>);
    expect(await screen.findByText("Lecturer Two")).toBeInTheDocument();
    expect(screen.getByText("LEC0002")).toBeInTheDocument();
    expect(screen.getByText("2 assigned · 1 confirmed · 1 awaiting confirmation")).toBeInTheDocument();
    expect(screen.getByText("1 assigned · 1 confirmed · 0 awaiting confirmation")).toBeInTheDocument();
    expect(screen.getByText("Lecturer code unavailable")).toBeInTheDocument();
    expect(screen.getByText("Check reasoning")).toBeInTheDocument();
    expect(screen.getByText("1 attempt(s) still have no assigned Lecturer.")).toBeInTheDocument();
  });
});

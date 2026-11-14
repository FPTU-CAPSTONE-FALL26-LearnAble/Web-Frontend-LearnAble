import { render, screen } from "@testing-library/react";
import { ExamCodeCard } from "./ExamCodeCard";

describe("ExamCodeCard", () => {
  it("masks an exam code until it opens", () => {
    render(<ExamCodeCard code="SWE201-FE-FA26-01" status="opening-soon" />);
    expect(screen.getByText("Opening soon")).toBeInTheDocument();
    expect(screen.getByText("XXXXXX")).toHaveClass("whitespace-nowrap");
    expect(screen.queryByText("SWE201-FE-FA26-01")).not.toBeInTheDocument();
  });

  it("uses the scheduled state for an upcoming unopened exam", () => {
    render(<ExamCodeCard code="PRN211-ME-FA26-02" status="scheduled" compact />);
    expect(screen.queryByText("****")).not.toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toHaveClass("sr-only");
    expect(screen.queryByText("XXXXXX")).not.toBeInTheDocument();
    expect(screen.queryByText("PRN211-ME-FA26-02")).not.toBeInTheDocument();
  });

  it.each([
    ["open", "Open"],
    ["closed", "Closed"],
  ] as const)("shows the exam code for the %s status", (status, label) => {
    render(<ExamCodeCard code="SWE201-FE-FA26-01" status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("SWE201-FE-FA26-01")).toHaveClass("whitespace-nowrap");
  });
});

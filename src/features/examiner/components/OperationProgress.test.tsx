import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { operation, useOperationProgress } from "@/features/examiner/workflow/operationProgress";
import { OperationProgress } from "./OperationProgress";

beforeEach(() => useOperationProgress.setState({ open: false, steps: [], title: "", message: "", phase: "running", minimized: false }));
afterEach(() => vi.useRealTimers());

describe("operation progress store", () => {
  it("starts with the first step running and moves forward step by step", () => {
    operation.start("Saving", ["One", "Two", "Three"]);
    expect(useOperationProgress.getState().steps.map((step) => step.status)).toEqual(["running", "pending", "pending"]);
    operation.step(2);
    expect(useOperationProgress.getState().steps.map((step) => step.status)).toEqual(["done", "done", "running"]);
    operation.finish("All saved.");
    expect(useOperationProgress.getState()).toMatchObject({ phase: "done", message: "All saved." });
    expect(useOperationProgress.getState().steps.every((step) => step.status === "done")).toBe(true);
  });

  it("marks the step that was running as failed and keeps the earlier ones done", () => {
    operation.start("Saving", ["One", "Two"]);
    operation.step(1);
    operation.fail("The server said no.");
    expect(useOperationProgress.getState().steps.map((step) => step.status)).toEqual(["done", "failed"]);
    expect(useOperationProgress.getState().phase).toBe("failed");
  });
});

describe("OperationProgress", () => {
  it("shows nothing until an operation starts", () => {
    render(<OperationProgress />);
    expect(screen.queryByRole("region", { name: "Save and publish progress" })).not.toBeInTheDocument();
  });

  it("lists the steps, can be folded, and cannot be closed while it runs", () => {
    render(<OperationProgress />);
    act(() => operation.start("Creating the draft exam", ["Saving the exam configuration", "Creating the draft paper"]));
    const tracker = screen.getByRole("region", { name: "Save and publish progress" });
    expect(within(tracker).getByText("Creating the draft exam")).toBeInTheDocument();
    expect(within(tracker).getByText("In progress")).toBeInTheDocument();
    expect(within(tracker).getByText("Waiting")).toBeInTheDocument();
    expect(within(tracker).queryByRole("button", { name: "Close progress" })).not.toBeInTheDocument();
    fireEvent.click(within(tracker).getByRole("button", { name: "Hide progress" }));
    expect(within(tracker).queryByText("Saving the exam configuration")).not.toBeInTheDocument();
    fireEvent.click(within(tracker).getByRole("button", { name: "Show progress" }));
    expect(within(tracker).getByText("Saving the exam configuration")).toBeInTheDocument();
  });

  it("closes itself a few seconds after it finishes", () => {
    vi.useFakeTimers();
    render(<OperationProgress />);
    act(() => { operation.start("Publishing the paper", ["Publishing the paper"]); operation.finish("The paper is published."); });
    expect(screen.getByText("Publishing the paper · done")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(6100); });
    expect(screen.queryByRole("region", { name: "Save and publish progress" })).not.toBeInTheDocument();
  });

  it("stays after a failure, says why, and closes when asked", () => {
    vi.useFakeTimers();
    render(<OperationProgress />);
    act(() => { operation.start("Saving the paper", ["Saving 10 questions"]); operation.fail("The question set could not be saved."); });
    expect(screen.getByRole("alert")).toHaveTextContent("Saving the paper · failed");
    expect(screen.getByText("The question set could not be saved.")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.getByRole("region", { name: "Save and publish progress" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close progress" }));
    expect(screen.queryByRole("region", { name: "Save and publish progress" })).not.toBeInTheDocument();
  });
});

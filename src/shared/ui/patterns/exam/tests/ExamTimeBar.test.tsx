import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamTimeBar, formatClock, formatDuration } from "../ExamTimeBar";

const MIN = 60 * 1000;

describe("ExamTimeBar", () => {
  it("shows time left against the limit, with the bar filled by time used", () => {
    const { container } = render(<ExamTimeBar remainingMs={35 * MIN + 12_000} totalMs={60 * MIN} />);
    expect(screen.getByText("35:12 left")).toBeVisible();
    expect(screen.getByText("of 1:00:00")).toBeVisible();
    const indicator = container.querySelector<HTMLElement>("[data-slot=progress-indicator]");
    // 24m48s of 60m used ≈ 41.3%, so the indicator is shifted left by the rest.
    expect(indicator?.style.transform).toMatch(/translateX\(-58\.[0-9]+%\)/);
  });

  it("reads only whole minutes to screen readers and keeps the ticking clock out of the tree", () => {
    render(<ExamTimeBar remainingMs={35 * MIN + 12_000} totalMs={60 * MIN} />);
    const timer = screen.getByRole("timer");
    expect(timer).not.toHaveAttribute("aria-live");
    expect(timer).toHaveTextContent("Time remaining: about 36 minutes of 1 hour");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("says when time is running low, not only by colour", () => {
    render(<ExamTimeBar remainingMs={4 * MIN} totalMs={60 * MIN} />);
    expect(screen.getByText("Time is running low")).toBeVisible();
  });

  it("formats hours once the limit passes an hour", () => {
    expect(formatClock(65 * MIN + 9_000)).toBe("1:05:09");
    expect(formatClock(-5)).toBe("00:00");
  });

  it("spells the limit out for screen readers", () => {
    expect(formatDuration(60 * MIN)).toBe("1 hour");
    expect(formatDuration(90 * MIN)).toBe("1 hour 30 minutes");
    expect(formatDuration(120 * MIN + 60_000)).toBe("2 hours 1 minute");
    expect(formatDuration(45 * MIN)).toBe("45 minutes");
  });
});

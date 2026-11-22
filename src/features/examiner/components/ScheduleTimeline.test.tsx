import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { clock, minutesBetween, ScheduleTimeline, shiftPercent } from "./ScheduleTimeline";

const at = (time: string) => new Date(`2026-11-14T${time}`).toISOString();

describe("shiftPercent", () => {
  it("places a moment as a share of the shift and keeps it inside the bar", () => {
    expect(shiftPercent(at("07:10"), at("08:40"), at("07:40"))).toBe(33.3);
    expect(shiftPercent(at("07:10"), at("08:40"), at("06:00"))).toBe(0);
    expect(shiftPercent(at("07:10"), at("08:40"), at("09:30"))).toBe(100);
  });

  it("has nothing to place when the shift has no length", () => {
    expect(shiftPercent(at("07:10"), at("07:10"), at("07:10"))).toBe(0);
  });
});

describe("minutesBetween and clock", () => {
  it("counts whole minutes and writes the time on a 24-hour clock", () => {
    expect(minutesBetween(at("07:40"), at("08:40"))).toBe(60);
    expect(clock(at("13:05"))).toBe("13:05");
  });
});

describe("ScheduleTimeline", () => {
  it("says in words when students come in and how long the exam has after the doors close", () => {
    render(<ScheduleTimeline startsAt={at("07:10")} endsAt={at("08:40")} entryOpensAt={at("07:10")} entryClosesAt={at("07:40")} />);
    expect(screen.getByRole("img", { name: "Shift 07:10 to 08:40. Students may enter from 07:10 to 07:40, leaving 60 minutes for the exam." })).toBeInTheDocument();
    expect(screen.getByText("07:10–07:40")).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
  });
});

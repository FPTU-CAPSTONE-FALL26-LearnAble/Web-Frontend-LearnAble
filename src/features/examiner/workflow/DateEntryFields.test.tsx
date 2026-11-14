import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateField, DateTimeField } from "./DateEntryFields";

const onChange = vi.fn();

function Harness({ kind, initial = "" }: { kind: "date" | "dateTime"; initial?: string }) {
  const [value, setValue] = useState(initial);
  const Component = kind === "date" ? DateField : DateTimeField;
  return <Component label="Exam" value={value} onChange={(next) => { onChange(next); setValue(next); }} />;
}

const nativePicker = () => document.querySelector<HTMLInputElement>('input[type="date"]')!;
const originalShowPicker = HTMLInputElement.prototype.showPicker;

describe("calendar date selection", () => {
  afterEach(() => {
    onChange.mockReset();
    HTMLInputElement.prototype.showPicker = originalShowPicker;
  });

  it("opens the browser calendar from the calendar button", () => {
    const showPicker = vi.fn();
    HTMLInputElement.prototype.showPicker = showPicker;
    render(<Harness kind="date" />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Exam from calendar" }));
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it("falls back to focusing the picker when the calendar cannot be opened", () => {
    HTMLInputElement.prototype.showPicker = () => {
      throw new DOMException("blocked", "NotAllowedError");
    };
    render(<Harness kind="date" />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Exam from calendar" }));
    expect(document.activeElement).toBe(nativePicker());
  });

  it("shows a picked day as DD/MM/YYYY and reports the API date", () => {
    render(<Harness kind="date" />);
    fireEvent.change(nativePicker(), { target: { value: "2026-11-14" } });
    expect(screen.getByLabelText("Exam")).toHaveValue("14/11/2026");
    expect(onChange).toHaveBeenLastCalledWith("2026-11-14");
  });

  it("keeps the typed time when a day is picked", () => {
    render(<Harness kind="dateTime" initial="2026-11-09T14:00" />);
    fireEvent.change(nativePicker(), { target: { value: "2026-11-20" } });
    expect(screen.getByLabelText("Exam date")).toHaveValue("20/11/2026");
    expect(screen.getByLabelText("Exam time")).toHaveValue("14:00");
    expect(onChange).toHaveBeenLastCalledWith("2026-11-20T14:00");
  });

  it("starts the time at 00:00, so a picked day is already a complete date and time", () => {
    render(<Harness kind="dateTime" />);
    expect(screen.getByLabelText("Exam time")).toHaveValue("00:00");
    fireEvent.change(nativePicker(), { target: { value: "2026-11-20" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-20T00:00");
  });

  it("draws the calendar button the same size as the date input", () => {
    render(<Harness kind="dateTime" />);
    const button = screen.getByRole("button", { name: "Choose Exam from calendar" });
    expect(button.className).toContain("size-9");
    expect(screen.getByLabelText("Exam date").className).toContain("h-9");
  });

  it("opens the calendar on the day already typed", () => {
    render(<Harness kind="date" initial="2026-11-14" />);
    expect(nativePicker()).toHaveValue("2026-11-14");
  });

  it("clears the field when the calendar is cleared", () => {
    render(<Harness kind="date" initial="2026-11-14" />);
    fireEvent.change(nativePicker(), { target: { value: "" } });
    expect(screen.getByLabelText("Exam")).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("keeps the picker out of the tab order and accessibility tree", () => {
    render(<Harness kind="date" />);
    expect(nativePicker()).toHaveAttribute("tabindex", "-1");
    expect(nativePicker()).toHaveAttribute("aria-hidden", "true");
  });
});

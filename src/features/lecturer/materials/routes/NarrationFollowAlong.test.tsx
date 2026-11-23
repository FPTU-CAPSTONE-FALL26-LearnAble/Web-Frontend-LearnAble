import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NarrationFollowAlong } from "./NarrationFollowAlong";

describe("narration follow along", () => {
  it("highlights the estimated sentence in the same editable text area", () => {
    const onChange = vi.fn();
    const value = "First. A longer second sentence.";
    const onPause = vi.fn();
    const { container } = render(<NarrationFollowAlong value={value} audioText={value} currentTime={8} duration={10} pageLabel="Page 2" onChange={onChange} onPause={onPause} />);

    expect(container.querySelector("mark")).toHaveTextContent("A longer second sentence.");
    const editor = screen.getByRole("textbox", { name: /editable narration text for page 2/i });
    fireEvent.pointerDown(editor);
    expect(onPause).toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: "First. Corrected second sentence." } });
    expect(onChange).toHaveBeenCalledWith("First. Corrected second sentence.");
  });

  it("does not highlight stale audio text after an edit", () => {
    const { container } = render(<NarrationFollowAlong value="Corrected text." audioText="Original text." currentTime={5} duration={10} pageLabel="Page 1" onChange={vi.fn()} onPause={vi.fn()} />);
    expect(container.querySelector("mark")).toBeNull();
    expect(screen.getByText(/created from earlier text/i)).toBeInTheDocument();
  });
});

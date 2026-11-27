import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamInfo } from "../ExamInfo";

describe("ExamInfo", () => {
  it("shows the exam name and labels the ID for screen readers", () => {
    render(<ExamInfo name="PRO192 - Final Exam" id="07342" />);
    expect(screen.getByText("PRO192 - Final Exam")).toBeVisible();
    expect(screen.getByText("07342").closest("p")).toHaveTextContent("Exam ID 07342");
  });

  it("describes the server's verification image, defaulting the alt text to the exam name", () => {
    const { rerender } = render(<ExamInfo name="PRO192 - Final Exam" id="07342" image={{ src: "/verify.png" }} />);
    expect(screen.getByRole("img", { name: "Verification image for PRO192 - Final Exam" })).toHaveAttribute("src", "/verify.png");
    rerender(<ExamInfo name="PRO192 - Final Exam" id="07342" image={{ src: "/verify.png", alt: "Blue owl seal" }} />);
    expect(screen.getByRole("img", { name: "Blue owl seal" })).toBeInTheDocument();
  });

  it("keeps the placeholder out of the accessibility tree until the image arrives", () => {
    render(<ExamInfo name="PRO192 - Final Exam" id="07342" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

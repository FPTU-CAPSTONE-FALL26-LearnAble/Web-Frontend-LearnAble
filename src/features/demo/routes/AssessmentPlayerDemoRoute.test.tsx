import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AssessmentPlayerDemoRoute } from "./AssessmentPlayerDemoRoute";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function renderPlayer() {
  return render(<MemoryRouter><AssessmentPlayerDemoRoute /></MemoryRouter>);
}

describe("AssessmentPlayerDemoRoute", () => {
  it("opens a question from the table of contents and records a response", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "1 Unattempted Multiple choice" }));
    expect(screen.getByRole("heading", { name: /single entry point for routing requests/i })).toBeInTheDocument();

    const response = screen.getByRole("radio", { name: "API Gateway" });
    await user.click(response);
    expect(response).toHaveAttribute("aria-checked", "true");
  });

  it("can flag a question and filter the table of contents", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "1 Unattempted Multiple choice" }));
    await user.click(screen.getByRole("button", { name: "Flag for review" }));
    await user.click(screen.getByRole("button", { name: "Navigate to table of contents" }));
    await user.click(screen.getByRole("tab", { name: /Flagged \(1\)/i }));

    expect(screen.getByRole("button", { name: "1 Unattempted Multiple choice Flagged" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2 Unattempted Multiple response" })).not.toBeInTheDocument();
  });

  it("shows the supporting image for the multiple-response question", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "2 Unattempted Multiple response" }));
    expect(screen.getByRole("img", { name: "An 18th-century economist portrait" })).toBeInTheDocument();
  });

  it("opens the options as an overlay", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "Open options" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to submission page/i })).toBeInTheDocument();
  });

  it("navigates from the question list through questions to review", async () => {
    const user = userEvent.setup();
    renderPlayer();

    const previous = screen.getByRole("button", {
      name: "Previous",
    });
    const next = screen.getByRole("button", { name: "Next" });

    expect(previous).toBeDisabled();
    await user.click(next);
    expect(screen.getByRole("heading", { name: /single entry point for routing requests/i })).toBeInTheDocument();

    await user.click(previous);
    expect(screen.getByRole("tablist", { name: "Filter questions" })).toBeInTheDocument();

    await user.click(next);
    for (let questionIndex = 1; questionIndex < 18; questionIndex += 1) {
      await user.click(next);
    }
    expect(screen.getByRole("heading", { name: /upload your final design report/i })).toBeInTheDocument();

    await user.click(next);
    expect(screen.getByRole("heading", { name: "Review your answers" })).toBeInTheDocument();
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(screen.getByRole("heading", { name: /upload your final design report/i })).toBeInTheDocument();
  });

  it("passes axe accessibility checks", async () => {
    const { container } = renderPlayer();
    await expectNoAxeViolations(container);
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssessmentPlayerShell } from "../AssessmentPlayerShell";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("AssessmentPlayerShell", () => {
  it("renders the candidate, trailing slot, body and footer", () => {
    render(
      <AssessmentPlayerShell
        candidate={{ id: "C1", name: "Candidate" }}
        trailing={<span>Device check</span>}
        footer={<footer>Steps</footer>}
      >
        <main>Body</main>
      </AssessmentPlayerShell>,
    );
    expect(screen.getByText("C1 - Candidate")).toBeInTheDocument();
    expect(screen.getByText("Device check")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Body");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Steps");
  });

  it("shows the status line only when given", () => {
    const { rerender } = render(
      <AssessmentPlayerShell candidate={{ id: "C1", name: "Candidate" }}>
        <main />
      </AssessmentPlayerShell>,
    );
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();

    rerender(
      <AssessmentPlayerShell
        candidate={{ id: "C1", name: "Candidate" }}
        status="Connected"
      >
        <main />
      </AssessmentPlayerShell>,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AssessmentPlayerShell candidate={{ id: "C1", name: "Candidate" }}>
        <main>Body</main>
      </AssessmentPlayerShell>,
    );
    await expectNoAxeViolations(container);
  });
});

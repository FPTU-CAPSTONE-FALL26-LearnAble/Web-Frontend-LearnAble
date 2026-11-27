import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CodingWorkspaceDemoRoute } from "./CodingWorkspaceDemoRoute";

// jsdom has no layout; CodeMirror measures text ranges after updates.
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();

function renderDemo() {
  return render(
    <MemoryRouter>
      <CodingWorkspaceDemoRoute />
    </MemoryRouter>,
  );
}

describe("CodingWorkspaceDemoRoute", () => {
  it("opens on a coding question with the editor and no sidebar", () => {
    renderDemo();
    expect(screen.getByRole("textbox", { name: "Code editor, C" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sum of even numbers" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "All questions" })).not.toBeInTheDocument();
    expect(screen.getByText("35:00 left")).toBeInTheDocument();
  });

  it("has only coding questions, a question strip and Review and submit", async () => {
    const user = userEvent.setup();
    renderDemo();
    const strip = screen.getByRole("navigation", { name: "Question navigation" });
    const tiles = within(strip).getAllByRole("button");
    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toHaveAttribute("aria-current", "step");

    await user.click(tiles[3]);
    expect(screen.getByRole("heading", { name: "Largest of three" })).toBeInTheDocument();
    expect(within(strip).getAllByRole("button")[3]).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("button", { name: "Review and submit" }));
    expect(screen.queryByRole("textbox", { name: "Code editor, C" })).not.toBeInTheDocument();
    // The review screen keeps the strip; the side panel is for other exam types.
    const reviewStrip = screen.getByRole("navigation", { name: "Question navigation" });
    expect(within(reviewStrip).getAllByRole("button")).toHaveLength(4);
    expect(within(reviewStrip).queryByRole("button", { current: "step" })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "All questions" })).not.toBeInTheDocument();
  });

  it("keeps a question's test results after moving to another question and back", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByText("0 of 3 sample tests passed", {}, { timeout: 3000 })).toBeInTheDocument();
    const strip = screen.getByRole("navigation", { name: "Question navigation" });
    await user.click(within(strip).getAllByRole("button")[1]);
    expect(screen.queryByText("0 of 3 sample tests passed")).not.toBeInTheDocument();
    await user.click(within(strip).getAllByRole("button")[0]);
    expect(screen.getByText("0 of 3 sample tests passed")).toBeInTheDocument();
  });

  it("marks the running question on the strip, also after leaving it", async () => {
    const user = userEvent.setup();
    renderDemo();
    const strip = screen.getByRole("navigation", { name: "Question navigation" });
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    const first = () => within(strip).getAllByRole("button")[0];
    expect(first()).toHaveTextContent("Running…");
    expect(first()).toHaveAccessibleName(/running sample tests$/);
    await user.click(within(strip).getAllByRole("button")[1]);
    await user.click(first());
    expect(screen.getByText("Running your code against 3 sample tests…")).toBeInTheDocument();
    expect(await within(strip).findByText("0/3 tests passed", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("0 of 3 sample tests passed")).toBeInTheDocument();
  });

  it("has no contents or Previous/Next buttons in the coding bar", () => {
    renderDemo();
    expect(screen.queryByRole("button", { name: "Navigate to table of contents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All questions" })).not.toBeInTheDocument();
  });

  it("shows the latest sample-test count on the tile and turns it yellow until every test passes", async () => {
    const user = userEvent.setup();
    renderDemo();
    const strip = screen.getByRole("navigation", { name: "Question navigation" });
    expect(within(strip).getAllByRole("button")[0]).toHaveTextContent("Question 1");
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    const count = await within(strip).findByText("0/3 tests passed", {}, { timeout: 3000 });
    expect(count).toBeInTheDocument();
    expect(within(strip).getAllByRole("button")[0]).toHaveAccessibleName(
      /0 of 3 sample tests passed$/,
    );
    await user.click(within(strip).getAllByRole("button")[1]);
    expect(within(strip).getAllByRole("button")[0]).toHaveClass("bg-player-flag");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { Text } from "@codemirror/state";
import { findStartPoint } from "../CodeEditor";
import userEvent from "@testing-library/user-event";
import { CodingWorkspace, savedCode, type CodingWorkspaceProps } from "../CodingWorkspace";
import { CodeRunFailure, type CodeRunResult } from "../assessment-player-types";

// jsdom has no layout; CodeMirror measures text ranges after updates.
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();

const announce = vi.hoisted(() => vi.fn());
vi.mock("@/shared/a11y/announcer", () => ({ announce }));

const starter = "int main(void) {\n    return 0;\n}\n";

const failed: CodeRunResult = {
  status: "compiled",
  tests: [
    { index: 1, outcome: "passed", input: "5\n1 2 3 4 5", expectedOutput: "6", actualOutput: "6" },
    { index: 2, outcome: "failed", input: "4\n-2 4 0 3", expectedOutput: "2", actualOutput: "4" },
  ],
};

function setup(props: Partial<CodingWorkspaceProps> = {}) {
  const onCodeChange = vi.fn();
  const onRun = vi.fn<(code: string) => Promise<CodeRunResult>>().mockResolvedValue(failed);
  render(
    <CodingWorkspace
      questionNumber={4}
      questionCount={8}
      prompt={"Print the sum of the **even** numbers.\n\n- One line\n- `n` integers"}
      coding={{
        language: "c",
        title: "Sum of even numbers",
        samples: [{ input: "5\n1 2 3 4 5", output: "6" }],
        starterCode: starter,
      }}
      code={undefined}
      onCodeChange={onCodeChange}
      onRun={onRun}
      layout="split"
      {...props}
    />,
  );
  return { onCodeChange, onRun };
}

beforeEach(() => announce.mockClear());

describe("CodingWorkspace", () => {
  it("reads problem, code and results as headed sections in that order", () => {
    setup();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.id);
    const names = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(["Problem", "Code", "Test results"]);
    expect(headings).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: /Question 4 of 8 · Coding \(C\) Problem/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Sum of even numbers" })).toBeInTheDocument();
    expect(screen.getByText("even").tagName).toBe("STRONG");
    expect(screen.getByRole("group", { name: "Sample 1" })).toBeInTheDocument();
  });

  it("gives the editor a name and the way out, and loads the starter code", () => {
    setup();
    const editor = screen.getByRole("textbox", { name: "Code editor, C" });
    expect(editor).toHaveAccessibleDescription(/Press Escape, then Tab, to leave the editor/);
    expect(editor).toHaveTextContent("return 0;");
    expect(screen.getByText("Line 1, column 1 · indent 0")).toBeInTheDocument();
  });

  it("runs the code, announces one summary and lists failures first", async () => {
    const user = userEvent.setup();
    const { onRun } = setup();
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    expect(onRun).toHaveBeenCalledWith(starter);
    expect(await screen.findByText("1 of 2 sample tests passed")).toBeInTheDocument();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("1 of 2 sample tests passed. Test 2 failed.");
    const items = within(screen.getByRole("region", { name: "Test results" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Test 2: Failed");
    expect(items[1]).toHaveTextContent("Test 1: Passed");
    // The visible label comes right before the output; the block itself has no name of its own.
    const output = within(items[0]).getByText("Your output").nextElementSibling;
    expect(output?.tagName).toBe("PRE");
    expect(output).toHaveTextContent("4");
    expect(output).not.toHaveAttribute("aria-label");
  });

  it("shows and announces the host's reason when a run is refused, without a retry", async () => {
    const user = userEvent.setup();
    setup({ onRun: vi.fn().mockRejectedValue(new CodeRunFailure("The Coding limit for this question has been reached.")) });
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    const results = screen.getByRole("region", { name: "Test results" });
    expect(
      await within(results).findByText("The Coding limit for this question has been reached."),
    ).toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith("The Coding limit for this question has been reached.");
    expect(within(results).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows compile errors with a way to the line", async () => {
    const user = userEvent.setup();
    setup({
      onRun: vi.fn().mockResolvedValue({
        status: "compileError",
        errors: [{ line: 2, column: 13, message: "expected ';' before '}' token" }],
      }),
    });
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByRole("button", { name: "Go to line 2" })).toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith("Compilation failed at line 2: expected ';' before '}' token.");
  });

  it("says the answer is safe when the run itself fails, and can try again", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(failed);
    setup({ onRun });
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByText("Couldn't run your code. Your answer is still saved.")).toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith("Couldn't run your code. Your answer is still saved.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 of 2 sample tests passed")).toBeInTheDocument();
  });

  it("puts Reset code and Run after the editor, not in the section header, and has no flag", () => {
    setup();
    const editor = screen.getByRole("textbox", { name: "Code editor, C" });
    const run = screen.getByRole("button", { name: /^Run/ });
    const reset = screen.getByRole("button", { name: "Reset code" });
    const heading = screen.getByRole("heading", { level: 2, name: "Code" });
    for (const button of [reset, run]) {
      expect(editor.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(heading.parentElement).not.toContainElement(button);
    }
    expect(screen.queryByRole("button", { name: /flag/i })).not.toBeInTheDocument();
  });

  it("resizes the problem column and the results area from the keyboard", async () => {
    const user = userEvent.setup();
    setup();
    const columns = screen.getByRole("separator", { name: "Resize problem and code" });
    expect(columns).toHaveAttribute("aria-orientation", "vertical");
    expect(columns).toHaveAttribute("aria-valuenow", "40");
    columns.focus();
    await user.keyboard("{ArrowRight}");
    expect(columns).toHaveAttribute("aria-valuenow", "45");
    await user.keyboard("{End}");
    expect(columns).toHaveAttribute("aria-valuenow", "60");
    await user.keyboard("{Home}");
    expect(columns).toHaveAttribute("aria-valuenow", "25");

    const rows = screen.getByRole("separator", { name: "Resize test results" });
    rows.focus();
    await user.keyboard("{ArrowUp}");
    expect(rows).toHaveAttribute("aria-valuenow", "45");
  });

  it("shows shortcuts as keys but gives screen readers the sentences", () => {
    setup();
    const hints = document.querySelector("ul[aria-hidden]");
    expect(hints).not.toBeNull();
    expect([...hints!.querySelectorAll("kbd[data-slot=kbd]")].map((k) => k.textContent)).toContain("F8");
    expect(screen.getByText(/F8 goes to the next error/)).toHaveClass("sr-only");
  });

  it("expands the editor over the workspace and back without losing the other panels", async () => {
    const user = userEvent.setup();
    setup();
    const expand = screen.getByRole("button", { name: "Expand editor" });
    expect(expand).toHaveAttribute("aria-pressed", "false");
    await user.click(expand);
    expect(expand).toHaveAttribute("aria-pressed", "true");
    // jsdom has no Tailwind; "hidden" keeps panels mounted but out of view.
    expect(screen.getByRole("region", { name: "Test results" }).parentElement).toHaveClass("hidden");
    expect(screen.getByRole("region", { name: /Problem/ }).parentElement).toHaveClass("hidden");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Code editor, C" })).toBeVisible();
    await user.click(expand);
    expect(screen.getByRole("region", { name: "Test results" }).parentElement).not.toHaveClass("hidden");
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("shows a loading state while the tests run", async () => {
    const user = userEvent.setup();
    let finish: (result: CodeRunResult) => void = () => {};
    const onRun = vi.fn(() => new Promise<CodeRunResult>((resolve) => (finish = resolve)));
    setup({ onRun, layout: "tabs" });
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    const run = screen.getByRole("button", { name: /^Running…/ });
    expect(run).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tab", { name: "Test results · Running…" })).toBeInTheDocument();
    const results = screen.getByText("Running your code against 1 sample test…").closest("section");
    expect(results).toHaveAttribute("aria-busy", "true");
    finish(failed);
    expect(await screen.findByRole("button", { name: /^Run(?!ning)/ })).toHaveAttribute("aria-disabled", "false");
    expect(results).toHaveAttribute("aria-busy", "false");
  });

  it("shows a run from an earlier visit: still running, or its results", () => {
    setup({ runPending: true });
    expect(screen.getByText("Running your code against 1 sample test…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Running…/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the latest result from an earlier visit", () => {
    setup({ lastRun: failed });
    expect(screen.getByText("1 of 2 sample tests passed")).toBeInTheDocument();
  });

  it("finds where the code goes: the empty line after the starter's comment", () => {
    const doc = Text.of(["int main(void) {", "    int n;", "    // Your code here.", "", "    return 0;", "}"]);
    expect(findStartPoint(doc)).toEqual({ pos: doc.line(4).from, indent: "    " });
    expect(findStartPoint(Text.of(["int main(void) {", "    return 0;", "}"]))).toBeNull();
  });

  it("marks where the code goes and puts the caret there on keyboard focus", () => {
    const hinted = "int main(void) {\n    int n;\n    // Your code here.\n\n    return 0;\n}\n";
    setup({ coding: { language: "c", samples: [{ input: "1", output: "1" }], starterCode: hinted } });
    expect(document.querySelector(".cm-startHere")).toHaveTextContent("…");
    act(() => screen.getByRole("textbox", { name: "Code editor, C" }).focus());
    expect(announce).toHaveBeenCalledWith("Your code goes here, line 4.");
    expect(screen.getByText("Line 4, column 1 · indent 0")).toBeInTheDocument();
  });

  it("has no start marker once the candidate has their own code", () => {
    const hinted = "int main(void) {\n    // Your code here.\n\n}\n";
    setup({
      coding: { language: "c", samples: [], starterCode: hinted },
      code: "int main(void) { return 1; }",
    });
    expect(document.querySelector(".cm-startHere")).toBeNull();
  });

  it("keeps Reset code in place but unavailable while the code is the starter code", () => {
    setup();
    const reset = screen.getByRole("button", { name: "Reset code" });
    expect(reset).toHaveAttribute("aria-disabled", "true");
    expect(reset).toHaveAccessibleDescription("The code is already the starter code.");
  });

  it("uses tabs in narrow space and names the results tab after a run without switching to it", async () => {
    const user = userEvent.setup();
    setup({ layout: "tabs" });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Problem", "Code", "Test results"]);
    expect(screen.getByRole("tab", { name: "Problem" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByRole("tab", { name: "Test results · 1 of 2 passed" })).toHaveAttribute("aria-selected", "false");
  });

  it("saves nothing for untouched or empty code", () => {
    expect(savedCode(starter, starter)).toBeUndefined();
    expect(savedCode("  \n", starter)).toBeUndefined();
    expect(savedCode("int main(void) { return 1; }", starter)).toBe("int main(void) { return 1; }");
  });
});

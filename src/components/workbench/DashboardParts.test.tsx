import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AttentionJump, AttentionList, DashboardPanel, EmptyNote, EntityRow, FactList, FlowList, PanelState, ShiftRow, ShortcutList, SplitBar, StatBand } from "./DashboardParts";

const inRouter = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe("DashboardPanel", () => {
  it("is a labelled landmark with an optional link to the full page", () => {
    inRouter(<DashboardPanel title="Exam shifts" action={{ label: "All schedules", to: "/examiner/schedule" }}>content</DashboardPanel>);
    expect(screen.getByRole("region", { name: "Exam shifts" })).toHaveTextContent("content");
    expect(screen.getByRole("link", { name: "All schedules" })).toHaveAttribute("href", "/examiner/schedule");
  });
});

describe("PanelState", () => {
  const base = { pending: false, error: null, errorText: "Could not load.", onRetry: vi.fn() };

  it("announces loading without rendering the content", () => {
    render(<PanelState {...base} pending>content</PanelState>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("offers a retry on failure", () => {
    const onRetry = vi.fn();
    render(<PanelState {...base} error={new Error("x")} onRetry={onRetry}>content</PanelState>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the empty message instead of empty content", () => {
    render(<PanelState {...base} empty="Nothing here.">content</PanelState>);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("shows the content when it has loaded", () => {
    render(<PanelState {...base}>content</PanelState>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});

describe("ShiftRow", () => {
  it("shows the time, title, place, state and an action that says what it opens", () => {
    inRouter(
      <ul>
        <ShiftRow start="07:10" end="08:40" title="SWE201 Final" meta="Lab Alpha 302" status={<span>Open</span>} hint="In progress · ends 08:40" live action={{ label: "Details", to: "/examiner/schedule/s1", description: "SWE201 Final" }} />
      </ul>,
    );
    expect(screen.getByText("07:10")).toBeInTheDocument();
    expect(screen.getByText("to 08:40")).toBeInTheDocument();
    expect(screen.getByText("In progress · ends 08:40")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details: SWE201 Final" })).toHaveAttribute("href", "/examiner/schedule/s1");
  });
});

describe("AttentionList", () => {
  it("links each item to where it is fixed and shows its count", () => {
    inRouter(<AttentionList emptyText="All clear." items={[{ key: "a", label: "Draft exam papers", hint: "Publish before scheduling", count: 3, to: "/examiner/exams" }]} />);
    const link = screen.getByRole("link", { name: /Draft exam papers/ });
    expect(link).toHaveAttribute("href", "/examiner/exams");
    expect(link).toHaveTextContent("3");
  });

  it("says so when nothing needs attention", () => {
    inRouter(<AttentionList emptyText="All clear." items={[]} />);
    expect(screen.getByText("All clear.")).toBeInTheDocument();
  });
});

describe("AttentionJump", () => {
  it("links to the attention panel and counts the items", () => {
    render(<AttentionJump count={3} targetId="needs-attention" />);
    expect(screen.getByRole("link", { name: "3 items need attention" })).toHaveAttribute("href", "#needs-attention");
  });

  it("uses the singular and shows nothing when there is nothing to do", () => {
    const { rerender } = render(<AttentionJump count={1} targetId="x" />);
    expect(screen.getByRole("link", { name: "1 item needs attention" })).toBeInTheDocument();
    rerender(<AttentionJump count={0} targetId="x" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("ShortcutList", () => {
  it("links each job to where it is done", () => {
    inRouter(<ShortcutList shortcuts={[{ key: "q", label: "Create a question", hint: "Write one for an exam", to: "/lecturer/questions/new" }]} />);
    const link = screen.getByRole("link", { name: /Create a question/ });
    expect(link).toHaveAttribute("href", "/lecturer/questions/new");
    expect(link).toHaveTextContent("Write one for an exam");
  });
});

describe("SplitBar", () => {
  const segments = [{ label: "Draft", count: 1, swatch: "bg-warning-foreground" }, { label: "Published", count: 3, swatch: "bg-success-foreground" }, { label: "Archived", count: 0, swatch: "bg-muted-foreground" }];

  it("describes the split in words, not only colour", () => {
    render(<SplitBar segments={segments} emptyText="No papers." />);
    expect(screen.getByRole("img", { name: "Draft 1, Published 3, Archived 0" })).toBeInTheDocument();
    expect(screen.getByText("Published").nextSibling).toHaveTextContent("3");
  });

  it("shows the empty message when there is nothing to split", () => {
    render(<SplitBar segments={segments.map((segment) => ({ ...segment, count: 0 }))} emptyText="No papers." />);
    expect(screen.getByText("No papers.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("StatBand", () => {
  it("shows each number with its label and detail, linking where it can be acted on", () => {
    inRouter(
      <StatBand
        stats={[
          { key: "papers", label: "Exam papers", value: "4", detail: "1 published · 3 draft", to: "/examiner/exams" },
          { key: "rooms", label: "Exam rooms", value: "3", detail: "of 4 active" },
        ]}
      />,
    );
    const band = screen.getByRole("region", { name: "Overview" });
    const link = within(band).getByRole("link", { name: /Exam papers/ });
    expect(link).toHaveAttribute("href", "/examiner/exams");
    expect(link).toHaveTextContent("41 published · 3 draft");
    expect(within(band).getAllByRole("listitem")).toHaveLength(2);
    expect(within(band).getAllByRole("link")).toHaveLength(1);
  });
});

describe("EmptyNote", () => {
  it("says what is missing and offers the way to fix it", () => {
    inRouter(<EmptyNote title="No exam shifts yet" text="Create a schedule." action={{ label: "Create schedule", to: "/examiner/schedule/new/details" }} />);
    expect(screen.getByText("No exam shifts yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create schedule" })).toHaveAttribute("href", "/examiner/schedule/new/details");
  });

  it("works without an action", () => {
    inRouter(<EmptyNote title="Nothing here" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("FlowList", () => {
  it("numbers the steps and gives each its state and the way in", () => {
    inRouter(
      <FlowList
        steps={[
          { key: "a", title: "Build exam papers", summary: "3 in draft", status: { label: "In progress", tone: "warning" }, actions: [{ label: "Exam papers", to: "/examiner/exams" }] },
          { key: "b", title: "Run exams", summary: "Standby", status: { label: "Standby", tone: "neutral" }, actions: [{ label: "Live monitoring", to: "/examiner/monitoring" }, { label: "Grade release", to: "/examiner/results" }] },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("heading", { name: "Build exam papers" })).toBeInTheDocument();
    expect(within(items[0]).getByText("In progress")).toBeInTheDocument();
    expect(within(items[1]).getAllByRole("link").map((link) => link.textContent)).toEqual(["Live monitoring", "Grade release"]);
  });
});

describe("EntityRow", () => {
  it("shows the record, its context and its state", () => {
    render(<ul><EntityRow title="SWE201 midterm paper" meta="SWE201-MT-01 · Software Engineering" badge={<span>Draft</span>} /></ul>);
    expect(screen.getByText("SWE201 midterm paper")).toBeInTheDocument();
    expect(screen.getByText("SWE201-MT-01 · Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});

describe("FactList", () => {
  it("pairs each label with its value", () => {
    render(<FactList facts={[{ label: "Active rooms", value: "8 of 10" }]} />);
    expect(screen.getByText("Active rooms").tagName).toBe("DT");
    expect(screen.getByText("8 of 10").tagName).toBe("DD");
  });
});

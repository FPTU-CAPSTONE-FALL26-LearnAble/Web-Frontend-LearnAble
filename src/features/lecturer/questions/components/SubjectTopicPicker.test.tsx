import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SubjectTopicPicker } from "./SubjectTopicPicker";

const subjects = [
  { subjectId: "s1", subjectCode: "AAL301", subjectNameEn: "Advanced Algorithms" },
  { subjectId: "s2", subjectCode: "ACC101", subjectNameEn: "Financial Accounting" },
  { subjectId: "s3", subjectCode: "CHN111", subjectNameEn: "Elementary Chinese" },
];
const manyTopics = Array.from({ length: 12 }, (_, index) => ({ topicId: `t${index}`, subjectId: "s1", topicName: `Algorithms topic ${index}` }));
const topics = [...manyTopics, { topicId: "c1", subjectId: "s3", topicName: "Pinyin" }];

function Harness({ onSubject = vi.fn(), onTopic = vi.fn(), start = { subject: "all", topic: "all" }, loading = false }: { onSubject?: (id: string) => void; onTopic?: (id: string) => void; start?: { subject: string; topic: string }; loading?: boolean }) {
  const [state, setState] = useState(start);
  return (
    <SubjectTopicPicker
      subjects={subjects}
      topics={topics}
      subjectId={state.subject}
      topicId={state.topic}
      loading={loading}
      onSubjectChange={(id) => { onSubject(id); setState({ subject: id, topic: "all" }); }}
      onTopicChange={(id) => { onTopic(id); setState((old) => ({ ...old, topic: id })); }}
    />
  );
}
const subjectList = () => screen.getByRole("list", { name: "Subjects" });

describe("SubjectTopicPicker", () => {
  it("lists every subject with how many topics it has", () => {
    render(<Harness />);
    expect(screen.getByText("3 subjects")).toBeInTheDocument();
    expect(within(subjectList()).getByRole("button", { name: /AAL301 · Advanced Algorithms\s*12 topics/ })).toBeInTheDocument();
    expect(within(subjectList()).getByRole("button", { name: /CHN111.*1 topic$/ })).toBeInTheDocument();
    expect(screen.getByText("Choose a subject to filter by one of its topics.")).toBeInTheDocument();
  });

  it("searches subjects by code or name, without needing accents", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Search subjects by code or name"), { target: { value: "chinese" } });
    expect(screen.getByText("1 of 3 subjects")).toBeInTheDocument();
    expect(within(subjectList()).queryByRole("button", { name: /AAL301/ })).not.toBeInTheDocument();
    expect(within(subjectList()).getByRole("button", { name: /CHN111/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search subjects by code or name"), { target: { value: "zzz" } });
    expect(screen.getByText("No subject matches “zzz”.")).toBeInTheDocument();
  });

  it("keeps 'All subjects' available while searching", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Search subjects by code or name"), { target: { value: "zzz" } });
    expect(within(subjectList()).getByRole("button", { name: "All subjects" })).toBeInTheDocument();
  });

  it("shows the topics of the chosen subject and reports the choice", async () => {
    const user = userEvent.setup();
    const onSubject = vi.fn();
    render(<Harness onSubject={onSubject} />);
    await user.click(within(subjectList()).getByRole("button", { name: /AAL301/ }));
    expect(onSubject).toHaveBeenCalledWith("s1");
    expect(screen.getByRole("list", { name: "Topics" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Topics of the chosen subject" })).getByText("12 topics")).toBeInTheDocument();
    expect(screen.getByText("Algorithms topic 3")).toBeInTheDocument();
    expect(screen.queryByText("Pinyin")).not.toBeInTheDocument();
    expect(within(subjectList()).getByRole("button", { name: /AAL301/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers a topic search only when there are many topics", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(within(subjectList()).getByRole("button", { name: /AAL301/ }));
    fireEvent.change(screen.getByLabelText("Search topics"), { target: { value: "topic 11" } });
    expect(screen.getByText("1 of 12 topics")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Algorithms topic 11" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Algorithms topic 2" })).not.toBeInTheDocument();
    await user.click(within(subjectList()).getByRole("button", { name: /CHN111/ }));
    expect(screen.queryByLabelText("Search topics")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pinyin" })).toBeInTheDocument();
  });

  it("starts each subject with a fresh topic search", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(within(subjectList()).getByRole("button", { name: /AAL301/ }));
    fireEvent.change(screen.getByLabelText("Search topics"), { target: { value: "topic 11" } });
    await user.click(within(subjectList()).getByRole("button", { name: /CHN111/ }));
    await user.click(within(subjectList()).getByRole("button", { name: /AAL301/ }));
    expect(screen.getByLabelText("Search topics")).toHaveValue("");
  });

  it("chooses a topic and summarises the filter, which can be cleared", async () => {
    const user = userEvent.setup();
    const onTopic = vi.fn();
    const onSubject = vi.fn();
    render(<Harness onTopic={onTopic} onSubject={onSubject} />);
    await user.click(within(subjectList()).getByRole("button", { name: /AAL301/ }));
    await user.click(screen.getByRole("button", { name: "Algorithms topic 4" }));
    expect(onTopic).toHaveBeenCalledWith("t4");
    expect(screen.getByText("AAL301 · Advanced Algorithms", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Algorithms topic 4", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear subject and topic" }));
    expect(onSubject).toHaveBeenLastCalledWith("all");
    expect(screen.getByText("Showing questions from all subjects and topics.")).toBeInTheDocument();
  });

  it("says so when a subject has no topics", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(within(subjectList()).getByRole("button", { name: /ACC101/ }));
    expect(screen.getByText("This subject has no topics.")).toBeInTheDocument();
  });

  it("shows a loading state instead of empty lists", () => {
    render(<Harness loading />);
    expect(screen.getByText("Loading subjects and topics…")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Subjects" })).not.toBeInTheDocument();
  });
});

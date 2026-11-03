import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Download, FileQuestion, Plus, Search, Upload } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { formatQuestionId } from "@/shared/strings/questionId";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  notConnected,
  PageHeading,
  Pagination,
  StatusBadge,
  SummaryCard,
} from "@/features/lecturer/shared/components/Workbench";
import { type ManagedQuestion, type QuestionPurpose } from "@/features/lecturer/questions/model";
import { ChoiceField } from "@/features/lecturer/questions/components/QuestionFields";
import { useQuestionBank } from "@/features/lecturer/questions/api/useQuestionBank";

const defaults = {
  examType: "all",
  subject: "all",
  topic: "all",
  type: "all",
  difficulty: "all",
  status: "all",
  usage: "all",
};
const views = {
  exam: {
    title: "Exam Questions",
    description:
      "Manage questions prepared for formal examinations and assessment papers.",
    usageLabel: "Exam usage",
    usedLabel: "Used in exams",
    usedColumn: "Used in exams",
    empty: "No exam questions match your filters.",
  },
  practice: {
    title: "Practice Questions",
    description:
      "Manage questions students use for guided practice and self-review.",
    usageLabel: "Practice usage",
    usedLabel: "Used in practice sets",
    usedColumn: "Practice sets",
    empty: "No practice questions match your filters.",
  },
};

export function QuestionBankRoute({
  purpose = "exam",
}: {
  purpose?: QuestionPurpose;
}) {
  const view = views[purpose];
  useRouteAnnouncer(view.title, view.title);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [selected, setSelected] = useState<string[]>([]);
  const { data, examTypes, purposeExamTypes, statusMutation } = useQuestionBank(purpose);
  const [bulkTopic, setBulkTopic] = useState("");
  const subjects = [...new Set(data.map((item) => item.subjectCode))];
  const topics = [
    ...new Set(
      data
        .filter(
          (item) =>
            filters.subject === "all" || item.subjectCode === filters.subject,
        )
        .map((item) => item.topic),
    ),
  ];
  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const text =
          `${item.id} ${item.content} ${item.subjectCode} ${item.topic}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (filters.examType === "all" || item.examTypeId === filters.examType) &&
          (filters.subject === "all" || item.subjectCode === filters.subject) &&
          (filters.topic === "all" || item.topic === filters.topic) &&
          (filters.type === "all" || item.type === filters.type) &&
          (filters.difficulty === "all" ||
            item.difficulty === filters.difficulty) &&
          (filters.status === "all" || item.status === filters.status)
        );
      }),
    [data, filters, search],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / Number(size)));
  const rows = filtered.slice((page - 1) * Number(size), page * Number(size));
  const update = (key: keyof typeof filters, value: string) => {
    setFilters((old) => ({
      ...old,
      [key]: value,
      ...(key === "subject" ? { topic: "all" } : {}),
    }));
    setPage(1);
    setSelected([]);
  };
  const reset = () => {
    setFilters(defaults);
    setQuery("");
    setSearch("");
    setPage(1);
    setSelected([]);
  };
  const summary = [
    ["Total questions", data.length],
    ["Active questions", data.filter((q) => q.status === "Active").length],
    ["Draft questions", data.filter((q) => q.status === "Draft").length],
    ["Exam types", new Set(data.map((q) => q.examTypeId)).size],
  ] as const;
  return (
    <div className="space-y-6">
      <PageHeading title={view.title} description={view.description}>
        <Button variant="outline" asChild>
          <Link to={`/lecturer/questions/import?purpose=${purpose}`}>
            <Upload aria-hidden />
            Import
          </Link>
        </Button>
        <Button variant="outline" onClick={() => {
          const csv = ["id,content,course,topic,type,difficulty,points,status", ...data.map((item) => `${item.id},"${item.content.replaceAll('"', '""')}",${item.subjectCode},${item.topic},${item.type},${item.difficulty},${item.score},${item.status}`)].join("\n");
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
          const link = document.createElement("a"); link.href = url; link.download = `${purpose}-questions.csv`; link.click(); URL.revokeObjectURL(url);
        }}>
          <Download aria-hidden />
          Export
        </Button>
        <Button asChild>
          <Link to={`/lecturer/questions/new?purpose=${purpose}`}>
            <Plus aria-hidden />
            Create {purpose} question
          </Link>
        </Button>
      </PageHeading>
      {examTypes.isSuccess && purposeExamTypes.length === 0 && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          No active {purpose === "practice" ? "practice" : "exam"} category is available. Ask an administrator to review the exam type settings.
        </div>
      )}
      <section
        aria-label={`${view.title} summary`}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summary.map(([label, value]) => (
          <SummaryCard
            key={label}
            label={label}
            value={value}
            compact
            icon={
              <FileQuestion aria-hidden className="size-5 text-secondary" />
            }
          />
        ))}
      </section>
      <Card className="lecturer-major-card border shadow-none">
        <CardContent className="space-y-5">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query.trim());
              setPage(1);
              setSelected([]);
            }}
          >
            <div className="relative min-w-0 flex-1 basis-60">
              <Search
                aria-hidden
                className="absolute left-3 top-3 size-5 text-muted-foreground"
              />
              <Input
                aria-label={`Search ${purpose} questions`}
                placeholder="Search question content or ID"
                className="pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button type="submit">
              <Search aria-hidden />
              Search
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Reset filters
            </Button>
          </form>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ChoiceField
              label="Exam type"
              value={filters.examType}
              options={[
                { value: "all", label: "All exam types" },
                ...purposeExamTypes.map((item) => ({
                  value: item.examTypeId,
                  label: item.code ? `${item.code} · ${item.name ?? "Unnamed"}` : item.name ?? "Unnamed",
                })),
              ]}
              onChange={(value) => update("examType", value)}
            />
            <ChoiceField
              label="Course"
              value={filters.subject}
              options={[
                { value: "all", label: "All courses" },
                ...subjects.map((value) => ({ value, label: value })),
              ]}
              onChange={(value) => update("subject", value)}
            />
            <ChoiceField
              label="Topic"
              value={filters.topic}
              options={[
                { value: "all", label: "All topics" },
                ...topics.map((value) => ({ value, label: value })),
              ]}
              onChange={(value) => update("topic", value)}
            />
            <ChoiceField
              label="Question type"
              value={filters.type}
              options={[
                { value: "all", label: "All types" },
                "Single Choice",
                "Multiple Choice",
                "Essay",
                "Write Code",
              ]}
              onChange={(value) => update("type", value)}
            />
            <ChoiceField
              label="Difficulty"
              value={filters.difficulty}
              options={[
                { value: "all", label: "All difficulties" },
                "Easy",
                "Medium",
                "Hard",
              ]}
              onChange={(value) => update("difficulty", value)}
            />
            <ChoiceField
              label="Status"
              value={filters.status}
              options={[
                { value: "all", label: "All statuses" },
                "Active",
                "Draft",
                "Archived",
              ]}
              onChange={(value) => update("status", value)}
            />
          </div>
        </CardContent>
      </Card>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary p-4">
          <p role="status" className="mr-auto text-sm font-bold">
            {selected.length} questions selected
          </p>
          <Button
            variant="outline"
            onClick={() =>
              notConnected(
                purpose === "exam"
                  ? "Add to exam paper"
                  : "Assign to practice set",
              )
            }
          >
            {purpose === "exam"
              ? "Add to exam paper"
              : "Assign to practice set"}
          </Button>
          <div className="flex min-w-64 items-center gap-2">
            <Input aria-label="Bulk topic" placeholder="New topic" value={bulkTopic} onChange={(event) => setBulkTopic(event.target.value)} />
            <Button variant="outline" disabled={!bulkTopic.trim()} onClick={() => notConnected("Bulk topic assignment")}>Assign topic</Button>
          </div>
          <Button
            variant="outline"
            onClick={() => notConnected("Bulk status change")}
          >
            Change status
          </Button>
        </div>
      )}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-bold text-primary">{view.title}</h2>
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            Showing {rows.length} of {filtered.length} questions
          </p>
        </div>
        <Table aria-label={`${view.title} table`} className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  aria-label="Select all questions on this page"
                  checked={
                    rows.length > 0 &&
                    rows.every((q) => selected.includes(q.id))
                      ? true
                      : rows.some((q) => selected.includes(q.id))
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) =>
                    setSelected(checked === true ? rows.map((q) => q.id) : [])
                  }
                />
              </TableHead>
              <TableHead>Question ID</TableHead>
              <TableHead>Content & type</TableHead>
              <TableHead>Course / topic</TableHead>
              <TableHead>{view.usedColumn}</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((q: ManagedQuestion) => (
              <TableRow
                key={q.id}
                data-state={selected.includes(q.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${q.id}`}
                    checked={selected.includes(q.id)}
                    onCheckedChange={(checked) =>
                      setSelected((old) =>
                        checked === true
                          ? [...new Set([...old, q.id])]
                          : old.filter((id) => id !== q.id),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <p
                    className="font-semibold text-primary"
                    title={q.id}
                    aria-label={`Question ID ${q.id}`}
                  >
                    {formatQuestionId(q.id)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge value={q.status} />
                  </div>
                </TableCell>
                <TableCell className="min-w-80 max-w-lg whitespace-normal">
                  <p className="font-medium leading-relaxed">{q.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {q.type} · {q.score} points · {q.difficulty}
                  </p>
                </TableCell>
                <TableCell className="min-w-48 whitespace-normal">
                  <p className="font-bold">{q.subjectCode}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.subjectName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.topic}
                  </p>
                </TableCell>
                <TableCell>
                  {q.usageCount ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{q.readiness}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(q.updatedAt).toLocaleDateString("en-US")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: q.id, status: q.status === "Active" ? "Archived" : "Active" })}>{q.status === "Active" ? "Archive" : "Activate"}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <p className="font-bold">{view.empty}</p>
                  <p className="mt-2 text-muted-foreground">
                    Try another search or reset the filters.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination
          page={page}
          pages={pages}
          size={size}
          onPage={(value) => {
            setPage(value);
            setSelected([]);
          }}
          onSize={(value) => {
            setSize(value);
            setPage(1);
            setSelected([]);
          }}
        />
      </section>
    </div>
  );
}

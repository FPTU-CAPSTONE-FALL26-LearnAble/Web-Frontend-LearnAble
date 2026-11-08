import { useEffect, useState } from "react";
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
  PageHeading,
  Pagination,
  StatusBadge,
  SummaryCard,
} from "@/features/lecturer/shared/components/Workbench";
import { type ManagedQuestion, type QuestionPurpose } from "@/features/lecturer/questions/model";
import { ChoiceField } from "@/features/lecturer/questions/components/QuestionFields";
import { useQuestionBank } from "@/features/lecturer/questions/api/useQuestionBank";

const defaults = {
  examType: "",
  subject: "all",
  topic: "all",
  type: "all",
  difficulty: "all",
  status: "all",
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
  const bank = useQuestionBank(purpose, {
    examTypeId: filters.examType,
    search,
    topicId: filters.topic === "all" ? "" : filters.topic,
    questionType: filters.type === "all" ? "" : filters.type,
    difficulty: filters.difficulty === "all" ? "" : filters.difficulty,
    status: filters.status === "all" ? "" : filters.status,
    page,
    pageSize: Number(size),
  });
  const { data, pageData, examTypes, purposeExamTypes, statusMutation } = bank;
  useEffect(() => {
    if (purposeExamTypes.length && !purposeExamTypes.some((item) => item.examTypeId === filters.examType)) {
      setFilters((current) => ({ ...current, examType: purposeExamTypes[0].examTypeId }));
      setPage(1);
    }
  }, [filters.examType, purposeExamTypes]);
  const subjects = bank.subjects.data?.items ?? [];
  const topics = (bank.topics.data?.items ?? []).filter((topic) => filters.subject === "all" || topic.subjectId === filters.subject);
  const pages = Math.max(1, pageData?.totalPages ?? 1);
  const rows = data;
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
    setFilters({ ...defaults, examType: purposeExamTypes[0]?.examTypeId ?? "" });
    setQuery("");
    setSearch("");
    setPage(1);
    setSelected([]);
  };
  const summary = [
    ["Matching questions", pageData?.totalCount ?? 0],
    ["Active on page", data.filter((q) => q.status === "Active").length],
    ["Draft on page", data.filter((q) => q.status === "Draft").length],
    ["Results on page", data.length],
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
          Export current page
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
                ...purposeExamTypes.map((item) => ({
                  value: item.examTypeId,
                  label: item.code ? `${item.code} · ${item.name ?? "Unnamed"}` : item.name ?? "Unnamed",
                })),
              ]}
              onChange={(value) => update("examType", value)}
            />
            <ChoiceField
              label="Question type"
              value={filters.type}
              options={[
                { value: "all", label: "All types" },
                { value: "Single", label: "Single Choice" },
                { value: "Multiple", label: "Multiple Choice" },
                { value: "Essay", label: "Essay" },
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
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 font-semibold">Subject → Topic</legend>
            <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
              <Button type="button" variant={filters.subject === "all" ? "default" : "outline"} className="justify-start" onClick={() => update("subject", "all")}>All subjects</Button>
              {subjects.map((subject) => {
                const subjectTopics = (bank.topics.data?.items ?? []).filter((topic) => topic.subjectId === subject.subjectId);
                const selectedSubject = filters.subject === subject.subjectId;
                return <div key={subject.subjectId} className="min-w-0 rounded-xl border border-border p-2">
                  <Button type="button" variant={selectedSubject && filters.topic === "all" ? "default" : "ghost"} className="w-full justify-start truncate" onClick={() => update("subject", subject.subjectId)}>{subject.subjectCode} · {subject.subjectNameEn ?? "Unnamed subject"}</Button>
                  {selectedSubject ? <ul className="mt-1 space-y-1 border-l border-border pl-3">{subjectTopics.map((topic) => <li key={topic.topicId}><Button type="button" size="sm" variant={filters.topic === topic.topicId ? "secondary" : "ghost"} className="w-full justify-start whitespace-normal text-left" onClick={() => update("topic", topic.topicId)}>{topic.topicName}</Button></li>)}</ul> : null}
                </div>;
              })}
            </div>
            {filters.subject !== "all" && topics.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">This subject has no topics.</p> : null}
          </fieldset>
        </CardContent>
      </Card>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary p-4">
          <p role="status" className="mr-auto text-sm font-bold">
            {selected.length} questions selected
          </p>
          <Button variant="outline" onClick={() => setSelected([])}>Clear selection</Button>
        </div>
      )}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-bold text-primary">{view.title}</h2>
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            Showing {rows.length} of {pageData?.totalCount ?? 0} questions from the server
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
                    {q.status !== "Archived" ? <Button variant="outline" asChild><Link to={`/lecturer/questions/new?purpose=${purpose}&edit=${q.id}`}>Edit</Link></Button> : null}
                    {q.status === "Active" ? <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: q.id, status: "Archived" })}>Archive</Button> : null}
                    {q.status === "Draft" ? <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: q.id, status: "Active" })}>Activate</Button> : null}
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

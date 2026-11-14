import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { CheckCheck, Download, FileQuestion, Plus, Search, SlidersHorizontal, Upload } from "lucide-react";
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
import { AudioGenerationPanel, type QuestionProgress } from "@/features/lecturer/questions/components/AudioGenerationStatus";
import { ActivationProgress, type ActivationProgressState } from "@/features/lecturer/questions/components/ActivationProgress";
import { QuestionPreviewDialog } from "@/features/lecturer/questions/components/QuestionPreviewDialog";
import { audioFilterLabels, matchesAudioFilter, useQuestionAudio, type AudioFilter, type QuestionAudio } from "@/features/lecturer/questions/audioStatus";
import { ChoiceField } from "@/features/lecturer/questions/components/QuestionFields";
import { SubjectTopicPicker } from "@/features/lecturer/questions/components/SubjectTopicPicker";
import { subjectLabel } from "@/features/lecturer/questions/subjectTopicSearch";
import { downloadQuestionWorkbook } from "@/features/lecturer/questions/export/questionExport";
import { buildExamTypeOptions } from "@/lib/examTypeLabel";
import { usePersistedFlag } from "@/lib/usePersistedFlag";
import { toast } from "@/shared/ui/primitives/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/primitives/alert-dialog";
import { setQuestionStatus } from "@/api/lecturer";
import { describeError } from "@/app/providers";
import { useQuestionBank } from "@/features/lecturer/questions/api/useQuestionBank";

const defaults = {
  audio: "all",
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
    loadAll: filters.audio !== "all",
  });
  const { data, pageData, examTypes, purposeExamTypes, statusMutation } = bank;
  useEffect(() => {
    if (purposeExamTypes.length && !purposeExamTypes.some((item) => item.examTypeId === filters.examType)) {
      setFilters((current) => ({ ...current, examType: purposeExamTypes[0].examTypeId }));
      setPage(1);
    }
  }, [filters.examType, purposeExamTypes]);
  const subjects = bank.subjects.data?.items ?? [];
  const allTopics = bank.topics.data?.items ?? [];
  const examTypeOptions = buildExamTypeOptions(purposeExamTypes);
  // The filters can be folded away to leave the room to the questions; a one-line summary stays.
  const [filtersHidden, toggleFilters] = usePersistedFlag("learnable.lecturer.question-filters-hidden", false);
  const chosenSubject = subjects.find((item) => item.subjectId === filters.subject);
  const chosenTopic = allTopics.find((item) => item.topicId === filters.topic);
  const questionTypeNames: Record<string, string> = { Single: "Single Choice", Multiple: "Multiple Choice", Essay: "Essay" };
  // Every filter is listed, also those left at "All", so a folded panel still shows exactly what is applied.
  const filterSummary: Array<{ name: string; value: string; active: boolean }> = [
    { name: "Exam type", value: examTypeOptions.find((item) => item.value === filters.examType)?.label ?? "Not selected", active: true },
    { name: "Question type", value: filters.type === "all" ? "All types" : questionTypeNames[filters.type] ?? filters.type, active: filters.type !== "all" },
    { name: "Difficulty", value: filters.difficulty === "all" ? "All difficulties" : filters.difficulty, active: filters.difficulty !== "all" },
    { name: "Status", value: filters.status === "all" ? "All statuses" : filters.status, active: filters.status !== "all" },
    { name: "Audio", value: audioFilterLabels[filters.audio as AudioFilter] ?? filters.audio, active: filters.audio !== "all" },
    { name: "Subject", value: filters.subject === "all" ? "All subjects" : chosenSubject ? subjectLabel(chosenSubject) : "Selected subject", active: filters.subject !== "all" },
    { name: "Topic", value: filters.topic === "all" ? "All topics" : chosenTopic?.topicName ?? "Selected topic", active: filters.topic !== "all" },
  ];
  // The exam type is always chosen, and a topic belongs to its subject, so neither adds to the count.
  const activeFilterCount = filterSummary.filter((item) => item.active && item.name !== "Exam type" && item.name !== "Topic").length;
  // The Backend cannot filter by audio. With an audio filter every matching question is loaded,
  // each one asks for its own audio state, and this page filters and pages the result itself.
  const audioFilter = filters.audio as AudioFilter;
  const audioFiltering = audioFilter !== "all";
  // Audio is read for every matching question, not only the page, so progress can count questions.
  const everyItems = bank.everyQuestion.data?.items;
  const audioIds = [...new Set([...data.map((question) => question.id), ...(everyItems ?? []).map((question) => question.questionId)])];
  const audioById = useQuestionAudio(audioIds, {
    priorityIds: audioFiltering ? audioIds : data.map((question) => question.id),
    restEnabled: !bank.list.isFetching,
  });
  const questionProgress: QuestionProgress = {
    loading: !everyItems,
    total: everyItems?.length ?? 0,
    ready: 0,
    waiting: 0,
    failed: 0,
    none: 0,
    checking: 0,
  };
  for (const question of everyItems ?? []) {
    const state = audioById.get(question.questionId)?.state;
    if (state === "ready" || state === "waiting" || state === "failed" || state === "none") questionProgress[state] += 1;
    else questionProgress.checking += 1;
  }
  const matched = audioFiltering ? data.filter((question) => matchesAudioFilter(audioById.get(question.id), audioFilter)) : data;
  const checkingAudio = audioFiltering && data.some((question) => audioById.get(question.id)?.state === "loading");
  const totalCount = audioFiltering ? matched.length : pageData?.totalCount ?? 0;
  const pages = audioFiltering ? Math.max(1, Math.ceil(matched.length / Number(size))) : Math.max(1, pageData?.totalPages ?? 1);
  const rows = audioFiltering ? matched.slice((page - 1) * Number(size), page * Number(size)) : matched;
  // Until the first answer arrives the list is empty, which must not read as "no questions match".
  const loadingList = bank.examTypes.isPending
    || (!filters.examType && purposeExamTypes.length > 0)
    || (bank.list.isFetching && data.length === 0)
    || (checkingAudio && rows.length === 0);
  const refreshingList = !loadingList && (bank.list.isFetching || checkingAudio);
  const [exporting, setExporting] = useState(false);
  const exportPage = async () => {
    setExporting(true);
    try {
      await downloadQuestionWorkbook(rows, {
        purpose,
        title: view.title,
        filters: filterSummary.filter((item) => item.active).map((item): [string, string] => [item.name, item.value]),
        exportedAt: new Date(),
        page,
        pageCount: pages,
        totalCount,
      });
    } catch {
      toast({ title: "Export failed", description: "The Excel file could not be created. Try again.", variant: "error" });
    } finally {
      setExporting(false);
    }
  };
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Questions picked with "Select all" may be on other pages, so their statuses are kept here.
  const [matchingStatus, setMatchingStatus] = useState<Record<string, string>>({});
  const statusOf = (id: string) => matchingStatus[id] ?? data.find((question) => question.id === id)?.status;
  const selectedDrafts = selected.filter((id) => statusOf(id) === "Draft");
  const [selectingAll, setSelectingAll] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const everything = audioFiltering
        ? matched.map((question) => ({ id: question.id, status: question.status as string }))
        : (await bank.readEveryQuestion()).items.map((question) => ({ id: question.questionId, status: question.status }));
      setMatchingStatus(Object.fromEntries(everything.map((item) => [item.id, item.status])));
      setSelected(everything.map((item) => item.id));
    } catch {
      toast({ title: "Could not select all questions", description: "The full list could not be loaded. Try again.", variant: "error" });
    } finally {
      setSelectingAll(false);
    }
  };
  const [activation, setActivation] = useState<ActivationProgressState | null>(null);
  const activateSelected = useMutation({
    mutationFn: async (ids: string[]) => {
      // A few at a time, so a long selection does not flood the server. The tracker updates after each group.
      for (let start = 0; start < ids.length; start += 5) {
        const results = await Promise.allSettled(ids.slice(start, start + 5).map((id) => setQuestionStatus(id, "Active")));
        const refused = results.flatMap((result) => (result.status === "rejected" ? [describeError(result.reason)] : []));
        setActivation((current) => current && {
          ...current,
          done: current.done + results.length - refused.length,
          failed: current.failed + refused.length,
          reason: current.reason ?? refused[0],
        });
      }
    },
    onSettled: async () => {
      setActivation((current) => current && { ...current, running: false });
      await bank.refresh();
    },
  });
  const startActivation = () => {
    const ids = selectedDrafts;
    setActivation({ total: ids.length, done: 0, failed: 0, running: true, minimized: false });
    setConfirmActivate(false);
    setSelected([]);
    setMatchingStatus({});
    activateSelected.mutate(ids);
  };
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
    ["Matching questions", totalCount],
    ["Active on page", rows.filter((q) => q.status === "Active").length],
    ["Draft on page", rows.filter((q) => q.status === "Draft").length],
    ["Results on page", rows.length],
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
        <Button variant="outline" disabled={!data.length || exporting} onClick={() => void exportPage()}>
          <Download aria-hidden />
          {exporting ? "Preparing Excel file…" : "Export current page (.xlsx)"}
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
      {filters.examType && (filters.subject !== "all" || subjects.length > 0) ? (
        <AudioGenerationPanel
          questionProgress={questionProgress}
          filters={{
            examTypeId: filters.examType,
            subjectId: filters.subject === "all" ? undefined : filters.subject,
            topicId: filters.topic === "all" ? undefined : filters.topic,
          }}
          subjectIds={subjects.map((subject) => subject.subjectId)}
        />
      ) : null}
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
            <Button
              type="button"
              variant="outline"
              aria-expanded={!filtersHidden}
              aria-controls="question-filter-panel"
              onClick={toggleFilters}
            >
              <SlidersHorizontal aria-hidden />
              {filtersHidden ? "Show filters" : "Hide filters"}
              {activeFilterCount ? (
                <span aria-label={`${activeFilterCount} active`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold leading-5 text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Reset filters
            </Button>
          </form>
          {filtersHidden ? (
            <ul aria-label="Active filters" className="flex flex-wrap gap-2">
              {filterSummary.map(({ name, value, active }) => (
                <li key={name} className={active ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-sm wrap-anywhere" : "rounded-md border border-border bg-muted/40 px-2 py-1 text-sm wrap-anywhere"}>
                  <span className="text-muted-foreground">{name}</span> <strong className={active ? "font-semibold" : "font-normal"}>{value}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          <div id="question-filter-panel" hidden={filtersHidden} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ChoiceField
              label="Exam type"
              value={filters.examType}
              options={examTypeOptions}
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
            <ChoiceField
              label="Audio"
              value={filters.audio}
              options={(Object.keys(audioFilterLabels) as AudioFilter[]).map((value) => ({ value, label: audioFilterLabels[value] }))}
              onChange={(value) => update("audio", value)}
            />
          </div>
          <SubjectTopicPicker
            subjects={subjects}
            topics={allTopics}
            subjectId={filters.subject}
            topicId={filters.topic}
            onSubjectChange={(id) => update("subject", id)}
            onTopicChange={(id) => update("topic", id)}
            loading={bank.subjects.isPending || bank.topics.isPending}
          />
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-4">
        <p role="status" className="mr-auto text-sm font-bold">
          {selected.length
            ? `${selected.length} questions selected${selectedDrafts.length !== selected.length ? ` · ${selectedDrafts.length} Draft` : ""}`
            : "No questions selected"}
        </p>
        <Button variant="outline" disabled={!totalCount || selectingAll || selected.length === totalCount} onClick={() => void selectAllMatching()}>
          {selectingAll ? "Selecting…" : `Select all ${totalCount} matching`}
        </Button>
        <Button variant="success" disabled={!selectedDrafts.length || activateSelected.isPending} onClick={() => setConfirmActivate(true)}>
          <CheckCheck aria-hidden />
          Activate {selectedDrafts.length} selected
        </Button>
        {selected.length > 0 ? <Button variant="outline" onClick={() => setSelected([])}>Clear selection</Button> : null}
      </div>
      <section className={refreshingList ? "min-w-0 overflow-hidden rounded-2xl border border-border opacity-60 transition-opacity" : "min-w-0 overflow-hidden rounded-2xl border border-border transition-opacity"}>
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-bold text-primary">{view.title}</h2>
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            {loadingList ? "Loading questions…" : <>Showing {rows.length} of {totalCount} questions from the server</>}
          </p>
          {checkingAudio ? (
            <p role="status" className="mt-1 text-sm text-muted-foreground">
              Checking the audio of all {data.length} matching questions…
            </p>
          ) : null}
        </div>
        <Table aria-label={`${view.title} table`} aria-busy={loadingList || refreshingList} className="min-w-[1280px]">
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
              <TableHead>Audio</TableHead>
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
                <TableCell className="whitespace-normal">
                  <AudioBadge audio={audioById.get(q.id)} />
                </TableCell>
                <TableCell>
                  {new Date(q.updatedAt).toLocaleDateString("en-US")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPreviewId(q.id)}>Preview</Button>
                    {q.status !== "Archived" ? <Button variant="outline" asChild><Link to={`/lecturer/questions/new?purpose=${purpose}&edit=${q.id}`}>Edit</Link></Button> : null}
                    {q.status === "Active" ? <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: q.id, status: "Archived" })}>Archive</Button> : null}
                    {q.status === "Draft" ? <Button variant="success" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: q.id, status: "Active" })}>Activate</Button> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {loadingList ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <div role="status" aria-label="Loading questions" className="animate-pulse space-y-3">
                    {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 rounded-lg bg-muted" />)}
                    <span className="sr-only">Loading questions…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
            {!rows.length && !loadingList && (
              <TableRow>
                <TableCell colSpan={10} className="h-40 text-center">
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
      <AlertDialog open={confirmActivate} onOpenChange={setConfirmActivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate {selectedDrafts.length} question{selectedDrafts.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Active questions can be used in exams. Questions that are already Active or Archived in your selection are skipped. You can archive a question again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="success" onClick={(event) => { event.preventDefault(); startActivation(); }}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {activation ? (
        <ActivationProgress
          state={activation}
          onToggle={() => setActivation((current) => current && { ...current, minimized: !current.minimized })}
          onClose={() => setActivation(null)}
        />
      ) : null}
      <QuestionPreviewDialog
        questionId={previewId}
        course={data.find((question) => question.id === previewId)?.subjectCode ?? ""}
        topic={data.find((question) => question.id === previewId)?.topic ?? ""}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
}

function AudioBadge({ audio }: { audio?: QuestionAudio }) {
  if (!audio || audio.state === "loading") return <span className="text-xs text-muted-foreground">Checking…</span>;
  if (audio.state === "unavailable") return <span className="text-xs text-muted-foreground">Unknown</span>;
  const names = { ready: "Ready", waiting: "In progress", failed: "Failed", none: "No audio" } as const;
  return (
    <div>
      <Badge variant={audio.state === "failed" ? "destructive" : "outline"}>{names[audio.state]}</Badge>
      {audio.total ? <p className="mt-1 text-xs text-muted-foreground">{audio.ready}/{audio.total} segments</p> : null}
      {audio.questionReady && audio.state !== "ready" ? <p className="mt-1 text-xs font-semibold">Question audio ready</p> : null}
    </div>
  );
}

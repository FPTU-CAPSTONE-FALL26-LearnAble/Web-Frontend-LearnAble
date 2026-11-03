/* eslint-disable jsx-a11y/label-has-associated-control -- Radix checkbox rows and score controls are explicitly named. */
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CheckCheck, CircleAlert, FileQuestion, RotateCcw, Search, Sigma } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getQuestions, getTopics } from "@/api/catalog";
import { getAvailableExamQuestions, setExamPaperQuestions } from "@/api/exams";
import { useExamPreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";
import { formatQuestionId } from "@/shared/strings/questionId";

const steps = ["Exam configuration", "Build paper", "Preview & publish", "Schedule exam"];

function eligibilityReasons(
  question: { examTypeId: string; reasons: string[] },
  examTypeId: string,
) {
  const reasons = question.reasons.map((reason) => {
    const normalized = reason.toLowerCase();
    if (normalized.includes("every option") && normalized.includes("audio")) {
      return "Every option needs audio";
    }
    if (normalized.includes("question") && normalized.includes("audio")) {
      return "Question needs audio";
    }
    return reason.replace(/\.$/, "");
  });

  if (question.examTypeId !== examTypeId) {
    reasons.push("Question does not match the exam type");
  }

  return [...new Set(reasons)];
}

export function QuestionSelectionRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useExamPreparationDraft();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const available = useQuery({
    queryKey: ["exam-paper", draft.examPaperId, "available-questions"],
    queryFn: () =>
      getAvailableExamQuestions(draft.examPaperId, { EligibleOnly: false }),
    enabled: Boolean(draft.examPaperId),
  });
  const subjectTopics = useQuery({
    queryKey: ["exam-paper", draft.subjectId, "topics"],
    queryFn: () => getTopics({ SubjectId: draft.subjectId }),
    enabled: Boolean(draft.subjectId),
  });
  const activeQuestions = useQuery({
    queryKey: ["exam-paper", draft.subjectId, "active-questions"],
    queryFn: () => getQuestions({ Status: "Active", PageNumber: 1, PageSize: 100 }),
    enabled: Boolean(draft.subjectId),
  });
  const selected = new Map(draft.selectedQuestions.map((item) => [item.questionId, item.maxScore]));
  const allRows = useMemo(() => {
    const exactMatches = available.data?.items ?? [];
    const exactIds = new Set(exactMatches.map((item) => item.questionId));
    const topicIds = new Set((subjectTopics.data?.items ?? []).map((topic) => topic.topicId));
    const wrongExamType = (activeQuestions.data?.items ?? [])
      .filter(
        (question) =>
          question.topicId &&
          topicIds.has(question.topicId) &&
          question.examTypeId !== draft.examTypeId &&
          !exactIds.has(question.questionId),
      )
      .map((question) => ({
        questionId: question.questionId,
        content: question.content,
        questionType: question.questionType,
        difficulty: question.difficulty,
        defaultScore: question.defaultScore,
        eligible: false,
        reasons: ["Question does not match the exam type"],
        examTypeId: question.examTypeId,
      }));
    return [...exactMatches, ...wrongExamType];
  }, [activeQuestions.data, available.data, draft.examTypeId, subjectTopics.data]);
  const questionTypes = useMemo(
    () => [...new Set(allRows.map((item) => item.questionType).filter(Boolean))].sort(),
    [allRows],
  );
  const difficulties = useMemo(
    () => [...new Set(allRows.map((item) => item.difficulty).filter(Boolean))].sort(),
    [allRows],
  );
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows.filter((item) => {
      const eligible = item.eligible && eligibilityReasons(item, draft.examTypeId).length === 0;
      return (
        (!query || item.content?.toLowerCase().includes(query) || item.questionId.toLowerCase().includes(query)) &&
        (typeFilter === "all" || item.questionType === typeFilter) &&
        (difficultyFilter === "all" || item.difficulty === difficultyFilter) &&
        (readinessFilter === "all" || (readinessFilter === "eligible" ? eligible : !eligible))
      );
    });
  }, [allRows, difficultyFilter, draft.examTypeId, readinessFilter, search, typeFilter]);
  const eligibleRows = rows.filter(
    (item) => item.eligible && eligibilityReasons(item, draft.examTypeId).length === 0,
  );
  const eligibleCount = eligibleRows.length;
  const allVisibleEligibleSelected = eligibleRows.length > 0 && eligibleRows.every((item) => selected.has(item.questionId));
  const filtersActive = Boolean(search.trim()) || typeFilter !== "all" || difficultyFilter !== "all" || readinessFilter !== "all";
  const toggleAllEligible = () => {
    setDraft((current) => {
      const visibleIds = new Set(eligibleRows.map((item) => item.questionId));
      if (allVisibleEligibleSelected) {
        return { ...current, selectedQuestions: current.selectedQuestions.filter((item) => !visibleIds.has(item.questionId)) };
      }
      const existingIds = new Set(current.selectedQuestions.map((item) => item.questionId));
      return {
        ...current,
        selectedQuestions: [
          ...current.selectedQuestions,
          ...eligibleRows
            .filter((item) => !existingIds.has(item.questionId))
            .map((item) => ({ questionId: item.questionId, maxScore: item.defaultScore })),
        ],
      };
    });
  };
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setDifficultyFilter("all");
    setReadinessFilter("all");
  };
  const totalScore = draft.selectedQuestions.reduce((sum, item) => sum + item.maxScore, 0);
  const save = useMutation({
    mutationFn: () => setExamPaperQuestions(draft.examPaperId, draft.selectedQuestions, draft.paperETag),
    onSuccess: (paper) => {
      setDraft((current) => ({ ...current, paperETag: paper.eTag ?? current.paperETag }));
      toast({ title: "Question set saved", description: `${paper.questions.length} questions · ${paper.totalScore} total points.` });
      navigate("/examiner/exams/new/operations");
    },
  });
  if (!draft.examPaperId) return <ApiNotice tone="error">Create an exam configuration and draft paper before selecting questions. <Link className="font-semibold underline" to="/examiner/exams/new/setup">Return to setup</Link>.</ApiNotice>;
  return <main className="space-y-6">
    <PreparationHeader title="Build the exam paper" description="Review all questions for this paper. Eligible questions can be selected; blocked questions show what must be fixed." />
    <PreparationSteps steps={steps} current={1} />
    {available.error || subjectTopics.error || activeQuestions.error || save.error ? <ApiNotice tone="error">The question bank or paper update could not be completed. Refresh the question list and try again.</ApiNotice> : null}
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="examiner-major overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by content or question ID" aria-label="Search questions" />
            </div>
            <Button type="button" variant="outline" onClick={toggleAllEligible} disabled={!eligibleRows.length}>
              <CheckCheck className="size-4" aria-hidden />
              {allVisibleEligibleSelected ? "Clear visible selection" : "Select all eligible"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto] xl:items-center">
            <Select value={readinessFilter} onValueChange={setReadinessFilter}>
              <SelectTrigger aria-label="Filter by readiness"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All readiness</SelectItem><SelectItem value="eligible">Eligible only</SelectItem><SelectItem value="blocked">Needs attention</SelectItem></SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger aria-label="Filter by question type"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All question types</SelectItem>{questionTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger aria-label="Filter by difficulty"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All difficulties</SelectItem>{difficulties.map((difficulty) => <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>)}</SelectContent>
            </Select>
            <Badge variant="outline" className="h-11 justify-center whitespace-nowrap px-3" aria-live="polite">{rows.length} shown · {eligibleCount} eligible</Badge>
            <Button type="button" variant="ghost" onClick={resetFilters} disabled={!filtersActive}>
              <RotateCcw className="size-4" aria-hidden />Reset
            </Button>
          </div>
        </div>
        {available.isPending ? <p role="status" className="p-6">Checking question eligibility…</p> : null}
        {!available.isPending && rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">No questions are available for this paper.</p>
            <p className="mt-2 text-sm text-muted-foreground">Check that questions belong to this subject and exam type.</p>
          </div>
        ) : null}
        <div className="divide-y divide-border">{rows.map((question) => {
          const checked = selected.has(question.questionId);
          const reasons = eligibilityReasons(question, draft.examTypeId);
          const eligible = question.eligible && reasons.length === 0;
          return <article key={question.questionId} className="grid gap-4 p-5 md:grid-cols-[auto_1fr_120px] md:items-start">
            <Checkbox aria-label={`Select question ${question.questionId}`} disabled={!eligible} checked={eligible && checked} onCheckedChange={() => setDraft((current) => ({ ...current, selectedQuestions: checked ? current.selectedQuestions.filter((item) => item.questionId !== question.questionId) : [...current.selectedQuestions, { questionId: question.questionId, maxScore: question.defaultScore }] }))} />
            <div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant="outline">{question.questionType}</Badge><Badge variant="outline">{question.difficulty}</Badge>{eligible ? <Badge variant="secondary">Eligible</Badge> : <Badge variant="destructive">Needs attention</Badge>}</div><h2 className="mt-3 font-semibold leading-relaxed">{question.content ?? "Question content unavailable"}</h2>{reasons.length ? <ul className="mt-3 space-y-1" aria-label="Question eligibility issues">{reasons.map((reason) => <li key={reason} className="flex items-start gap-2 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{reason}</span></li>)}</ul> : null}<p className="mt-2 text-xs text-muted-foreground" title={question.questionId} aria-label={`Question ID ${question.questionId}`}>{formatQuestionId(question.questionId)}</p></div>
            <label className="grid gap-2 text-sm font-semibold">Max score<Input type="number" min={0.25} step="0.25" disabled={!eligible || !checked} value={checked ? selected.get(question.questionId) : question.defaultScore} onChange={(event) => setDraft((current) => ({ ...current, selectedQuestions: current.selectedQuestions.map((item) => item.questionId === question.questionId ? { ...item, maxScore: Number(event.target.value) } : item) }))} /></label>
          </article>;
        })}</div>
      </section>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start" aria-label="Paper summary">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-bold text-foreground">Paper summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review the current paper before saving.</p>
          </header>
          <dl className="divide-y divide-border px-5">
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="flex min-w-0 items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileQuestion className="size-5" aria-hidden />
                </span>
                Selected questions
              </dt>
              <dd className="text-2xl font-extrabold tabular-nums text-foreground">{draft.selectedQuestions.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="flex min-w-0 items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sigma className="size-5" aria-hidden />
                </span>
                Total score
              </dt>
              <dd className="text-2xl font-extrabold tabular-nums text-foreground">{totalScore}</dd>
            </div>
          </dl>
          <div className="border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
            {eligibleCount} eligible question{eligibleCount === 1 ? "" : "s"} available
          </div>
        </section>
        <ApiNotice><span className="flex gap-2"><Check className="size-5 shrink-0 text-success-foreground" /> Ineligible questions remain visible with the exact issue to resolve.</span></ApiNotice>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="w-full" asChild><Link to="/examiner/exams/new/setup"><ArrowLeft />Back</Link></Button><Button className="w-full" disabled={!draft.selectedQuestions.length || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save paper"}<ArrowRight /></Button></div>
        {!draft.selectedQuestions.length ? <p className="text-center text-xs text-muted-foreground">Select at least one eligible question to continue.</p> : null}
      </aside>
    </div>
  </main>;
}

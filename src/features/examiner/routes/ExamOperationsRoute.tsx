import { useMemo } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FileCheck2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ApiFailure } from "@/api/client";
import { getExamPaperPreview, getExamSubject, publishExamPaper } from "@/api/exams";
import { getQuestion, type CatalogQuestion } from "@/api/lecturer";
import type { ExamPaperPreview } from "@/api/exams";
import { describeError } from "@/app/providers";
import { operation } from "@/features/examiner/workflow/operationProgress";
import { PREPARATION_STEPS as steps, usePreparationPaths } from "@/features/examiner/workflow/preparationPaths";
import { useExamPreparationDraft, useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { PaperPreview } from "@/features/examiner/components/PaperPreview";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";


/** Says what went wrong in words, so a format problem is not mistaken for an incomplete paper. */
function failureText(error: unknown, action: "previewed" | "published") {
  if (error instanceof ApiFailure && error.detail.kind === "parse") {
    return `The paper could not be ${action}: the Backend answered in a format this page cannot read. Report this to the Backend team.`;
  }
  const reason = describeError(error);
  return `The paper could not be ${action}. ${reason}`;
}

/** Older draft previews can omit their frozen snapshot; recover it from the paper's selected question IDs. */
export function enrichPaperPreview(preview: ExamPaperPreview, sources: Array<CatalogQuestion | undefined>): ExamPaperPreview {
  const sourceById = new Map(sources.filter((item): item is CatalogQuestion => Boolean(item)).map((item) => [item.questionId, item]));
  return {
    ...preview,
    questions: preview.questions.map((question, index) => {
      const source = sourceById.get(question.questionId) ?? sources[index];
      if (!source) return question;
      const sourceOptions = [...source.options].sort((a, b) => a.displayOrder - b.displayOrder);
      const optionById = new Map(sourceOptions.map((option) => [option.optionId, option]));
      const options = question.options.length
        ? question.options.map((option, optionIndex) => {
          const fallback = optionById.get(option.optionId) ?? sourceOptions[optionIndex];
          return { ...option, optionId: fallback?.optionId ?? option.optionId, content: option.content ?? fallback?.content ?? null, isCorrect: option.isCorrect || fallback?.isCorrect === true };
        })
        : sourceOptions.map((option, optionIndex) => ({ optionId: option.optionId, label: String.fromCharCode(65 + optionIndex), content: option.content, isCorrect: option.isCorrect, audioUrl: null }));
      return {
        ...question,
        questionId: source.questionId,
        content: question.content ?? source.content,
        questionType: question.questionType ?? source.questionType,
        difficulty: question.difficulty ?? source.difficulty,
        referenceAnswer: question.referenceAnswer ?? source.referenceAnswer ?? null,
        gradingCriteria: question.gradingCriteria ?? source.gradingCriteria ?? null,
        options,
      };
    }),
  };
}

export function ExamOperationsRoute() {
  const navigate = useNavigate();
  const paths = usePreparationPaths();
  const { draft, setDraft } = useExamPreparationDraft();
  const schedule = useSchedulePreparationDraft();
  // A stable order lets a missing legacy snapshot be matched to the selected question list safely.
  const preview = useQuery({ queryKey: ["exam-paper", draft.examPaperId, "preview"], queryFn: () => getExamPaperPreview(draft.examPaperId, false), enabled: Boolean(draft.examPaperId) });
  const questionDetails = useQueries({
    queries: draft.selectedQuestions.map((item) => ({
      queryKey: ["question", item.questionId],
      queryFn: () => getQuestion(item.questionId),
      retry: false,
      meta: { silent: true },
    })),
  });
  const hydratedPreview = useMemo(
    () => preview.data ? enrichPaperPreview(preview.data, questionDetails.map((item) => item.data)) : undefined,
    [preview.data, questionDetails],
  );
  const exam = useQuery({ queryKey: ["exam-subject", draft.examSubjectId], queryFn: () => getExamSubject(draft.examSubjectId), enabled: Boolean(draft.examSubjectId) });
  // An exam written by a lecturer is sealed straight from the draft; publishing first would make the Backend refuse the seal.
  const sealsDirectly = exam.data?.requiresSealing === true;
  const publish = useMutation({
    mutationFn: () => {
      operation.start("Publishing the paper", ["Publishing the paper"]);
      return publishExamPaper(draft.examPaperId, draft.paperETag);
    },
    onError: (error) => operation.fail(failureText(error, "published")),
    onSuccess: (paper) => {
      operation.finish("The paper is published and ready to schedule.");
      setDraft((current) => ({ ...current, paperETag: paper.eTag ?? current.paperETag }));
      schedule.setDraft((current) => ({ ...current, examSubjectId: draft.examSubjectId }));
      toast({ title: "Exam paper published", description: "Next, check the audio and seal the paper into a package." });
      navigate(paths.sealPaper(draft.examPaperId));
    },
  });
  if (!draft.examPaperId) return <ApiNotice tone="error">No exam paper is selected. <Link className="font-semibold underline" to={paths.setup}>Create a paper first</Link>.</ApiNotice>;
  return <main className="space-y-6">
    <PreparationHeader title="Preview the paper" description="Review the final paper snapshot. After publishing, check the audio and seal the paper into a locked package for the examiners." />
    <PreparationSteps steps={steps} current={2} />
    {preview.error ? <ApiNotice tone="error">{failureText(preview.error, "previewed")}</ApiNotice> : null}
    {questionDetails.some((item) => item.isError) ? <ApiNotice tone="error">Some question details could not be loaded. Refresh before publishing so the paper can be reviewed completely.</ApiNotice> : null}
    {publish.error ? <ApiNotice tone="error">{failureText(publish.error, "published")} It may be incomplete, invalid, or changed by another user.</ApiNotice> : null}
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {preview.isPending || questionDetails.some((item) => item.isPending) ? <div role="status" aria-label="Generating the preview" className="examiner-major animate-pulse space-y-4 p-6"><div className="h-8 w-1/2 rounded-lg bg-muted" /><div className="h-24 rounded-xl bg-muted" /><div className="h-40 rounded-xl bg-muted" /></div> : null}
      {hydratedPreview && !questionDetails.some((item) => item.isPending) ? <PaperPreview preview={hydratedPreview} paperName={draft.paperName} paperCode={draft.paperCode} /> : null}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start"><section className="examiner-panel overflow-hidden"><header className="flex items-center gap-3 border-b border-border p-5"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileCheck2 className="size-5" aria-hidden /></span><h2 className="text-xl font-semibold">{sealsDirectly ? "Seal the paper" : "Publish the paper"}</h2></header><p className="p-5 text-sm leading-6 text-muted-foreground">{sealsDirectly ? "Review content, scoring and question order, then check the audio and seal the paper. Sealing publishes it as a locked package; do not publish it first." : "Publish only after content, scoring and question order have been reviewed."}</p></section><div className="flex gap-2"><Button variant="outline" className="flex-1" asChild><Link to={paths.questions}><ArrowLeft />Back</Link></Button>{sealsDirectly
          ? <Button className="flex-1" disabled={!hydratedPreview || questionDetails.some((item) => item.isPending || item.isError)} onClick={() => navigate(paths.sealPaper(draft.examPaperId))}>Continue to seal<ArrowRight /></Button>
          : <Button className="flex-1" disabled={!hydratedPreview || questionDetails.some((item) => item.isPending || item.isError) || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish paper"}<ArrowRight /></Button>}</div></aside>
    </div>
  </main>;
}

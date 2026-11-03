import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { getExamPaperPreview, publishExamPaper } from "@/api/exams";
import { useExamPreparationDraft, useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

const steps = ["Exam configuration", "Build paper", "Preview & publish", "Schedule exam"];

export function ExamOperationsRoute() {
  const navigate = useNavigate();
  const { draft, setDraft } = useExamPreparationDraft();
  const schedule = useSchedulePreparationDraft();
  const preview = useQuery({ queryKey: ["exam-paper", draft.examPaperId, "preview"], queryFn: () => getExamPaperPreview(draft.examPaperId), enabled: Boolean(draft.examPaperId) });
  const publish = useMutation({
    mutationFn: () => publishExamPaper(draft.examPaperId, draft.paperETag),
    onSuccess: (paper) => {
      setDraft((current) => ({ ...current, paperETag: paper.eTag ?? current.paperETag }));
      schedule.setDraft((current) => ({ ...current, examSubjectId: draft.examSubjectId }));
      toast({ title: "Exam paper published", description: "The paper is now eligible for schedule readiness validation." });
      navigate("/examiner/schedule/new/details");
    },
  });
  if (!draft.examPaperId) return <ApiNotice tone="error">No exam paper is selected. <Link className="font-semibold underline" to="/examiner/exams/new/setup">Create a paper first</Link>.</ApiNotice>;
  return <main className="space-y-6">
    <PreparationHeader title="Preview and publish the paper" description="Review the final paper snapshot. Publishing completes paper preparation; scheduling remains a separate workflow." />
    <PreparationSteps steps={steps} current={2} />
    {preview.error || publish.error ? <ApiNotice tone="error">The paper could not be previewed or published. It may be incomplete, invalid, or changed by another user.</ApiNotice> : null}
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="examiner-major overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="text-xl font-semibold">{draft.paperName || "Exam paper preview"}</h2><p className="mt-1 font-mono text-sm text-muted-foreground">{draft.paperCode}</p></div><Badge variant="outline">Final preview</Badge></header>
        {preview.isPending ? <p role="status" className="p-6">Generating shuffled preview…</p> : null}
        {preview.data ? <div className="p-5"><dl className="grid gap-4 border-b border-border pb-5 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Duration</dt><dd className="mt-1 font-semibold">{preview.data.durationMinutes} minutes</dd></div><div><dt className="text-sm text-muted-foreground">Total score</dt><dd className="mt-1 font-semibold">{preview.data.totalScore}</dd></div><div><dt className="text-sm text-muted-foreground">Version</dt><dd className="mt-1 font-semibold">{preview.data.version}</dd></div></dl><ol className="mt-6 space-y-5">{preview.data.questions.map((question, index) => <li key={question.questionId} className="rounded-xl border border-border p-5"><div className="flex items-start gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-semibold">{index + 1}</span><div><p className="font-semibold leading-relaxed">{question.content ?? "Question content unavailable"}</p><p className="mt-2 text-sm text-muted-foreground">{question.questionType} · {question.difficulty} · {question.maxScore ?? 0} points</p></div></div></li>)}</ol></div> : null}
      </section>
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start"><section className="examiner-panel p-5"><FileCheck2 className="size-6 text-primary" /><h2 className="mt-4 text-xl font-semibold">Publication boundary</h2><p className="mt-2 text-sm text-muted-foreground">Publish only after content, scoring and question order have been reviewed. The schedule is created afterward from this exam configuration.</p><ul className="mt-5 space-y-3 text-sm"><li className="flex gap-2"><CheckCircle2 className="size-5 text-success-foreground" /> Questions saved on Backend</li><li className="flex gap-2"><CheckCircle2 className="size-5 text-success-foreground" /> Preview generated on Backend</li></ul></section><div className="flex gap-2"><Button variant="outline" className="flex-1" asChild><Link to="/examiner/exams/new/questions"><ArrowLeft />Back</Link></Button><Button className="flex-1" disabled={!preview.data || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish paper"}<ArrowRight /></Button></div></aside>
    </div>
  </main>;
}

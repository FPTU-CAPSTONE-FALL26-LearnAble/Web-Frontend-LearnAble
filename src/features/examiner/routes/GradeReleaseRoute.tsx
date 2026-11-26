import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import {
  Calculator,
  CheckCircle2,
  Send,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import { ApiFailure } from "@/api/client";
import { GraderAssignmentPanel } from "@/features/examiner/components/GraderAssignmentPanel";
import { AssignedGraders } from "@/features/examiner/components/AssignedGraders";
import { GradingScheduleQueue } from "@/features/examiner/components/GradingScheduleQueue";
import {
  assignScheduleGrader,
  autoGradeExamSchedule,
  getAttemptGrading,
  getExamGradebook,
  getGraderCandidates,
  releaseExamResults,
  reviewAttemptResult,
} from "@/api/grading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

function message(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server")
    return (
      [error.detail.message, ...(error.detail.errors ?? [])]
        .filter(Boolean)
        .join(" ") || fallback
    );
  return fallback;
}

export function ResultReview({
  attemptId,
  onClose,
}: {
  attemptId: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ["examiner", "grading-detail", attemptId],
    queryFn: () => getAttemptGrading(attemptId),
  });
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");
  useEffect(() => {
    if (detail.data) {
      setReviewed(Boolean(detail.data.reviewedAt));
      setNote(detail.data.reviewNote ?? "");
    }
  }, [detail.data]);
  const save = useMutation({
    mutationFn: () =>
      reviewAttemptResult(attemptId, detail.data!.revision, {
        reviewed,
        note: note.trim() || null,
      }),
    onSuccess: async () => {
      toast({
        title: "Review saved",
        description: "The attempt review status has been updated.",
      });
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["examiner", "grading-detail", attemptId],
        }),
        client.invalidateQueries({ queryKey: ["examiner", "gradebook"] }),
      ]);
    },
    onError: (error) =>
      toast({
        title: "Review could not be saved",
        description: message(error, "Refresh the result and try again."),
      }),
  });
  if (detail.isPending)
    return (
      <p role="status" className="rounded-xl border border-border p-5">
        Loading result detail…
      </p>
    );
  if (detail.error || !detail.data)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive p-5 text-destructive"
      >
        {message(detail.error, "The result detail could not be loaded.")}
      </div>
    );
  const questions = detail.data.questions;
  const pending = questions.filter((question) => question.score == null).length;
  const shown = questions.filter((question) => questionFilter === "all" || questionFilter === "pending" && question.score == null || questionFilter === "graded" && question.score != null);
  return (
    <section aria-label="Attempt review" className="overflow-hidden rounded-xl border-2 border-border bg-card">
      <div className="space-y-5 border-b border-border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {detail.data.studentName} · Answer review
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {questions.length} questions · {questions.length - pending} scored · {pending} awaiting a score
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close review
        </Button>
      </div>
      <dl className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
        {[ ["Automatic score", detail.data.autoScore], ["Manual score", detail.data.manualScore], ["Total score", detail.data.totalScore] ].map(([label, value]) => <div key={String(label)}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-bold tabular-nums">{value ?? "Pending"}{label === "Total score" ? ` / ${detail.data.maxScore}` : ""}</dd></div>)}
      </dl>
      {pending > 0 ? <p role="status" className="rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground">{pending} question(s) still need a score. For Essay questions, assign a Lecturer to mark them and confirm completion before reviewing the final result.</p> : null}
      <div className="max-w-xs"><label htmlFor="review-question-filter" className="mb-2 block text-sm font-semibold">Show questions</label><Select value={questionFilter} onValueChange={setQuestionFilter}><SelectTrigger id="review-question-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All questions ({questions.length})</SelectItem><SelectItem value="pending">Awaiting score ({pending})</SelectItem><SelectItem value="graded">Scored ({questions.length - pending})</SelectItem></SelectContent></Select></div>
      </div>
      <div className="divide-y divide-border">
        {shown.map((question) => (
          <article
            key={question.attemptQuestionId}
            className="space-y-4 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">Question {question.position}</span><Badge variant="outline">{question.questionType === "Essay" ? "Essay" : question.questionType}</Badge><Badge variant={question.score == null ? "secondary" : "outline"}>{question.score == null ? "Awaiting score" : "Scored"}</Badge></div>
              <p className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold tabular-nums ${question.score == null ? "bg-warning text-warning-foreground" : "bg-secondary text-foreground"}`}>{question.score ?? "Pending"} / {question.maxScore}</p>
            </div>
            <h3 className="max-w-prose whitespace-pre-wrap break-words text-base font-semibold leading-relaxed">{question.content}</h3>
            {question.options.length ? <ul aria-label={`Answer options for question ${question.position}`} className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => { const selected = question.selectedOptionIds.includes(option.optionId); return <li key={option.optionId} className={`rounded-lg border p-3 text-sm ${option.isCorrect ? "border-success-border bg-success text-success-foreground" : "border-border"}`}><p className="whitespace-pre-wrap break-words">{option.content}</p><p className="mt-2 text-xs font-semibold">{selected ? "Student selected" : "Not selected"}{option.isCorrect ? " · Correct answer" : ""}</p></li>; })}</ul> : null}
            {question.answerText || question.questionType === "Essay" ? <div className="rounded-lg bg-muted/50 p-4"><p className="mb-2 text-sm font-semibold text-muted-foreground">Student answer</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{question.answerText || "No written answer submitted."}</p></div> : null}
            {question.referenceAnswer || question.gradingCriteria ? <details className="rounded-lg border border-border px-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Reference answer & marking guidance</summary><div className="space-y-3 pb-4 text-sm leading-relaxed">{question.referenceAnswer ? <p className="whitespace-pre-wrap">{question.referenceAnswer}</p> : null}{question.gradingCriteria ? <p className="whitespace-pre-wrap text-muted-foreground">{question.gradingCriteria}</p> : null}</div></details> : null}
            {question.feedback ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Feedback: {question.feedback}
              </p>
            ) : null}
          </article>
        ))}
        {!shown.length ? <p className="p-6 text-sm text-muted-foreground">No questions match this filter.</p> : null}
      </div>
      <div className="space-y-4 border-t-2 border-border bg-muted/20 p-5 sm:p-6">
      <h3 className="font-semibold">Examiner confirmation</h3>
      <p className="text-sm text-muted-foreground">Confirm your review after checking the scores. This records your review; publishing results is a separate step.</p>
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <label
          htmlFor="attempt-reviewed"
          className="flex min-h-11 items-center gap-3 text-sm font-semibold"
        >
          <Checkbox
            id="attempt-reviewed"
            checked={reviewed}
            onCheckedChange={(value) => setReviewed(value === true)}
          />
          Mark reviewed
        </label>
        <label
          htmlFor="attempt-review-note"
          className="space-y-2 text-sm font-semibold"
        >
          Review note
          <Textarea
            id="attempt-review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional examiner review note"
          />
        </label>
      </div>
      <Button disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save review"}
      </Button>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{save.error instanceof ApiFailure && save.error.serverMessage ? save.error.serverMessage : message(save.error, "Review could not be saved. Refresh the result and check that grading is complete.")}</p> : null}
      </div>
    </section>
  );
}

export function GradeReleaseRoute() {
  const { scheduleId = "" } = useParams();
  const navigate = useNavigate();
  const [lecturerId, setLecturerId] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [reviewAttemptId, setReviewAttemptId] = useState("");
  const client = useQueryClient();
  const gradebook = useQuery({
    queryKey: ["examiner", "gradebook", scheduleId],
    queryFn: () => getExamGradebook(scheduleId),
    enabled: Boolean(scheduleId),
  });
  const candidates = useQuery({
    queryKey: ["examiner", "grader-candidates", scheduleId],
    queryFn: () => getGraderCandidates(scheduleId),
    enabled: Boolean(scheduleId),
  });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({
        queryKey: ["examiner", "gradebook", scheduleId],
      }),
      client.invalidateQueries({
        queryKey: ["examiner", "gradebook-summary", scheduleId],
      }),
      client.invalidateQueries({ queryKey: ["examiner", "grading-assignments", scheduleId] }),
    ]);
  const autoGrade = useMutation({
    mutationFn: () =>
      autoGradeExamSchedule(scheduleId, gradebook.data!.revision),
    onSuccess: async (result) => {
      toast({
        title: "Automatic grading complete",
        description: `${result.graded} attempts graded; ${result.unchanged} unchanged.`,
      });
      await refresh();
    },
    onError: (error) =>
      toast({
        title: "Automatic grading could not finish",
        description: message(error, "Refresh the gradebook and try again."),
      }),
  });
  const assign = useMutation({
    mutationFn: () =>
      assignScheduleGrader(scheduleId, gradebook.data!.revision, {
        lecturerId,
        overwriteExisting,
      }),
    onSuccess: async (result) => {
      const changed = result.assignedCount + result.reassignedCount;
      toast({
        title: changed ? "Essay grader assigned" : "No assignments changed",
        description: result.eligibleAttempts === 0
          ? "There are no eligible Essay attempts in this schedule. Selecting a Lecturer does not create an assignment without an eligible attempt."
          : `${result.assignedCount} assigned, ${result.reassignedCount} reassigned, ${result.unchangedCount} unchanged.`,
      });
      await refresh();
    },
    onError: (error) =>
      toast({
        title: "Assignment could not be saved",
        description: message(error, "Refresh the gradebook and try again."),
      }),
  });
  const release = useMutation({
    mutationFn: () => releaseExamResults(scheduleId, gradebook.data!.revision),
    onSuccess: async (result) => {
      toast({
        title: "Results released",
        description: `${result.submittedResults} submitted results are now released.`,
      });
      await refresh();
    },
    onError: (error) =>
      toast({
        title: "Results could not be released",
        description: message(
          error,
          "Resolve the remaining blockers and try again.",
        ),
      }),
  });
  const data = gradebook.data;
  const metrics = data
    ? ([
        ["Registered", data.registered],
        ["Submitted", data.submitted],
        ["Need manual grading", data.needsManual],
        ["Unreviewed", data.unreviewed],
        ["Integrity reviews", data.pendingIntegrityReviews],
        ["Invalidated", data.invalidated],
      ] as const)
    : [];
  return (
    <main className="space-y-6">
      <header className="border-b border-border pb-5">
        {scheduleId ? <Link to="/examiner/results" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Back to grading queue</Link> : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">
          {scheduleId ? "Exam gradebook" : "Grade review & release"}
        </h1>
      </header>
      {!scheduleId ? <GradingScheduleQueue selectedId="" onSelect={(value) => navigate(`/examiner/results/${encodeURIComponent(value)}`)} /> : null}
      {!scheduleId ? null : gradebook.isPending ? (
        <p role="status" className="rounded-xl border border-border p-6">
          Loading gradebook…
        </p>
      ) : gradebook.error || !data ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive p-6 text-destructive"
        >
          <p className="font-bold">
            {message(gradebook.error, "The gradebook could not be loaded.")}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => gradebook.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 overflow-hidden rounded-xl border-2 border-border bg-muted/30 sm:grid-cols-3 xl:grid-cols-6">
            {metrics.map(([label, value]) => (
              <div key={label} className="px-4 py-3">
                <dt className="text-sm font-semibold text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {data.pendingIntegrityReviews > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-foreground/30 bg-warning/40 p-4">
              <p className="flex items-center gap-2 font-semibold text-warning-foreground">
                <ShieldAlert className="size-5" aria-hidden />
                Resolve {data.pendingIntegrityReviews} integrity review
                {data.pendingIntegrityReviews === 1 ? "" : "s"} before releasing
                results.
              </p>
              <Button variant="outline" asChild>
                <Link
                  to={`/examiner/reviews?scheduleId=${encodeURIComponent(scheduleId)}`}
                >
                  Open integrity reviews
                </Link>
              </Button>
            </div>
          ) : null}
          <div className="space-y-4">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-border px-5 py-4">
              <div><h2 className="flex items-center gap-2 font-semibold"><Calculator className="size-5 text-primary" aria-hidden />Automatic grading</h2><p className="mt-1 text-sm text-muted-foreground">Calculate objective-question scores for submitted attempts.</p></div>
                <Button
                  disabled={autoGrade.isPending}
                  onClick={() => autoGrade.mutate()}
                >
                  {autoGrade.isPending ? "Grading…" : "Run automatic grading"}
                </Button>
            </section>
            <section className="overflow-hidden rounded-xl border-2 border-border bg-card">
              <header className="border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 font-semibold">
                  <UserRoundCheck className="size-5 text-primary" aria-hidden />
                  Essay graders
                </h2></header>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                <div className="min-w-0 p-5">
                <AssignedGraders scheduleId={scheduleId} candidates={candidates.data?.items ?? []} />
                {assign.isSuccess ? <div role="status" className={`mt-4 rounded-lg border p-4 text-sm ${assign.data.assignedCount + assign.data.reassignedCount > 0 ? "border-success-border bg-success text-success-foreground" : "border-warning-border bg-warning text-warning-foreground"}`}><p className="font-semibold">{assign.data.assignedCount + assign.data.reassignedCount > 0 ? "Assignment saved" : "No assignments changed"}</p><p className="mt-1">{assign.data.eligibleAttempts} eligible · {assign.data.assignedCount} assigned · {assign.data.reassignedCount} reassigned · {assign.data.unchangedCount} unchanged</p>{assign.data.eligibleAttempts === 0 ? <p className="mt-2">No Essay attempts are eligible for assignment in this schedule. Check the selected exam and submitted answers.</p> : assign.data.assignedCount + assign.data.reassignedCount === 0 ? <p className="mt-2">Existing assignments were kept. Check the current grader before choosing Replace existing assignments.</p> : null}</div> : null}
                </div>
                <div className="min-w-0 space-y-4 border-t border-border bg-muted/30 p-5 lg:border-l lg:border-t-0"><h3 className="text-sm font-semibold">Assign a Lecturer</h3>
                <Select value={lecturerId} onValueChange={setLecturerId}>
                  <SelectTrigger className="w-full" aria-label="Essay grader" disabled={candidates.isPending || candidates.isError || !candidates.data?.items.length || assign.isPending}>
                    <SelectValue placeholder={candidates.isPending ? "Loading lecturers…" : "Choose a Lecturer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.data?.items.map((candidate) => (
                      <SelectItem
                        key={candidate.lecturerId}
                        value={candidate.lecturerId}
                      >
                        {candidate.fullName} · {candidate.userCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label
                  htmlFor="overwrite-grading-assignments"
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <Checkbox
                    id="overwrite-grading-assignments"
                    checked={overwriteExisting}
                    onCheckedChange={(value) =>
                      setOverwriteExisting(value === true)
                    }
                  />
                  Replace existing assignments
                </label>
                {candidates.isError ? <p role="alert" className="text-sm text-destructive">Lecturers could not be loaded. <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => void candidates.refetch()}>Try again</button></p> : candidates.isSuccess && !candidates.data.items.length ? <p className="text-sm text-muted-foreground">No eligible Lecturer is available for this schedule.</p> : null}
                <Button
                  className="w-full"
                  disabled={!lecturerId || assign.isPending || candidates.isPending || candidates.isError}
                  onClick={() => assign.mutate()}
                >
                  {assign.isPending
                    ? "Assigning…"
                    : overwriteExisting ? "Update assignments" : "Assign Lecturer"}
                </Button>
                {assign.isError ? <p role="alert" className="text-sm text-destructive">{assign.error instanceof ApiFailure ? assign.error.serverMessage ?? "Assignment could not be saved. Try again." : "Assignment could not be saved. Try again."}</p> : null}
                </div>
              </div>
            </section>
          </div>
          <GraderAssignmentPanel
            scheduleId={scheduleId}
            rows={data.results.items}
            candidates={candidates.data?.items ?? []}
            onChanged={refresh}
          />
          {!data.blockingReasons.length ? (
            <p className="flex items-center gap-2 rounded-xl border border-success-border p-4 font-semibold">
              <CheckCircle2
                className="size-5 text-success-foreground"
                aria-hidden
              />
              All submitted results are ready to release.
            </p>
          ) : null}
          <section className="overflow-hidden rounded-xl border-2 border-border">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 className="font-semibold">Student results</h2><Button variant="outline" onClick={() => void refresh()}>Refresh gradebook</Button></header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Attempt</th>
                    <th className="p-3">Participation</th>
                    <th className="p-3">Integrity</th>
                    <th className="p-3">Automatic</th>
                    <th className="p-3">Manual</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Grading</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.items.map((row) => (
                    <tr
                      key={row.enrollmentId}
                      className="border-t border-border"
                    >
                      <td className="p-3">
                        <p className="font-bold">{row.fullName}</p>
                        <p className="text-muted-foreground">{row.userCode}</p>
                      </td>
                      <td className="p-3">
                        {row.attemptStatus ?? "Not started"}
                      </td>
                      <td className="p-3">
                        {row.participationLabel ??
                          row.participationStatus ??
                          row.attendanceStatus ??
                          "Not available"}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {row.integrityStatus ?? "Clear"}
                        </Badge>
                      </td>
                      <td className="p-3">{row.autoScore ?? "—"}</td>
                      <td className="p-3">{row.manualScore ?? "—"}</td>
                      <td className="p-3 font-bold">
                        {row.totalScore ?? "—"}
                        {row.maxScore != null ? ` / ${row.maxScore}` : ""}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {row.gradingStatus ?? "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!row.attemptId}
                          onClick={() =>
                            setReviewAttemptId(row.attemptId ?? "")
                          }
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.results.items.length === 0 ? (
              <p className="p-10 text-center text-muted-foreground">
                No enrolled attempts are available for grading.
              </p>
            ) : null}
          </section>
          {reviewAttemptId ? (
            <ResultReview
              attemptId={reviewAttemptId}
              onClose={() => setReviewAttemptId("")}
            />
          ) : null}
          <div className="flex justify-end">
            <Button
              disabled={
                !data.canRelease ||
                release.isPending ||
                Boolean(data.releasedAt)
              }
              onClick={() => release.mutate()}
            >
              <Send aria-hidden />
              {data.releasedAt
                ? "Results released"
                : release.isPending
                  ? "Releasing…"
                  : "Release results"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

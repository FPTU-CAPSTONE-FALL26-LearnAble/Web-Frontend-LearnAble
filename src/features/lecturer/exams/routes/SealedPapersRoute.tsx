import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck } from "lucide-react";
import { useLocation } from "react-router";
import { getMySealedPapers, getSealedExamPapers, handoverSealedPaper, withdrawSealedPaper, type SealedPaper } from "@/api/exams";
import { describeError } from "@/app/providers";
import { SealedPackagePreview } from "@/features/lecturer/exams/components/SealedPackagePreview";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { toast } from "@/shared/ui/primitives/toast";

const when = (value: string) => new Date(value).toLocaleString();

/** Sealed packages. A lecturer hands them over or takes them back; an examiner only sees those handed over. */
export function SealedPapersRoute() {
  const lecturer = !useLocation().pathname.startsWith("/examiner");
  const queryClient = useQueryClient();
  const [withdrawing, setWithdrawing] = useState<SealedPaper | null>(null);
  const [previewing, setPreviewing] = useState<SealedPaper | null>(null);
  const key = lecturer ? ["lecturer", "sealed-papers"] : ["examiner", "sealed-papers"];
  const papers = useQuery({ queryKey: key, queryFn: lecturer ? getMySealedPapers : getSealedExamPapers });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const handover = useMutation({
    mutationFn: (paper: SealedPaper) => handoverSealedPaper(paper.paperId, paper.versionId, paper.eTag),
    onSuccess: async () => {
      toast({ title: "Package handed over", description: "The examiners can now attach it to an exam shift." });
      await refresh();
    },
    onError: (error) => toast({ title: "The package could not be handed over", description: describeError(error), variant: "error" }),
  });
  const withdraw = useMutation({
    mutationFn: (paper: SealedPaper) => withdrawSealedPaper(paper.paperId, paper.versionId, paper.eTag),
    onSuccess: async () => {
      setWithdrawing(null);
      toast({ title: "Package withdrawn", description: "The examiners can no longer attach it to a shift." });
      await refresh();
    },
    onError: (error) => {
      setWithdrawing(null);
      toast({ title: "The package could not be withdrawn", description: describeError(error), variant: "error" });
    },
  });
  const items = [...(papers.data ?? [])].sort((a, b) => b.sealedAt.localeCompare(a.sealedAt));
  return (
    <main className="space-y-6">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <PackageCheck className="size-7 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">{lecturer ? "Sealed packages" : "Packages from lecturers"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lecturer ? "Locked exam packages. Hand a package over so the examiners can use it." : "Locked packages that lecturers handed over. Attach one from the exam schedule."}
          </p>
        </div>
      </header>
      {papers.isPending ? (
        <div role="status" aria-label="Loading packages" className="space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : null}
      {papers.isError ? (
        <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">
          <p className="font-bold">The packages could not be loaded.</p>
          <p className="mt-1 text-sm">{describeError(papers.error)}</p>
          <Button className="mt-3" variant="outline" onClick={() => void papers.refetch()}>Retry</Button>
        </div>
      ) : null}
      {papers.isSuccess && items.length === 0 ? (
        <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">
          {lecturer ? "You have not sealed any paper yet. Seal a published paper from the exam papers page." : "No lecturer has handed over a package yet."}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((paper) => (
          <li key={paper.versionId}>
            <article aria-label={paper.name ?? "Sealed package"} className="grid gap-4 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={paper.publishedToPoolAt ? "default" : "outline"}>{paper.publishedToPoolAt ? "Handed over" : "Not handed over"}</Badge>
                  <Badge variant="outline">Version {paper.versionNumber}</Badge>
                </div>
                <h2 className="mt-2 text-lg font-bold">{paper.name ?? "Sealed package"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paper.questionCount} questions · {paper.totalScore} points · {paper.durationMinutes} minutes · pass at {paper.passScore}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sealed {when(paper.sealedAt)}{paper.publishedToPoolAt ? ` · handed over ${when(paper.publishedToPoolAt)}` : ""}
                </p>
              </div>
              {lecturer ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setPreviewing(paper)}>Preview</Button>
                  {paper.publishedToPoolAt ? (
                    <Button variant="outline" disabled={withdraw.isPending} onClick={() => setWithdrawing(paper)}>Withdraw</Button>
                  ) : (
                    <Button disabled={handover.isPending} onClick={() => handover.mutate(paper)}>
                      {handover.isPending && handover.variables?.versionId === paper.versionId ? "Handing over…" : "Hand over to examiners"}
                    </Button>
                  )}
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
      <SealedPackagePreview paper={previewing} onClose={() => setPreviewing(null)} />
      <AlertDialog open={Boolean(withdrawing)} onOpenChange={(open) => { if (!open && !withdraw.isPending) setWithdrawing(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this package?</AlertDialogTitle>
            <AlertDialogDescription>
              The examiners can no longer attach {withdrawing?.name ?? "this package"} to an exam shift. If a shift already uses it, the Backend decides whether the withdrawal is allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdraw.isPending}>Keep it handed over</AlertDialogCancel>
            <AlertDialogAction disabled={withdraw.isPending} onClick={(event) => { event.preventDefault(); if (withdrawing) withdraw.mutate(withdrawing); }}>
              {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

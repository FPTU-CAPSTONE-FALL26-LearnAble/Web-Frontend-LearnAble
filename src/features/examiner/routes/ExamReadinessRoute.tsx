import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getExamPaperBank } from "@/api/exams";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

export function ExamReadinessRoute() {
  const papers = useQuery({ queryKey: ["examiner", "paper-readiness"], queryFn: getExamPaperBank });
  if (papers.isPending) return <p role="status">Loading exam papers…</p>;
  if (papers.error) return <p role="alert" className="text-destructive">Unable to load exam papers from the Backend.</p>;
  return <div className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-extrabold tracking-tight">Exam paper readiness</h1><p className="mt-2 text-sm text-muted-foreground">Readiness reflects the status and question totals returned by LearnAble Backend.</p></header><section className="grid gap-4 md:grid-cols-2">{papers.data?.map((paper) => <Card key={paper.examPaperId} className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{paper.name ?? paper.paperCode ?? "Unnamed exam paper"}</CardTitle><Badge variant={paper.status === "Published" ? "default" : "outline"}>{paper.status}</Badge></div></CardHeader><CardContent><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Questions</dt><dd className="mt-1 font-bold">{paper.questions.length}</dd></div><div><dt className="text-muted-foreground">Total score</dt><dd className="mt-1 font-bold">{paper.totalScore}</dd></div><div><dt className="text-muted-foreground">Version</dt><dd className="mt-1 font-bold">{paper.version}</dd></div><div><dt className="text-muted-foreground">Subject status</dt><dd className="mt-1 font-bold">{paper.examSubject.status}</dd></div></dl></CardContent></Card>)}</section>{!papers.data?.length ? <p className="rounded-xl border border-border p-8 text-center text-muted-foreground">No exam paper was returned.</p> : null}<Button variant="outline" asChild><Link to="/examiner/exams">Back to exam papers</Link></Button></div>;
}

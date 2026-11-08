import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleDot, Download, FilePlus2, LayoutGrid, List, Trash2, Upload } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { archiveExamPaper, createExamPaperVersion, deleteExamPaper, getExamPaperBank, publishExamPaper, type ExamPaper } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/toast";
import { cn } from "@/lib/utils";
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

const showPendingAction = (action: "Import" | "Export") =>
  toast({
    title: `${action} is coming soon`,
    description:
      action === "Import"
        ? "Create an exam paper manually while file import is being prepared."
        : "You can continue reviewing papers here while file export is being prepared.",
  });

function ApiState({
  pending,
  error,
  empty,
  onRetry,
}: {
  pending: boolean;
  error: unknown;
  empty?: boolean;
  onRetry: () => void;
}) {
  if (pending)
    return (
      <p role="status" className="p-4 text-sm">
        Loading data…
      </p>
    );
  if (error) {
    return (
      <div
        role="alert"
        className="m-4 rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive"
      >
        <p className="font-bold">We couldn’t load the exam papers.</p>
        <p className="mt-1 text-sm">Check your connection and try again.</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (empty)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        No matching data is available.
      </p>
    );
  return null;
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <span className="sr-only">{eyebrow}</span> : null}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

const metricToneClasses: Record<string, string> = {
  green: "bg-success text-success-foreground",
  orange: "bg-primary text-primary-foreground",
  red: "bg-destructive/15 text-destructive",
  blue: "bg-secondary text-secondary-foreground",
};

function Metric({
  label,
  value,
  detail,
  tone = "blue",
  icon: Icon = CircleDot,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "orange" | "red";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="examiner-panel p-5">
      <div className="flex items-start justify-between">
        <p className="examiner-kicker">{label}</p>
        <span
          className={cn(
            "rounded-lg p-2",
            metricToneClasses[tone] ?? "bg-secondary text-secondary-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

const statusToneClasses: Record<string, { badge: string; dot: string }> = {
  success: {
    badge: "border-success-foreground/30 bg-success text-success-foreground",
    dot: "bg-success-foreground",
  },
  warning: {
    badge: "border-warning-foreground/30 bg-warning text-warning-foreground",
    dot: "bg-warning-foreground",
  },
  danger: {
    badge: "border-destructive/30 bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
  info: {
    badge: "border-secondary-foreground/30 bg-secondary text-secondary-foreground",
    dot: "bg-secondary-foreground",
  },
};

function Status({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const config = statusToneClasses[tone] ?? statusToneClasses.info;
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-extrabold",
        config.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {children}
    </span>
  );
}

export function ExamBankRoute() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [paperToDelete, setPaperToDelete] = useState<ExamPaper | null>(null);
  useRouteAnnouncer("Exam Paper Management", "Exam Paper Management");
  const bank = useQuery({
    queryKey: ["examiner", "exam-paper-bank"],
    queryFn: getExamPaperBank,
  });
  useExpiredSession(bank.error);
  const publish = useMutation({
    mutationFn: ({ id, eTag }: { id: string; eTag?: string | null }) => publishExamPaper(id, eTag),
    onSuccess: async () => {
      toast({ title: "Exam paper published", description: "The paper is ready to use in an exam schedule." });
      await bank.refetch();
    },
    onError: () => toast({ title: "Publication failed", description: "Review the paper readiness and try again." }),
  });
  const lifecycle = useMutation({
    mutationFn: ({ id, eTag, action }: { id: string; eTag?: string | null; action: "version" | "archive" | "delete" }) =>
      action === "version" ? createExamPaperVersion(id, eTag) : action === "archive" ? archiveExamPaper(id, eTag) : deleteExamPaper(id, eTag),
    onSuccess: async (_, variables) => {
      setPaperToDelete(null);
      toast({
        title: variables.action === "version" ? "New version created" : variables.action === "archive" ? "Exam paper archived" : "Draft paper deleted",
        description: variables.action === "version" ? "You can now update the new draft version." : variables.action === "archive" ? "The published paper has been moved out of active use." : "The unused draft and its frozen question snapshots were removed.",
      });
      await bank.refetch();
    },
    onError: (error) => toast({ title: "Paper could not be updated", description: error instanceof Error ? error.message : "Refresh the paper bank and try again." }),
  });
  const rows = (bank.data ?? []).filter(
    (paper) =>
      `${paper.paperCode ?? ""} ${paper.name ?? ""} ${paper.examSubject.name ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || paper.status === status),
  );
  return (
    <div>
      <PageHeading
        eyebrow="Exam Paper Management"
        title="Exam Paper Bank"
        description="Build, review, and prepare secure exam packages for upcoming sessions."
        actions={
          <>
            <Button variant="outline" onClick={() => showPendingAction("Import")}>
              <Upload />
              Import
            </Button>
            <Button variant="outline" onClick={() => showPendingAction("Export")}>
              <Download />
              Export
            </Button>
            <Button asChild>
              <Link to="/examiner/exams/new/setup">
                <FilePlus2 />
                Create exam paper
              </Link>
            </Button>
          </>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Valid exam packages"
          value={`${(bank.data ?? []).filter((paper) => paper.status === "Published").length}/${bank.data?.length ?? 0}`}
          detail="Published exam papers"
          tone="green"
        />
        <Metric
          label="Secure-browser ready"
          value={String((bank.data ?? []).reduce((total, paper) => total + paper.questions.length, 0))}
          detail="Questions assigned"
        />
        <Metric
          label="In review"
          value={String((bank.data ?? []).filter((paper) => paper.status === "Draft").length)}
          detail="Draft papers"
          tone="orange"
        />
        <Metric
          label="Encrypted"
          value={bank.isPending ? "…" : String(bank.data?.length ?? 0)}
          detail="Exam papers in this workspace"
        />
      </section>
      <section className="examiner-panel mt-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_auto]">
          <Label className="relative">
            <span className="sr-only">Search exam papers</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, subject, or title"
            />
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border p-1">
            <Button
              size="icon"
              variant={view === "grid" ? "default" : "ghost"}
              aria-label="Grid view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid />
            </Button>
            <Button
              size="icon"
              variant={view === "list" ? "default" : "ghost"}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List />
            </Button>
          </div>
        </div>
      </section>
      <ApiState pending={bank.isPending} error={bank.error} empty={!bank.isPending && rows.length === 0} onRetry={() => void bank.refetch()} />
      <section
        className={
          view === "grid"
            ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            : "mt-5 space-y-3"
        }
      >
        {rows.map((paper) => (
          <article key={paper.examPaperId} className="examiner-major flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="outline">{paper.examSubject.name ?? "Exam subject"}</Badge>
              <Status
                tone={
                  paper.status === "Published"
                    ? "success"
                    : paper.status === "Draft"
                      ? "warning"
                      : "info"
                }
              >
                {paper.status}
              </Status>
            </div>
            <p className="mt-3 font-mono text-xs font-bold text-muted-foreground">
              {paper.paperCode ?? paper.examPaperId.slice(0, 8)}
            </p>
            <h2 className="mt-2 text-lg font-extrabold">{paper.name ?? "Untitled exam paper"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Version {paper.version} · {paper.examSubject.status}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-secondary p-3 text-center text-secondary-foreground">
              <div>
                <p className="examiner-kicker">Questions</p>
                <strong>{paper.questions.length}</strong>
              </div>
              <div>
                <p className="examiner-kicker">Duration</p>
                <strong>{paper.examSubject.durationMinutes}m</strong>
              </div>
              <div>
                <p className="examiner-kicker">Versions</p>
                <strong>{paper.version}</strong>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              {paper.status === "Published" ? <Button className="flex-1" variant="outline" disabled={lifecycle.isPending} onClick={() => lifecycle.mutate({ id: paper.examPaperId, eTag: paper.eTag, action: "version" })}>New version</Button> : null}
              {paper.status === "Published" ? <Button className="flex-1" variant="outline" disabled={lifecycle.isPending} onClick={() => lifecycle.mutate({ id: paper.examPaperId, eTag: paper.eTag, action: "archive" })}>Archive</Button> : null}
              {paper.status === "Draft" ? <Button className="flex-1" variant="outline" disabled={lifecycle.isPending} onClick={() => setPaperToDelete(paper)}><Trash2 />Delete</Button> : null}
              {paper.status === "Draft" ? <Button className="flex-1" disabled={publish.isPending} onClick={() => publish.mutate({ id: paper.examPaperId, eTag: paper.eTag })}>Publish</Button> : paper.status === "Published" ? <Button className="flex-1" asChild><Link to="/examiner/schedule/new/details">Schedule</Link></Button> : null}
            </div>
          </article>
        ))}
      </section>
      <AlertDialog open={Boolean(paperToDelete)} onOpenChange={(open) => { if (!open && !lifecycle.isPending) setPaperToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {paperToDelete?.paperCode ?? "the draft"}, its selected questions, and frozen audio snapshots. Published papers must be archived instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lifecycle.isPending}>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!paperToDelete || lifecycle.isPending}
              onClick={() => { if (paperToDelete) lifecycle.mutate({ id: paperToDelete.examPaperId, eTag: paperToDelete.eTag, action: "delete" }); }}
            >
              {lifecycle.isPending ? "Deleting…" : "Delete draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { assertExcelImportFile } from "@/lib/excelImport";
import {
  downloadQuestionImportTemplate,
  importQuestions,
  queueMissingSubjectAudioGeneration,
  validateQuestionImport,
  type QuestionImportValidation,
} from "@/api/lecturer";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/primitives/dialog";
import { toast } from "@/shared/ui/primitives/toast";

function describeFailure(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server") {
    return [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ") || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QuestionImportDialog({
  subjectId,
  subjectCode,
  onImported,
}: {
  subjectId: string;
  subjectCode: string;
  onImported: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<QuestionImportValidation | null>(null);
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [error, setError] = useState("");
  const validFile = useMemo(() => Boolean(file && /\.xlsx$/i.test(file.name)), [file]);
  const issues = validation ? [...validation.errors, ...validation.warnings] : [];

  const reset = () => {
    setFile(null);
    setValidation(null);
    setWarningsAccepted(false);
    setError("");
  };
  const chooseFile = (next: File | null) => {
    setFile(next);
    setValidation(null);
    setWarningsAccepted(false);
    setError(next && !/\.xlsx$/i.test(next.name) ? "Choose an .xlsx workbook generated from the LearnAble template." : "");
  };
  const template = useMutation({
    mutationFn: () => downloadQuestionImportTemplate(subjectId),
    onSuccess: ({ blob, fileName }) => download(blob, fileName ?? "LearnAble-question-import-template.xlsx"),
    onError: (reason) => setError(describeFailure(reason, "The Excel template could not be downloaded. Try again.")),
  });
  const review = useMutation({
    mutationFn: () => { assertExcelImportFile(file!); return validateQuestionImport(subjectId, file!); },
    onSuccess: (result) => {
      setValidation(result);
      setWarningsAccepted(false);
      setError("");
    },
    onError: (reason) => setError(describeFailure(reason, "The workbook could not be validated. Check its format and try again.")),
  });
  const submit = useMutation({
    mutationFn: () => importQuestions(subjectId, file!, validation!, warningsAccepted),
    onSuccess: async (result) => {
      try {
        await queueMissingSubjectAudioGeneration(subjectId);
      } catch {
        toast({
          title: "Questions imported; audio was not queued",
          description: "Do not import the file again. Retry audio generation from the question bank.",
          variant: "error",
        });
      }
      await onImported();
      toast({
        title: "Question list imported",
        description: `${result.importedQuestions} draft questions and ${result.importedOptions} answer options were added to ${subjectCode || "this subject"}.`,
      });
      reset();
      setOpen(false);
    },
    onError: (reason) => setError(describeFailure(reason, "The questions could not be imported. Review the validation result and try again.")),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={!subjectId}>
          <FileSpreadsheet className="size-4" aria-hidden />Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import questions for this paper</DialogTitle>
          <DialogDescription>
            Validate a LearnAble workbook and add its questions to the {subjectCode || "selected"} question bank. Imported questions remain Draft until they pass readiness checks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error ? <div role="alert" className="flex gap-3 rounded-xl border border-destructive p-4 text-sm font-semibold text-destructive"><AlertCircle className="size-5 shrink-0" aria-hidden />{error}</div> : null}

          <section className="rounded-xl border border-border p-4" aria-labelledby="import-subject-heading">
            <p id="import-subject-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destination subject</p>
            <p className="mt-1 font-bold">{subjectCode || "Subject selected during exam setup"}</p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" disabled={template.isPending} onClick={() => template.mutate()}>
              <Download className="size-4" aria-hidden />{template.isPending ? "Downloading…" : "Download template"}
            </Button>
            <label htmlFor="paper-question-workbook" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
              <Upload className="size-4" aria-hidden />Choose XLSX file
              <input id="paper-question-workbook" className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Choose question workbook" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>

          <p className="text-sm text-muted-foreground">Use the downloaded .xlsx template. Keep its sheet names, column headings and column order; do not add columns. Validation lists any incorrect rows before import.</p>
          {file ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div className="min-w-0"><p className="truncate font-bold">{file.name}</p><p className="mt-1 text-sm text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p></div><Badge variant={validFile ? "default" : "destructive"}>{validFile ? "Ready to validate" : "Unsupported file"}</Badge></div> : null}

          <Button type="button" disabled={!validFile || review.isPending} onClick={() => review.mutate()}>
            {review.isPending ? "Validating workbook…" : "Validate workbook"}
          </Button>

          {validation ? (
            <section className="space-y-4 rounded-xl border border-border p-4" aria-labelledby="paper-import-result">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 id="paper-import-result" className="font-bold">Validation result</h3><p className="text-sm text-muted-foreground">{validation.validRows} of {validation.totalRows} rows are valid.</p></div>
                <Badge variant={validation.canImport ? "default" : "destructive"}>{validation.canImport ? "Ready to import" : `${validation.invalidRows} invalid rows`}</Badge>
              </div>
              {issues.length ? <ul className="max-h-48 divide-y divide-border overflow-auto rounded-lg border border-border">{issues.map((issue, index) => <li key={`${issue.code}-${issue.rowNumber}-${index}`} className="p-3 text-sm"><strong>{issue.rowNumber ? `Row ${issue.rowNumber}` : "Workbook"}{issue.column ? ` · ${issue.column}` : ""}</strong><span className="ml-2 text-muted-foreground">{issue.message}</span></li>)}</ul> : <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-5 text-success-foreground" aria-hidden />No validation issues found.</p>}
              {validation.requiresWarningAcknowledgement ? <div className="flex items-start gap-3 rounded-lg border border-warning-border p-4 text-sm"><Checkbox id="paper-import-warning-acknowledgement" checked={warningsAccepted} onCheckedChange={(value) => setWarningsAccepted(value === true)} /><label htmlFor="paper-import-warning-acknowledgement"><strong>I reviewed the warnings.</strong><br /><span className="text-muted-foreground">Import valid rows using the validated file fingerprint.</span></label></div> : null}
              <Button type="button" disabled={!validation.canImport || submit.isPending || (validation.requiresWarningAcknowledgement && !warningsAccepted)} onClick={() => submit.mutate()}>
                {submit.isPending ? "Importing questions…" : "Import draft questions"}
              </Button>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

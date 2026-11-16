import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { ApiFailure } from "@/api/client";
import { downloadQuestionImportTemplate, importQuestions, queueMissingSubjectAudioGeneration, validateQuestionImport, type QuestionImportValidation } from "@/api/lecturer";
import { AudioGenerationPanel, audioGenerationKey } from "@/features/lecturer/questions/components/AudioGenerationStatus";
import { useAcademicOptions } from "@/features/lecturer/shared/api/useLecturerData";
import { Breadcrumb, PageHeading } from "@/features/lecturer/shared/components/Workbench";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";

function failureMessage(error: unknown, fallback: string) {
  if (error instanceof ApiFailure && error.detail.kind === "server") return [error.detail.message, ...(error.detail.errors ?? [])].filter(Boolean).join(" ") || fallback;
  return fallback;
}
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
}

export function ImportQuestionsRoute() {
  const [params] = useSearchParams();
  const purpose = params.get("purpose") === "practice" ? "practice" : "exam";
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<QuestionImportValidation | null>(null);
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [error, setError] = useState("");
  const academic = useAcademicOptions();
  const queryClient = useQueryClient();
  const validFile = useMemo(() => Boolean(file && /\.xlsx$/i.test(file.name)), [file]);
  const template = useMutation({ mutationFn: () => downloadQuestionImportTemplate(subjectId), onSuccess: ({ blob, fileName }) => saveBlob(blob, fileName ?? "LearnAble-question-import-template.xlsx"), onError: (reason) => setError(failureMessage(reason, "The Excel template could not be downloaded. Try again.")) });
  const review = useMutation({ mutationFn: () => validateQuestionImport(subjectId, file!), onSuccess: (result) => { setValidation(result); setAcknowledgeWarnings(false); setError(""); }, onError: (reason) => setError(failureMessage(reason, "The workbook could not be validated. Check its format and try again.")) });
  const submit = useMutation({
    mutationFn: () => importQuestions(subjectId, file!, validation!, acknowledgeWarnings),
    onSuccess: async (result) => {
      toast({ title: "Questions imported", description: `${result.importedQuestions} draft questions and ${result.importedOptions} answer options were added.` });
      try {
        await queueMissingSubjectAudioGeneration(subjectId);
      } catch {
        toast({
          title: "Audio generation was not queued",
          description: "The questions were imported successfully, so do not import them again. Use the retry button in Audio generation.",
          variant: "error",
        });
      }
      await queryClient.invalidateQueries({ queryKey: audioGenerationKey });
      await queryClient.invalidateQueries({ queryKey: ["lecturer", "question-bank"] });
      setFile(null); setValidation(null); setAcknowledgeWarnings(false); setError("");
    },
    onError: (reason) => setError(failureMessage(reason, "The questions could not be imported. Review the validation result and try again.")),
  });
  const chooseFile = (next: File | null) => { setFile(next); setValidation(null); setAcknowledgeWarnings(false); setError(next && !/\.xlsx$/i.test(next.name) ? "Choose an .xlsx workbook generated from the LearnAble template." : ""); };
  const issues = validation ? [...validation.errors, ...validation.warnings] : [];
  return <div className="space-y-6">
    <Breadcrumb parent={purpose === "practice" ? "Practice Questions" : "Exam Questions"} path={`/lecturer/questions/${purpose}`} current="Import questions" currentClassName="text-primary" />
    <PageHeading title="Import questions" description="Validate a LearnAble Excel workbook before adding draft questions to the selected subject."><Button variant="outline" asChild><Link to={`/lecturer/questions/${purpose}`}>Back to question bank</Link></Button></PageHeading>
    {error ? <div role="alert" className="flex gap-3 rounded-xl border border-destructive p-4 text-destructive"><AlertCircle className="size-5 shrink-0" aria-hidden /><p className="font-semibold">{error}</p></div> : null}
    {subjectId ? <AudioGenerationPanel filters={{ subjectId }} /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Upload className="size-5" aria-hidden />Select an import file</CardTitle></CardHeader><CardContent className="space-y-5">
        <label className="block space-y-2 text-sm font-semibold">Subject<Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setValidation(null); }}><SelectTrigger><SelectValue placeholder="Select the subject for these questions" /></SelectTrigger><SelectContent>{academic.subjects.data?.items.map((subject) => <SelectItem key={subject.subjectId} value={subject.subjectId}>{subject.subjectCode} · {subject.subjectNameEn ?? "Unnamed subject"}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center transition-colors hover:bg-accent"><FileSpreadsheet className="size-12 text-primary" aria-hidden /><span className="mt-4 font-bold">Choose a LearnAble Excel workbook</span><span className="mt-2 text-sm text-muted-foreground">Accepted format: XLSX</span><Input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label>
        {file ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div className="min-w-0"><p className="truncate font-bold">{file.name}</p><p className="mt-1 text-sm text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p></div><Badge variant={validFile ? "default" : "destructive"}>{validFile ? "Ready to validate" : "Unsupported file"}</Badge></div> : null}
        <Button className="w-full" disabled={!subjectId || !validFile || review.isPending} onClick={() => review.mutate()}>{review.isPending ? "Validating…" : "Validate workbook"}</Button>
        {validation ? <section className="space-y-4 border-t border-border pt-5" aria-labelledby="validation-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="validation-heading" className="text-lg font-bold">Validation result</h2><p className="text-sm text-muted-foreground">{validation.validRows} of {validation.totalRows} rows are valid.</p></div><Badge variant={validation.canImport ? "default" : "destructive"}>{validation.canImport ? "Ready to import" : `${validation.invalidRows} invalid rows`}</Badge></div>
          {issues.length ? <div className="max-h-64 overflow-auto rounded-lg border border-border"><ul className="divide-y divide-border">{issues.map((issue, index) => <li key={`${issue.code}-${issue.rowNumber}-${index}`} className="p-3 text-sm"><span className="font-bold">{issue.rowNumber ? `Row ${issue.rowNumber}` : "Workbook"}{issue.column ? ` · ${issue.column}` : ""}</span><span className="ml-2 text-muted-foreground">{issue.message}</span></li>)}</ul></div> : <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-5 text-success-foreground" aria-hidden />No validation issues found.</p>}
          {validation.requiresWarningAcknowledgement ? <label className="flex items-start gap-3 rounded-lg border border-warning-border p-4 text-sm"><Checkbox checked={acknowledgeWarnings} onCheckedChange={(value) => setAcknowledgeWarnings(value === true)} /><span><strong>I reviewed the warnings.</strong><br /><span className="text-muted-foreground">Import the valid rows with the server validation fingerprint.</span></span></label> : null}
          <Button className="w-full" disabled={!validation.canImport || submit.isPending || (validation.requiresWarningAcknowledgement && !acknowledgeWarnings)} onClick={() => submit.mutate()}>{submit.isPending ? "Importing…" : "Import draft questions"}</Button></section> : null}
      </CardContent></Card>
      <aside className="space-y-5"><Card className="shadow-none"><CardHeader><CardTitle>Official template</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">The template contains the columns and values accepted by the current Backend import contract.</p><Button className="mt-5 w-full" variant="outline" disabled={!subjectId || template.isPending} onClick={() => template.mutate()}><Download aria-hidden />{template.isPending ? "Downloading…" : "Download XLSX template"}</Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Import rules</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-sm">{["Select the subject before downloading its template", "Keep one question per workbook row", "Validation never writes to the question bank", "Imported questions are Draft until they pass readiness checks", "After import, missing question and answer audio is queued automatically"].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden />{item}</li>)}</ul></CardContent></Card>
      </aside>
    </div>
  </div>;
}

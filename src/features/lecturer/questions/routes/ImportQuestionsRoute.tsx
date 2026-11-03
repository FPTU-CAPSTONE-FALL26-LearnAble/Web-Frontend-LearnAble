import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Badge } from "@/shared/ui/primitives/badge";
import { Breadcrumb, PageHeading } from "@/features/lecturer/shared/components/Workbench";

const templateColumns = [
  "content",
  "questionType",
  "difficulty",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctAnswers",
  "explanation",
] as const;

export function ImportQuestionsRoute() {
  const [params] = useSearchParams();
  const purpose = params.get("purpose") === "practice" ? "practice" : "exam";
  const [file, setFile] = useState<File | null>(null);
  const validFile = useMemo(
    () => Boolean(file && /\.(csv|xlsx?)$/i.test(file.name)),
    [file],
  );
  const downloadTemplate = () => {
    const example = [
      templateColumns.join(","),
      '"What is a software requirement?",SingleChoice,Medium,"A documented need","A programming language","A database","A test server",A,"A requirement describes a documented need."',
    ].join("\n");
    const url = URL.createObjectURL(new Blob([example], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${purpose}-question-import-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        parent={purpose === "practice" ? "Practice Questions" : "Exam Questions"}
        path={`/lecturer/questions/${purpose}`}
        current="Import questions"
        currentClassName="text-primary"
      />
      <PageHeading
        title="Import questions"
        description="Prepare a structured Excel or CSV file for the question bank."
      >
        <Button variant="outline" asChild>
          <Link to={`/lecturer/questions/${purpose}`}>Back to question bank</Link>
        </Button>
      </PageHeading>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Upload className="size-5" aria-hidden />
              Select an import file
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center transition-colors hover:bg-accent">
              <FileSpreadsheet className="size-12 text-primary" aria-hidden />
              <span className="mt-4 font-bold">Choose an Excel or CSV file</span>
              <span className="mt-2 text-sm text-muted-foreground">Accepted formats: CSV, XLS, XLSX</span>
              <Input
                className="sr-only"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                </div>
                <Badge variant={validFile ? "default" : "destructive"}>
                  {validFile ? "Ready to review" : "Unsupported file"}
                </Badge>
              </div>
            ) : null}
            <Button className="w-full" disabled title="File import will be enabled when processing is available.">
              Review import
            </Button>
            <p className="text-sm text-muted-foreground">
              Question import is being prepared. You can download the template and prepare the file now, or create questions manually.
            </p>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Import template</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">Use the template to keep question content, answer options, and correct answers in the expected order.</p>
              <Button className="mt-5 w-full" variant="outline" onClick={downloadTemplate}>
                <Download aria-hidden /> Download CSV template
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle>Before importing</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {["Use one question per row", "Provide at least two options", "Use A, B, C, D for correct answers", "Review formulas and special characters"].map((item) => (
                  <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden />{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

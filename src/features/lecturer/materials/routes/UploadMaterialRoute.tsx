import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CloudUpload,
  FileText,
  RefreshCw,
  Save,
  ScanText,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/primitives/alert";
import { ChoiceField, TextField } from "@/features/lecturer/questions/components/QuestionFields";
import { useAcademicOptions } from "@/features/lecturer/shared/api/useLecturerData";
import {
  Breadcrumb,
  notConnected,
  PageHeading,
  ReadState,
  unavailable,
} from "@/features/lecturer/shared/components/Workbench";
import { UnsavedChangesDialog } from "@/features/lecturer/shared/components/UnsavedChangesDialog";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { formatFileSize } from "./LearningMaterialsRoute";
import { createLearningMaterial } from "@/api/lecturer";
import { toast } from "@/shared/ui/primitives/toast";

export const supportedMaterialExtensions = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "mp3",
  "wav",
  "png",
  "jpg",
  "jpeg",
  "webp",
];
export function validateMaterialFile(file: File) {
  return supportedMaterialExtensions.includes(
    file.name.split(".").pop()?.toLowerCase() ?? "",
  )
    ? ""
    : "Choose a PDF, DOC, DOCX, text, image, or audio file.";
}
export function UploadMaterialRoute() {
  useRouteAnnouncer("Upload Learning Material", "Upload Learning Material");
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [language, setLanguage] = useState("English");
  const [objectives, setObjectives] = useState(["", "", ""]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const academic = useAcademicOptions(subjectId || undefined);
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return createLearningMaterial({
        topicId,
        title: title.trim(),
        description: [
          `Language: ${language}`,
          ...objectives.filter(Boolean).map((objective) => `Objective: ${objective}`),
        ].join("\n"),
        file,
      });
    },
    onSuccess: () => {
      toast({ title: "Material uploaded", description: "The learning material is now available in your library." });
      void navigate("/lecturer/materials");
    },
    onError: () => setError("We couldn’t upload this material. Check the file type and try again."),
  });
  const dirty =
    !!file ||
    !!title ||
    !!subjectId ||
    !!topicId ||
    objectives.some(Boolean) ||
    language !== "English";
  const choose = (next?: File) => {
    if (!next) return;
    const problem = validateMaterialFile(next);
    setError(problem);
    if (problem) return;
    setFile(next);
    if (!title)
      setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
  };
  const review = () => {
    if (!file || !title.trim() || !subjectId || !topicId) {
      setError(
        "Select a file, enter a title, and choose a course and topic before continuing.",
      );
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setError("");
    upload.mutate();
  };
  return (
    <div className="space-y-6">
      <Breadcrumb
        parent="Learning Materials"
        path="/lecturer/materials"
        current="Upload material"
        currentClassName="font-semibold text-primary"
      />
      <PageHeading
        title="Upload Learning Material"
        description="Prepare your lecture resource and its academic information."
      >
        <Button variant="outline" asChild>
          <Link to="/lecturer/materials">Back to list</Link>
        </Button>
      </PageHeading>
      {error && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert variant="destructive">
            <AlertTitle>Review your material</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold text-primary">
                Material information & file
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The selected file is uploaded only when you confirm below.
              </p>
            </CardHeader>
            <CardContent>
              <div
                role="presentation"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  choose(event.dataTransfer.files[0]);
                }}
                className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-secondary p-6 text-center"
              >
                <CloudUpload aria-hidden className="size-12 text-primary" />
                <Button onClick={() => input.current?.click()}>
                  <CloudUpload aria-hidden />
                  Choose a file from your computer
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or drag and drop a lecture resource here.
                </p>
                <p className="text-xs font-bold">
                  <span className="text-destructive">PDF</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-chart-4">DOCX</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-primary">IMAGE / AUDIO</span>
                </p>
                <Label htmlFor="material-file" className="sr-only">
                  Material file
                </Label>
                <Input
                  ref={input}
                  id="material-file"
                  type="file"
                  accept=".pdf,.docx,.pptx,.mp3,.mp4,.epub"
                  className="sr-only"
                  onChange={(event) => choose(event.target.files?.[0])}
                />
              </div>
            </CardContent>
          </Card>
          {file && (
            <section
              aria-label="Selected file"
              className="rounded-2xl border border-border p-5"
            >
              <div className="flex items-start gap-3">
                <FileText
                  aria-hidden
                  className="size-9 shrink-0 text-secondary"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-all font-bold">{file.name}</p>
                  <p
                    role="status"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    Selected locally · Not uploaded
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(undefined);
                    if (input.current) input.current.value = "";
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">File size</dt>
                  <dd className="mt-1 font-bold">
                    {formatFileSize(file.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Page count</dt>
                  <dd className="mt-1 text-sm font-bold">{unavailable}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Upload status
                  </dt>
                  <dd className="mt-1 font-bold">Not started</dd>
                </div>
              </dl>
            </section>
          )}
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold text-primary">
                Academic information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <TextField
                label="Material title (required)"
                value={title}
                onChange={setTitle}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <ChoiceField
                  label="Course (required)"
                  value={subjectId}
                  options={(academic.subjects.data?.items ?? []).map((s) => ({
                    value: s.subjectId,
                    label: `${s.subjectCode} · ${s.subjectNameEn ?? unavailable}`,
                  }))}
                  onChange={(value) => {
                    setSubjectId(value);
                    setTopicId("");
                  }}
                />
                <ChoiceField
                  label="Topic (required)"
                  value={topicId}
                  options={(academic.topics.data?.items ?? []).map((t) => ({
                    value: t.topicId,
                    label: t.topicName,
                  }))}
                  onChange={setTopicId}
                  disabled={!subjectId}
                />
              </div>
              <ReadState
                pending={
                  academic.subjects.isPending || academic.topics.isPending
                }
                error={academic.subjects.error || academic.topics.error}
                retry={() => {
                  void academic.subjects.refetch();
                  void academic.topics.refetch();
                }}
              />
              <ChoiceField
                label="Material language"
                value={language}
                options={["English", "Vietnamese", "Bilingual"]}
                onChange={setLanguage}
              />
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-bold">
                  Learning objectives
                </legend>
                {objectives.map((value, index) => (
                  <TextField
                    key={index}
                    label={`Learning objective ${index + 1}`}
                    value={value}
                    onChange={(next) =>
                      setObjectives((old) =>
                        old.map((item, position) =>
                          position === index ? next : item,
                        ),
                      )
                    }
                  />
                ))}
                <p className="text-xs text-muted-foreground">
                  Enter objectives manually. Table-of-contents extraction is not
                  connected.
                </p>
              </fieldset>
            </CardContent>
          </Card>
        </div>
        <aside aria-label="Material processing" className="min-w-0 space-y-5">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <CloudUpload aria-hidden className="size-5 text-primary" />
                Upload status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">{upload.isPending ? "Uploading…" : upload.isSuccess ? "Uploaded" : "Ready"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Processing begins after the material is uploaded.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScanText aria-hidden className="size-5 stroke-[2.5] text-primary" />
                OCR & text extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pages extracted, processing speed and dictionary checks:{" "}
                {unavailable.toLowerCase()}.
              </p>
              <Button
                variant="outline"
                onClick={() => notConnected("Retry OCR")}
              >
                <RefreshCw aria-hidden />
                Retry OCR
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
      <footer className="z-20 flex flex-wrap justify-end gap-3 border-t border-border bg-background py-4 xl:sticky xl:bottom-0">
        <Button
          variant="outline"
          onClick={() => notConnected("Save material draft")}
        >
          <Save aria-hidden />
          Save draft
        </Button>
        <Button disabled={upload.isPending} onClick={review}>
          {upload.isPending ? "Uploading…" : "Upload material"}
          <ArrowRight aria-hidden />
        </Button>
      </footer>
      <UnsavedChangesDialog dirty={dirty} />
    </div>
  );
}

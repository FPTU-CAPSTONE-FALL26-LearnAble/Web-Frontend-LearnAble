import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router";
import {
  Save,
  Sparkles,
  CircleDot,
  ListChecks,
  FileText,
  Terminal,
  Sigma,
  AudioLines,
  PencilLine,
  Bold,
  Italic,
  Underline,
  ImagePlus,
} from "lucide-react";
import "../components/lecturer-studio.css";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/primitives/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
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
import { ChoiceField, TextField } from "../questions/QuestionFields";
import { QuestionTypeForm } from "../questions/QuestionTypeForm";
import { QuestionPreview } from "../questions/QuestionPreview";
import {
  createDraft,
  draftKey,
  questionTypes,
  readDraft,
  validateDraft,
  type QuestionDraft,
  type QuestionType,
} from "../questions/model";
import { useAcademicOptions } from "../api/useLecturerData";
import { ReadState, ScrollRegion } from "../components/Workbench";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/toast";

export function CreateQuestionRoute() {
  const [searchParams] = useSearchParams();
  const purpose =
    searchParams.get("purpose") === "practice" ? "practice" : "exam";
  const purposeLabel =
    purpose === "exam" ? "Exam question" : "Practice question";
  const bankPath = `/lecturer/questions/${purpose}`;
  useRouteAnnouncer(`Create ${purpose} question`, `Create ${purpose} question`);
  const userId = useAuthStore((state) => state.user?.id) ?? "anonymous";
  const [draft, setDraft] = useState<QuestionDraft>(
    () => readDraft(userId, purpose) ?? createDraft(),
  );
  const academic = useAcademicOptions();
  const subjects = academic.subjects.data?.items ?? [];
  const courseOptions = subjects.map((subject) => ({
    value: subject.subjectCode,
    label: `${subject.subjectCode} · ${subject.subjectNameEn ?? "Not available"}`,
  }));
  const subjectId = subjects.find(
    (subject) => subject.subjectCode === draft.course,
  )?.subjectId;
  const topicOptions = [
    ...new Set(
      (academic.topics.data?.items ?? [])
        .filter((topic) => topic.subjectId === subjectId)
        .map((topic) => topic.topicName),
    ),
  ];
  const [saved, setSaved] = useState(() => JSON.stringify(draft));
  const [restored, setRestored] = useState(() => !!readDraft(userId, purpose));
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [files, setFiles] = useState({ image: "", audio: "" });
  const fileRefs = useRef(files);
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty =
    JSON.stringify(draft) !== saved || !!files.image || !!files.audio;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(
    () => () => {
      Object.values(fileRefs.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    },
    [],
  );
  const update = (value: QuestionDraft) => {
    setDraft(value);
    setErrors([]);
    setMessage("");
  };
  const onFile = (kind: "image" | "audio", file?: File) => {
    if (
      file &&
      (file.size > 10 * 1024 * 1024 ||
        (kind === "image"
          ? !["image/png", "image/jpeg", "image/webp"].includes(file.type)
          : !file.type.startsWith("audio/")))
    ) {
      setMessage("Choose a supported file smaller than 10 MB.");
      return;
    }
    if (fileRefs.current[kind]) URL.revokeObjectURL(fileRefs.current[kind]);
    const value = {
      ...fileRefs.current,
      [kind]: file ? URL.createObjectURL(file) : "",
    };
    fileRefs.current = value;
    setFiles(value);
  };
  const unavailable = (label: string) =>
    toast({
      title: "Feature not connected",
      description: `${label} is not connected yet. Your question has not been submitted.`,
    });
  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey(userId, purpose), JSON.stringify(draft));
      setSaved(JSON.stringify(draft));
      setMessage(
        "Draft saved on this browser only. Image and audio files are not saved.",
      );
    } catch {
      setMessage(
        "Unable to save this draft. Browser storage may be full or unavailable. Keep this page open and copy your content.",
      );
    }
  };
  const submit = () => {
    const problems = validateDraft(draft, !!files.image);
    setErrors(problems);
    if (problems.length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setMessage(
      "Question publishing is not connected to the backend yet. No question has been added. Save a local draft to keep your work.",
    );
  };
  return (
    <div className="question-studio">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-6 py-2">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <Link
            className="inline-flex min-h-11 items-center hover:underline"
            to="/lecturer/dashboard"
          >
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link
            className="inline-flex min-h-11 items-center hover:underline"
            to={bankPath}
          >
            {purpose === "exam" ? "Exam Questions" : "Practice Questions"}
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{purposeLabel}</span>
        </nav>
        <div className="w-full sm:w-64">
          <ChoiceField
            label="Course"
            visuallyHiddenLabel
            value={draft.course}
            options={courseOptions}
            placeholder="Select course"
            onChange={(course) => update({ ...draft, course, topic: "" })}
          />
        </div>
        <Button variant="outline" asChild>
          <Link to={bankPath}>Cancel</Link>
        </Button>
      </header>
      {restored && (
        <Alert>
          <AlertTitle>Local draft restored</AlertTitle>
          <AlertDescription>
            Your draft was restored from this browser. Select image and audio
            files again if needed.
          </AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert role="status">
          <AlertTitle>Question Studio</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {!!errors.length && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert variant="destructive">
            <AlertTitle>Review your question</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="studio-body">
        <Card
          tabIndex={0}
          role="region"
          aria-label="Question authoring canvas"
          className="studio-pane studio-editor gap-6 rounded-none py-6 shadow-none ring-0"
        >
          <CardHeader className="border-b border-[var(--color-border-subtle)] px-0 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                <PencilLine aria-hidden className="size-5 text-secondary" />
                New {purposeLabel} Studio
              </h1>
              <Button
                variant="ghost"
                className="text-xs text-secondary"
                onClick={() => unavailable("Bloom templates")}
              >
                <Sparkles aria-hidden />
                Bloom templates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-0">
            <div className="grid gap-3 rounded-xl border border-[var(--color-border-subtle)] p-4 sm:grid-cols-3">
              <ChoiceField
                label="Topic"
                value={draft.topic}
                options={topicOptions}
                disabled={!subjectId}
                onChange={(topic) => update({ ...draft, topic })}
              />
              <ChoiceField
                label="Bloom level"
                value={draft.bloom}
                options={[
                  "Remember",
                  "Understand",
                  "Apply",
                  "Analyze",
                  "Evaluate",
                  "Create",
                ]}
                onChange={(bloom) => update({ ...draft, bloom })}
              />
              <TextField
                label="Points"
                error={errors.find((error) => error.startsWith("Points"))}
                type="number"
                min="0.1"
                step="0.5"
                value={draft.points}
                onChange={(points) => update({ ...draft, points })}
              />
            </div>
            <ReadState
              pending={academic.subjects.isPending || academic.topics.isPending}
              error={academic.subjects.error || academic.topics.error}
              retry={() => {
                void academic.subjects.refetch();
                void academic.topics.refetch();
              }}
            />
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                Question type
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(questionTypes).map(([type, label]) => (
                  <Button
                    key={type}
                    variant="outline"
                    aria-pressed={draft.type === type}
                    className={`h-auto min-h-14 justify-start gap-2 whitespace-normal px-3 text-left text-xs ${draft.type === type ? "border-secondary text-secondary ring-1 ring-secondary" : ""}`}
                    onClick={() => {
                      if (draft.type !== type)
                        update(createDraft(type as QuestionType, draft));
                    }}
                  >
                    {(() => {
                      const Icon = {
                        single: CircleDot,
                        multiple: ListChecks,
                        essay: FileText,
                        code: Terminal,
                        math: Sigma,
                        diagram: AudioLines,
                      }[type as QuestionType];
                      return <Icon aria-hidden className="size-5 shrink-0" />;
                    })()}
                    {label}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Changing type resets its answer fields; question content is
                kept.
              </p>
            </fieldset>
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <PencilLine aria-hidden className="size-4 text-secondary" />
                  Question content
                </h2>
              </div>
              <div
                className="flex flex-wrap gap-1 rounded-t-xl border border-[var(--color-border-subtle)] p-1"
                role="toolbar"
                aria-label="Question content tools"
              >
                {[
                  { label: "Bold", icon: Bold },
                  { label: "Italic", icon: Italic },
                  { label: "Underline", icon: Underline },
                  { label: "Insert image", icon: ImagePlus },
                  { label: "Code block", icon: Terminal },
                  { label: "MathML", icon: Sigma },
                ].map(({ label, icon: Icon }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    onClick={() => unavailable(label)}
                  >
                    <Icon aria-hidden />
                  </Button>
                ))}
              </div>
              <TextField
                label="Question content (required)"
                error={errors.find((error) =>
                  error.startsWith("Question content"),
                )}
                multiline
                value={draft.content}
                onChange={(content) => update({ ...draft, content })}
              />
              <p className="text-right text-xs text-muted-foreground">
                {draft.content.length} characters
              </p>
            </div>
            <QuestionTypeForm draft={draft} onChange={update} onFile={onFile} />
            <div className="border-t border-[var(--color-border-subtle)] pt-4">
              <TextField
                label="Pedagogical explanation"
                multiline
                value={draft.rationale ?? ""}
                onChange={(rationale) => update({ ...draft, rationale })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                For student practice feedback, not the exam response.
              </p>
            </div>
          </CardContent>
        </Card>
        <ScrollRegion
          label="Live student review"
          className="studio-pane space-y-6"
        >
          <QuestionPreview key={draft.type} draft={draft} image={files.image} />
        </ScrollRegion>
      </div>
      <footer className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] bg-background px-6 py-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" asChild>
            <Link to={bankPath}>Cancel</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              try {
                localStorage.removeItem(draftKey(userId, purpose));
                setRestored(false);
                setMessage(
                  "Saved local draft deleted. Your open editor has not been cleared.",
                );
              } catch {
                setMessage(
                  "Unable to delete the local draft. Browser storage is unavailable.",
                );
              }
            }}
          >
            Delete saved draft
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveDraft}>
            <Save aria-hidden />
            Save draft
          </Button>
          <Button onClick={submit}>
            Save & Add to {purpose === "exam" ? "Exam" : "Practice"} Questions
          </Button>
        </div>
      </footer>
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes and session files will be lost. Save a local
              draft before leaving to keep text content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => blocker.state === "blocked" && blocker.reset()}
            >
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blocker.state === "blocked" && blocker.proceed()}
            >
              Leave page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

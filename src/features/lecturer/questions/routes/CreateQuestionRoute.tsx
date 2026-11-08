import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FileUp,
} from "lucide-react";
import "../components/lecturer-studio.css";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/primitives/alert";
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
import { ChoiceField, TextField } from "@/features/lecturer/questions/components/QuestionFields";
import { QuestionTypeForm } from "@/features/lecturer/questions/components/QuestionTypeForm";
import { QuestionPreview } from "@/features/lecturer/questions/components/QuestionPreview";
import {
  createDraft,
  draftKey,
  examTypesForPurpose,
  questionTypes,
  readDraft,
  validateDraft,
  type QuestionDraft,
  type QuestionType,
} from "@/features/lecturer/questions/model";
import { useAcademicOptions } from "@/features/lecturer/shared/api/useLecturerData";
import { ReadState, ScrollRegion } from "@/features/lecturer/shared/components/Workbench";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/toast";
import { createQuestionOption, createQuestionWithOptions, deleteQuestionOption, getQuestion, updateQuestion, updateQuestionOption, uploadQuestionAudio, uploadQuestionOptionAudio, type CreateQuestionInput } from "@/api/lecturer";
import { getExamTypes } from "@/api/exams";

export function CreateQuestionRoute() {
  const studioBodyRef = useRef<HTMLDivElement>(null);
  const [editorWidth, setEditorWidth] = useState(52);
  const [resizing, setResizing] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const purpose =
    searchParams.get("purpose") === "practice" ? "practice" : "exam";
  const editingId = searchParams.get("edit") ?? "";
  const purposeLabel =
    purpose === "exam" ? "Exam question" : "Practice question";
  const bankPath = `/lecturer/questions/${purpose}`;
  const navigate = useNavigate();
  useRouteAnnouncer(`${editingId ? "Edit" : "Create"} ${purpose} question`, `${editingId ? "Edit" : "Create"} ${purpose} question`);
  const userId = useAuthStore((state) => state.user?.id) ?? "anonymous";
  const [draft, setDraft] = useState<QuestionDraft>(
    () => editingId ? createDraft() : readDraft(userId, purpose) ?? createDraft(),
  );
  const editQuestion = useQuery({ queryKey: ["question", editingId], queryFn: () => getQuestion(editingId), enabled: Boolean(editingId) });
  const academic = useAcademicOptions();
  const examTypes = useQuery({
    queryKey: ["exam-types", "active"],
    queryFn: getExamTypes,
  });
  const purposeExamTypes = useMemo(
    () => examTypesForPurpose(examTypes.data ?? [], purpose),
    [examTypes.data, purpose],
  );
  const subjects = useMemo(() => academic.subjects.data?.items ?? [], [academic.subjects.data?.items]);
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
  const examTypeOptions = purposeExamTypes.map((examType) => ({
    value: examType.examTypeId,
    label: examType.code
      ? `${examType.code} · ${examType.name ?? "Unnamed exam type"}`
      : examType.name ?? "Unnamed exam type",
  }));
  useEffect(() => {
    if (!examTypes.isSuccess) return;
    setDraft((current) => {
      if (
        purposeExamTypes.some(
          (examType) => examType.examTypeId === current.examTypeId,
        )
      ) {
        return current;
      }
      return { ...current, examTypeId: purposeExamTypes[0]?.examTypeId ?? "" };
    });
  }, [examTypes.isSuccess, purposeExamTypes]);
  const selectedTopicId = (academic.topics.data?.items ?? []).find(
    (topic) => topic.subjectId === subjectId && topic.topicName === draft.topic,
  )?.topicId;
  const [saved, setSaved] = useState(() => JSON.stringify(draft));
  const [restored, setRestored] = useState(() => !!readDraft(userId, purpose));
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [files, setFiles] = useState({ image: "", audio: "" });
  const fileRefs = useRef(files);
  const selectedFiles = useRef<{ image?: File; audio?: File }>({});
  const selectedOptionAudio = useRef(new Map<number, File>());
  const [optionAudioNames, setOptionAudioNames] = useState<Record<number, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const loadedEditRef = useRef("");
  const dirty =
    JSON.stringify(draft) !== saved || !!files.image || !!files.audio || selectedOptionAudio.current.size > 0;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!editingId || !editQuestion.data || loadedEditRef.current === editingId) return;
    const topic = (academic.topics.data?.items ?? []).find((item) => item.topicId === editQuestion.data?.topicId);
    const subject = subjects.find((item) => item.subjectId === topic?.subjectId);
    if (!topic || !subject) return;
    const source = editQuestion.data;
    const common = {
      examTypeId: source.examTypeId,
      course: subject.subjectCode,
      topic: topic.topicName,
      bloom: "Understand",
      points: String(source.defaultScore),
      content: source.content,
    };
    const type: QuestionType = source.questionType === "Multiple" ? "multiple" : source.questionType === "Essay" ? "essay" : "single";
    const loaded = type === "essay"
      ? { ...createDraft("essay", common), instructions: source.referenceAnswer ?? "", rubric: source.gradingCriteria ?? "" }
      : { ...createDraft(type, common), options: source.options.map((option) => ({ text: option.content, description: "", correct: option.isCorrect })) };
    setDraft(loaded);
    setSaved(JSON.stringify(loaded));
    setRestored(false);
    loadedEditRef.current = editingId;
  }, [academic.topics.data?.items, editQuestion.data, editingId, subjects]);
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
  const resizeFromPointer = (clientX: number) => {
    const bounds = studioBodyRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const next = ((clientX - bounds.left) / bounds.width) * 100;
    setEditorWidth(Math.min(70, Math.max(35, next)));
  };
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
    resizeFromPointer(event.clientX);
  };
  const onFile = (kind: "image" | "audio", file?: File) => {
    if (
      file &&
      (file.size > 10 * 1024 * 1024 ||
        (kind === "image"
          ? !["image/png", "image/jpeg", "image/webp"].includes(file.type)
          : file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")))
    ) {
      setMessage("Choose a supported file smaller than 10 MB.");
      return;
    }
    if (fileRefs.current[kind]) URL.revokeObjectURL(fileRefs.current[kind]);
    selectedFiles.current[kind] = file;
    const value = {
      ...fileRefs.current,
      [kind]: file ? URL.createObjectURL(file) : "",
    };
    fileRefs.current = value;
    setFiles(value);
  };
  const onOptionAudio = (index: number, file?: File) => {
    if (file && (file.size > 10 * 1024 * 1024 || (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")))) {
      setMessage("Choose an MP3 file smaller than 10 MB.");
      return;
    }
    if (file) selectedOptionAudio.current.set(index, file);
    else selectedOptionAudio.current.delete(index);
    setOptionAudioNames((current) => {
      const next = { ...current };
      if (file) next[index] = file.name;
      else delete next[index];
      return next;
    });
  };
  const removeOptionAudio = (removedIndex: number) => {
    const nextFiles = new Map<number, File>();
    selectedOptionAudio.current.forEach((file, index) => {
      if (index < removedIndex) nextFiles.set(index, file);
      if (index > removedIndex) nextFiles.set(index - 1, file);
    });
    selectedOptionAudio.current = nextFiles;
    setOptionAudioNames(Object.fromEntries([...nextFiles].map(([index, file]) => [index, file.name])));
  };
  const unavailable = (label: string) =>
    toast({
      title: "Option not available",
      description: `${label} isn’t available yet. Your work is still here and has not been submitted.`,
    });
  const previewGeneratedAudio = (text: string, label: string) => {
    const spokenText = text.trim();
    if (!spokenText) {
      toast({
        title: `Add ${label.toLowerCase()} text first`,
        description: "Audio can be generated after this text field has content.",
      });
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast({
        title: "Voice preview is unavailable",
        description: "This browser does not provide a text-to-speech voice. You can still upload an MP3 file.",
      });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const language = /[ăâđêôơưĂÂĐÊÔƠƯ]/.test(spokenText) ? "vi-VN" : "en-US";
    utterance.lang = language;
    utterance.voice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase())) ?? null;
    window.speechSynthesis.speak(utterance);
    toast({
      title: `${label} voice preview started`,
      description: "This preview uses the voice on your device. Upload an MP3 to save audio until Backend generation is available.",
    });
  };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
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
  const saveQuestion = useMutation({
    mutationFn: async () => {
      if (!selectedTopicId) throw new Error("Topic not found");
      if (!["single", "multiple", "essay"].includes(draft.type)) {
        throw new Error("Unsupported question type");
      }
      const questionType = draft.type === "single" ? "Single" : draft.type === "multiple" ? "Multiple" : "Essay";
      const input: Omit<CreateQuestionInput, "topicId" | "sourceType"> = {
          examTypeId: draft.examTypeId,
          content: draft.content.trim(),
          questionType,
          difficulty: "Medium",
          defaultScore: Number(draft.points),
          referenceAnswer: draft.type === "essay" ? draft.instructions : null,
          gradingCriteria: draft.type === "essay" ? draft.rubric : null,
          maxWords: draft.type === "essay" ? 1000 : null,
        };
      const optionInputs = draft.type === "single" || draft.type === "multiple"
        ? draft.options.map((option, index) => ({ content: option.text.trim(), isCorrect: option.correct, displayOrder: index + 1 }))
        : [];
      const question = editingId
        ? await (async () => {
            const existing = editQuestion.data?.options ?? [];
            if (questionType === "Essay" && existing.length) {
              await Promise.all(existing.map((option) => deleteQuestionOption(option.optionId)));
            }
            await updateQuestion(editingId, input);
            const optionIds: string[] = [];
            for (let index = 0; index < optionInputs.length; index += 1) {
              const option = optionInputs[index];
              const current = existing[index];
              if (current) {
                await updateQuestionOption(current.optionId, option);
                optionIds.push(current.optionId);
              } else {
                const created = await createQuestionOption({ ...option, questionId: editingId });
                optionIds.push(created.optionId);
              }
            }
            if (questionType !== "Essay") {
              await Promise.all(existing.slice(optionInputs.length).map((option) => deleteQuestionOption(option.optionId)));
            }
            return { questionId: editingId, createdOptions: optionIds.map((optionId) => ({ optionId })) };
          })()
        : await createQuestionWithOptions({ ...input, topicId: selectedTopicId }, optionInputs);
      if (selectedFiles.current.audio) {
        await uploadQuestionAudio(question.questionId, selectedFiles.current.audio);
      }
      await Promise.all(
        (question.createdOptions ?? []).map((option, index) => {
          const file = selectedOptionAudio.current.get(index);
          return file ? uploadQuestionOptionAudio(option.optionId, file) : Promise.resolve();
        }),
      );
      return question;
    },
    onSuccess: () => {
      localStorage.removeItem(draftKey(userId, purpose));
      setSaved(JSON.stringify(draft));
      toast({
        title: editingId ? "Question updated" : "Question saved",
        description: editingId ? "The question and its answer options were updated." : "The question is now available in the question bank.",
      });
      void navigate(bankPath);
    },
    onError: (error) => {
      setMessage(
        error instanceof Error && error.message === "Unsupported question type"
          ? "This question type cannot be submitted yet. Your work remains saved in this browser."
          : "We couldn’t save this question. Your editor content has been preserved; check your connection and try again.",
      );
    },
  });
  const submit = () => {
    const problems = validateDraft(draft, !!files.image);
    setErrors(problems);
    if (problems.length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    saveQuestion.mutate();
  };
  return (
    <div className="question-studio">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-2">
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
          <span aria-current="page" className="font-semibold text-primary">
            {editingId ? `Edit ${purposeLabel}` : purposeLabel}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => unavailable("Question file import")}
          >
            <FileUp aria-hidden />
            Import question file
          </Button>
          <Button variant="outline" asChild>
            <Link to={bankPath}>Cancel</Link>
          </Button>
        </div>
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
      {examTypes.isSuccess && purposeExamTypes.length === 0 && (
        <Alert variant="destructive">
          <AlertTitle>Exam type unavailable</AlertTitle>
          <AlertDescription>
            No active {purpose === "practice" ? "practice" : "exam"} category is available. Ask an administrator to review the exam type settings before creating this question.
          </AlertDescription>
        </Alert>
      )}
      <div
        ref={studioBodyRef}
        className="studio-body"
        style={{
          gridTemplateColumns: `minmax(0, ${editorWidth}fr) 0.75rem minmax(0, ${100 - editorWidth}fr)`,
        }}
      >
        <Card
          tabIndex={0}
          role="region"
          aria-label="Question authoring canvas"
          className="studio-pane studio-editor gap-6 rounded-none py-6 shadow-none ring-0"
        >
          <CardHeader className="border-b border-border px-0 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                <PencilLine aria-hidden className="size-5 text-primary" />
                {editingId ? "Edit" : "New"} {purposeLabel} Studio
              </h1>
              <Button
                variant="ghost"
                className="text-xs text-primary"
                onClick={() => unavailable("Bloom templates")}
              >
                <Sparkles aria-hidden />
                Bloom templates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-0">
            <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 xl:grid-cols-3">
              <ChoiceField
                label="Course"
                value={draft.course}
                options={courseOptions}
                placeholder="Select course"
                disabled={Boolean(editingId)}
                onChange={(course) => update({ ...draft, course, topic: "" })}
              />
              <ChoiceField
                label="Topic"
                value={draft.topic}
                options={topicOptions}
                placeholder={subjectId ? "Select topic" : "Select a course first"}
                disabled={!subjectId || Boolean(editingId)}
                onChange={(topic) => update({ ...draft, topic })}
              />
              <ChoiceField
                label="Exam type"
                value={draft.examTypeId}
                options={examTypeOptions}
                placeholder="Select exam type"
                onChange={(examTypeId) => update({ ...draft, examTypeId })}
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
              pending={academic.subjects.isPending || academic.topics.isPending || examTypes.isPending}
              error={academic.subjects.error || academic.topics.error || examTypes.error}
              retry={() => {
                void academic.subjects.refetch();
                void academic.topics.refetch();
                void examTypes.refetch();
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
                    disabled={!(["single", "multiple", "essay"] as string[]).includes(type)}
                    className={`h-auto min-h-14 justify-start gap-2 whitespace-normal px-3 text-left text-xs ${draft.type === type ? "border-primary bg-accent text-primary ring-1 ring-primary" : ""}`}
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
                    <span>{label}{!(["single", "multiple", "essay"] as string[]).includes(type) ? " · unavailable" : ""}</span>
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Single Choice, Multiple Choice, and Essay can be submitted. Changing type resets its answer fields while keeping the question content.
              </p>
            </fieldset>
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <PencilLine aria-hidden className="size-5 stroke-[2.5] text-primary" />
                  Question content
                </h2>
              </div>
              <div
                className="flex flex-wrap gap-1 rounded-t-xl border border-border p-1"
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
                ].map(({ label, icon: Icon }) => {
                  const toggleable = ["Bold", "Italic", "Underline"].includes(label);
                  const selected = activeFormats.includes(label);
                  return (
                    <Button
                      key={label}
                      variant="ghost"
                      size="icon"
                      aria-label={label}
                      aria-pressed={toggleable ? selected : undefined}
                      className={selected ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                      onClick={() => {
                        if (!toggleable) {
                          unavailable(label);
                          return;
                        }
                        setActiveFormats((current) =>
                          current.includes(label)
                            ? current.filter((item) => item !== label)
                            : [...current, label],
                        );
                      }}
                    >
                      <Icon aria-hidden />
                    </Button>
                  );
                })}
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
              <div className="space-y-2 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="question-audio">Question audio</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Generate a voice preview from the question or provide a saved MP3.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => previewGeneratedAudio(draft.content, "Question")}>
                    <Sparkles className="size-4 text-primary" aria-hidden />
                    Generate voice preview
                  </Button>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <AudioLines className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p><strong>Automatic audio</strong><span className="mt-1 block text-xs text-muted-foreground">Preview is available now. A generated MP3 can only be saved after the Backend text-to-audio endpoint is connected.</span></p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Or upload MP3</p>
                <Input
                  id="question-audio"
                  type="file"
                  accept="audio/mpeg,.mp3"
                  onChange={(event) => onFile("audio", event.target.files?.[0])}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.current.audio
                    ? `${selectedFiles.current.audio.name} selected for upload.`
                    : "MP3 is optional while saving a draft, but required before the question can be activated for an exam."}
                </p>
              </div>
            </div>
            <QuestionTypeForm
              draft={draft}
              onChange={update}
              onFile={onFile}
              onOptionAudio={onOptionAudio}
              onRemoveOption={removeOptionAudio}
              optionAudioNames={optionAudioNames}
              onGenerateAudio={previewGeneratedAudio}
            />
            <div className="border-t border-border pt-4">
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
        <div
          role="separator"
          aria-label="Resize question editor and live review"
          aria-orientation="vertical"
          aria-valuemin={35}
          aria-valuemax={70}
          aria-valuenow={Math.round(editorWidth)}
          tabIndex={0}
          className="studio-resizer"
          data-dragging={resizing}
          onPointerDown={startResize}
          onPointerMove={(event) => {
            if (resizing && event.currentTarget.hasPointerCapture(event.pointerId)) {
              resizeFromPointer(event.clientX);
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setResizing(false);
          }}
          onPointerCancel={() => setResizing(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setEditorWidth((current) =>
                Math.min(
                  70,
                  Math.max(35, current + (event.key === "ArrowRight" ? 2 : -2)),
                ),
              );
            }
          }}
        />
        <ScrollRegion
          label="Live student review"
          className="studio-pane space-y-6"
        >
          <QuestionPreview key={draft.type} draft={draft} image={files.image} />
        </ScrollRegion>
      </div>
      <footer className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-6 py-3">
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
          <Button disabled={saveQuestion.isPending || (Boolean(editingId) && editQuestion.isPending)} onClick={submit}>
            {saveQuestion.isPending ? "Saving…" : editingId ? "Save changes" : "Save to Question Bank"}
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

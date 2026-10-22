import { useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Contrast,
  EyeOff,
  List,
  Menu,
  RotateCcw,
  Send,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Label } from "@/shared/ui/primitives/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/primitives/tabs";
import { cn } from "@/shared/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { MultipleChoiceQuestion } from "@/shared/ui/patterns/exam/MultipleChoiceQuestion";
import { InlineChoiceQuestion } from "@/shared/ui/patterns/exam/InlineChoiceQuestion";
import { MultipleResponseQuestion } from "@/shared/ui/patterns/exam/MultipleResponseQuestion";
import { CompositeQuestion } from "@/shared/ui/patterns/exam/CompositeQuestion";
import { GraphicTextEntryQuestion } from "@/shared/ui/patterns/exam/GraphicTextEntryQuestion";
import { HotspotQuestion } from "@/shared/ui/patterns/exam/HotspotQuestion";
import { MatchingQuestion } from "@/shared/ui/patterns/exam/MatchingQuestion";
import { TextAreaQuestion } from "@/shared/ui/patterns/exam/TextAreaQuestion";
import { TextEntryQuestion } from "@/shared/ui/patterns/exam/TextEntryQuestion";
import { UploadAssignmentQuestion } from "@/shared/ui/patterns/exam/UploadAssignmentQuestion";
import { Input } from "@/shared/ui/primitives/input";

type QuestionKind =
  | "single"
  | "multi"
  | "inline"
  | "boolean"
  | "text"
  | "numeric"
  | "drag"
  | "graphic-gap"
  | "inline-gap"
  | "hotspot"
  | "graphic-text"
  | "composite"
  | "essay"
  | "textarea"
  | "upload";

interface PlayerQuestion {
  id: string;
  kind: QuestionKind;
  title: string;
  prompt: string;
  options?: string[];
  image?: { src: string; alt: string };
}

const questions: PlayerQuestion[] = [
  {
    id: "architecture",
    kind: "single",
    title: "Multiple choice",
    prompt:
      "Which component provides a single entry point for routing requests to multiple backend services?",
    options: ["API Gateway", "Database index", "Feature flag", "Load test"],
  },
  {
    id: "security",
    kind: "multi",
    title: "Multiple response",
    prompt: "What is special about the year 1776?",
    options: [
      "Adam Smith published The Wealth of Nations in 1776.",
      "Social economics became a separate subject at the University.",
      "Economics was considered to be a separate subject area.",
      "Adam Smith became the first professor of women.",
    ],
    image: {
      src: "/assets/exam/economist-portrait.png",
      alt: "An 18th-century economist portrait",
    },
  },
  {
    id: "delivery",
    kind: "inline",
    title: "Inline choice",
    prompt: "Complete the statement by choosing the best terms.",
  },
  {
    id: "testing",
    kind: "boolean",
    title: "True / false",
    prompt: "A unit test should normally isolate one small piece of behaviour.",
  },
  {
    id: "data",
    kind: "single",
    title: "Multiple choice",
    prompt:
      "Which ACID property means a transaction happens completely or not at all?",
    options: ["Atomicity", "Consistency", "Isolation", "Durability"],
  },
  { id: "text-entry", kind: "text", title: "Text entry", prompt: "Name the HTTP status code commonly used for a successful request." },
  { id: "numeric-entry", kind: "numeric", title: "Numeric entry", prompt: "How many bits are in one byte?" },
  { id: "drag-drop", kind: "drag", title: "Drag and drop", prompt: "Match each testing activity to its purpose.", options: ["Verify a small unit", "Verify components together"] },
  { id: "graphic-gap", kind: "graphic-gap", title: "Graphic gap match", prompt: "Match each label to the appropriate area of this system diagram.", options: ["Client", "API", "Database"] },
  { id: "inline-gap", kind: "inline-gap", title: "Inline gap match", prompt: "Match the development lifecycle activities to their descriptions.", options: ["Plan", "Build", "Evaluate"] },
  { id: "hotspot", kind: "hotspot", title: "Hotspot", prompt: "Select the region representing the application boundary." },
  { id: "graphic-text", kind: "graphic-text", title: "Graphic text entry", prompt: "Label the two marked components in the architecture diagram." },
  { id: "tf-mqr", kind: "composite", title: "True / false & multiple response", prompt: "Respond to both parts of this security scenario." },
  { id: "numeric-mcq", kind: "composite", title: "Numeric entry & multiple choice", prompt: "Calculate the value, then choose the best interpretation." },
  { id: "inline-text", kind: "composite", title: "Inline choice & text entry", prompt: "Complete the statement and justify the choice." },
  { id: "essay", kind: "essay", title: "Essay", prompt: "Evaluate the trade-offs between a monolith and microservices architecture for a small university team." },
  { id: "text-area", kind: "textarea", title: "Text area", prompt: "Briefly reflect on the most important accessibility consideration in this assessment." },
  { id: "upload", kind: "upload", title: "Upload assignment", prompt: "Upload your final design report or source archive." },
];

type Answers = Record<string, string | string[] | undefined>;

function answerState(answer: string | string[] | undefined) {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

function QuestionResponse({
  question,
  answer,
  onChange,
}: {
  question: PlayerQuestion;
  answer: Answers[string];
  onChange: (value: string | string[]) => void;
}) {
  const choices =
    question.kind === "boolean" ? ["True", "False"] : (question.options ?? []);
  return (
    <RadioGroup
      value={typeof answer === "string" ? answer : ""}
      onValueChange={onChange}
      aria-label="Select one alternative"
      className="grid gap-3 sm:grid-cols-2"
    >
      {choices.map((option) => (
        <Label
          key={option}
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-base transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
        >
          <RadioGroupItem value={option} />
          {option}
        </Label>
      ))}
    </RadioGroup>
  );
}

function decodedAnswer(value: Answers[string]) {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function AdvancedPlayerQuestion({
  question,
  questionNumber,
  answer,
  flagged,
  onAnswerChange,
  onReset,
  onToggleFlag,
}: {
  question: PlayerQuestion;
  questionNumber: number;
  answer: Answers[string];
  flagged: boolean;
  onAnswerChange: (value: string) => void;
  onReset: () => void;
  onToggleFlag: () => void;
}) {
  const value = typeof answer === "string" ? answer : "";
  const shared = {
    questionNumber,
    stem: question.prompt,
    flagged,
    onToggleFlag,
    onReset,
    className: "mx-auto max-w-4xl",
  };

  if (question.kind === "text" || question.kind === "numeric") {
    return <TextEntryQuestion {...shared} value={value} numeric={question.kind === "numeric"} suffix={question.kind === "numeric" ? "bits" : undefined} onValueChange={onAnswerChange} />;
  }
  if (question.kind === "essay" || question.kind === "textarea") {
    return <TextAreaQuestion {...shared} value={value} rows={question.kind === "essay" ? 14 : 7} label={question.kind === "essay" ? "Write your essay" : "Write your response"} onValueChange={onAnswerChange} />;
  }
  if (question.kind === "upload") {
    return <UploadAssignmentQuestion {...shared} value={value} onValueChange={onAnswerChange} />;
  }
  if (question.kind === "hotspot") {
    return <HotspotQuestion {...shared} value={value} onValueChange={onAnswerChange} options={[{ id: "A", label: "Application boundary", x: 28, y: 35 }, { id: "B", label: "External service", x: 68, y: 25 }, { id: "C", label: "Data store", x: 56, y: 72 }]} />;
  }
  if (question.kind === "graphic-text") {
    const map = decodedAnswer(answer);
    return <GraphicTextEntryQuestion {...shared} value={map} onValueChange={(next) => onAnswerChange(JSON.stringify(next))} fields={[{ id: "service", label: "Service", x: 10, y: 20 }, { id: "store", label: "Data store", x: 56, y: 58 }]} />;
  }
  if (question.kind === "drag" || question.kind === "graphic-gap" || question.kind === "inline-gap") {
    const map = decodedAnswer(answer);
    const labels = question.kind === "drag" ? ["Unit testing", "Integration testing"] : question.kind === "inline-gap" ? ["First activity", "Second activity", "Third activity"] : ["Left area", "Centre area", "Right area"];
    return <MatchingQuestion {...shared} value={map} onValueChange={(next) => onAnswerChange(JSON.stringify(next))} visual={question.kind === "drag" ? "drag" : question.kind === "graphic-gap" ? "graphic" : "inline"} options={(question.options ?? []).map((label, index) => ({ id: `option-${index}`, label }))} targets={labels.map((label, index) => ({ id: `target-${index}`, label, x: 8 + index * 29, y: 20 + (index % 2) * 42 }))} />;
  }

  const [first = "", second = ""] = value.split("|");
  const update = (part: 0 | 1, next: string) => onAnswerChange(part === 0 ? `${next}|${second}` : `${first}|${next}`);
  if (question.id === "tf-mqr") {
    const selected = second ? second.split(",") : [];
    const toggle = (item: string, checked: boolean) => update(1, checked ? [...selected, item].join(",") : selected.filter((value) => value !== item).join(","));
    return <CompositeQuestion {...shared} hasAnswer={Boolean(first || second)}>
      <fieldset className="grid gap-2"><legend className="font-medium">Part one: true or false</legend><label className="flex min-h-11 items-center gap-2"><Input type="radio" name="tf-mqr" checked={first === "true"} onChange={() => update(0, "true")} /> True</label><label className="flex min-h-11 items-center gap-2"><Input type="radio" name="tf-mqr" checked={first === "false"} onChange={() => update(0, "false")} /> False</label></fieldset>
      <fieldset className="grid gap-2"><legend className="font-medium">Part two: select all appropriate controls</legend>{["Least privilege", "Multi-factor authentication", "Password sharing"].map((item) => <label key={item} className="flex min-h-11 items-center gap-2"><Input type="checkbox" checked={selected.includes(item)} onChange={(event) => toggle(item, event.target.checked)} /> {item}</label>)}</fieldset>
    </CompositeQuestion>;
  }
  if (question.id === "numeric-mcq") return <CompositeQuestion {...shared} hasAnswer={Boolean(first || second)}>
    <div className="grid gap-2"><Label htmlFor="composite-numeric">Part one: calculate the value</Label><Input id="composite-numeric" inputMode="decimal" value={first} onChange={(event) => update(0, event.target.value)} className="h-11 bg-card" /></div>
    <label className="grid gap-2">Part two: choose an interpretation<select value={second} onChange={(event) => update(1, event.target.value)} className="h-11 rounded border border-input bg-card px-3 text-base"><option value="">Select alternative</option><option>Valid result</option><option>Insufficient evidence</option><option>Calculation error</option></select></label>
  </CompositeQuestion>;
  return <CompositeQuestion {...shared} hasAnswer={Boolean(first || second)}>
    <label className="grid gap-2">Part one: complete the statement<select value={first} onChange={(event) => update(0, event.target.value)} className="h-11 rounded border border-input bg-card px-3 text-base"><option value="">Select alternative</option><option>Accessible</option><option>Secure</option><option>Maintainable</option></select></label>
    <div className="grid gap-2"><Label htmlFor={`composite-second-${question.id}`}>Part two: explain your choice</Label><Input id={`composite-second-${question.id}`} value={second} onChange={(event) => update(1, event.target.value)} className="h-11 bg-card" /></div>
  </CompositeQuestion>;
}

interface AssessmentPlayerHeaderProps {
  answeredCount: number;
  flaggedCount: number;
  onOpenOptions: () => void;
  onStartOver: () => void;
  optionsOpen: boolean;
  questionCount: number;
  view: "question" | "contents" | "review";
}

function AssessmentPlayerHeader({
  answeredCount,
  flaggedCount,
  onOpenOptions,
  onStartOver,
  optionsOpen,
  questionCount,
  view,
}: AssessmentPlayerHeaderProps) {
  return (
    <header className="relative shrink-0 border-b border-border bg-background shadow-xs">
      <div className="flex min-h-16 items-center sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            [CANDIDATE ID] - [CANDIDATE NAME]
          </p>
          <p>Connected</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground"></div>
        <Button
          variant="ghost"
          size="icon-xl"
          aria-label="Open options"
          aria-expanded={optionsOpen}
          onClick={onOpenOptions}
        >
          <Menu aria-hidden />
        </Button>
      </div>
      <section
        aria-hidden={view === "question"}
        inert={view === "question"}
        className={cn(
          "w-full overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
          view === "question" ? "max-h-0 opacity-0" : "max-h-56 opacity-100",
        )}
      >
        <div>
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-6 px-4 pb-8 pt-6 sm:px-6">
            {view === "review" ? (
              <>
                <div>
                  <h2 id="review-heading" className="sr-only">
                    Review your answers
                  </h2>
                  <p className="text-lg font-normal text-foreground">
                    You have {questionCount - answeredCount} unattempted
                    questions.
                  </p>
                </div>
                <Button
                  size="xl"
                  className="shrink-0 bg-primary px-6 text-base font-normal text-primary-foreground hover:bg-primary/90"
                  onClick={onStartOver}
                >
                  <RotateCcw aria-hidden />
                  Start over
                </Button>
              </>
            ) : (
              <h2
                id="contents-heading"
                className="text-lg font-normal text-foreground"
              >
                HE MC, MR, T/F, Inline
              </h2>
            )}
          </div>
          <div className="mx-auto w-full max-w-4xl">
            <TabsList
              aria-label="Filter questions"
              variant="line"
              className="mx-auto group-data-horizontal/tabs:h-auto w-full max-w-4xl !justify-start px-4 sm:px-6"
            >
              {(["all", "unanswered", "flagged"] as const).map((name) => (
                <TabsTrigger
                  key={name}
                  value={name}
                  className="will-change-transform !flex-none p-4 text-base font-normal data-[state=active]:shadow-none data-[state=active]:text-foreground group-data-horizontal/tabs:after:h-1"
                >
                  {name === "all" ? (
                    <>
                      All questions{" "}
                      <span className="will-change-transform">
                        ({questionCount})
                      </span>
                    </>
                  ) : name === "unanswered" ? (
                    <>
                      Not attempted{" "}
                      <span className="will-change-transform">
                        ({questionCount - answeredCount})
                      </span>
                    </>
                  ) : (
                    <>
                      Flagged{" "}
                      <span className="will-change-transform">
                        ({flaggedCount})
                      </span>
                    </>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
      </section>
    </header>
  );
}

interface AssessmentPlayerFooterProps {
  answers: Answers;
  currentIndex: number;
  flagged: string[];
  questions: PlayerQuestion[];
  view: "question" | "contents" | "review";
  onGoTo: (index: number) => void;
  onViewChange: (view: "contents" | "review") => void;
}

function AssessmentPlayerFooter({
  answers,
  currentIndex,
  flagged,
  questions,
  view,
  onGoTo,
  onViewChange,
}: AssessmentPlayerFooterProps) {
  return (
    <div className="relative shrink-0">
      <nav
        aria-label="Previous / next question"
        tabIndex={0}
        className="absolute bottom-[calc(100%+1rem)] right-4 z-30 flex gap-1 sm:right-6 md:right-8 [&_[data-slot=button]]:rounded!"
      >
        <Button
          variant="ghost"
          size="icon-xl"
          className="bg-gray-300 hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-0"
          aria-label="Previous"
          disabled={view === "contents"}
          onClick={() => {
            if (view === "review") {
              onGoTo(questions.length - 1);
            } else if (currentIndex === 0) {
              onViewChange("contents");
            } else {
              onGoTo(currentIndex - 1);
            }
          }}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-xl"
          className="bg-gray-300 hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-0"
          aria-label="Next"
          disabled={view === "review"}
          onClick={() => {
            if (view === "contents") {
              onGoTo(0);
            } else if (currentIndex === questions.length - 1) {
              onViewChange("review");
            } else {
              onGoTo(currentIndex + 1);
            }
          }}
        >
          <ChevronRight aria-hidden />
        </Button>
      </nav>
      <footer className="border-t border-border bg-background shadow-lg [&_[data-slot=button]]:!translate-y-0 [&_[data-slot=button]]:border-0 [&_[data-slot=button]]:rounded-none [&_[data-slot=button]]:transition-none overflow-x-auto">
        <nav aria-label="Questions" className="flex items-start">
          <Button
            variant="secondary"
            size="icon-xl"
            aria-label="Navigate to table of contents"
            aria-pressed={view === "contents"}
            className={cn(
              "hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:text-foreground focus-visible:ring-0 py-4.5 px-6 mr-0.5",
              view === "contents" && "bg-primary text-primary-foreground",
            )}
            onClick={() => onViewChange("contents")}
          >
            <List aria-hidden />
          </Button>
          <div
            aria-label="Question navigation"
            className="hidden min-w-0 max-w-full flex-1 items-center justify-start gap-0.5 overflow-x-auto lg:flex px-0.5"
          >
            {questions.map((question, questionIndex) => (
              <div key={question.id} className="relative min-w-14 flex-1">
                <Button
                  variant="secondary"
                  size="xl"
                  aria-label={`Question ${questionIndex + 1} ${answerState(answers[question.id]) ? "Answered" : "Not attempted"}${flagged.includes(question.id) ? " Flagged" : ""}`}
                  aria-current={
                    view === "question" && questionIndex === currentIndex
                      ? "page"
                      : undefined
                  }
                  onClick={() => onGoTo(questionIndex)}
                  className={cn(
                    "relative w-full mt-1 mb-0.5 rounded-none text-muted-foreground font-normal hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-2 focus-visible:text-foreground",
                    questionIndex === currentIndex && view === "question"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary",
                  )}
                >
                  {questionIndex + 1}
                  {flagged.includes(question.id) ? (
                    <Bookmark
                      aria-hidden
                      className="absolute left-1/2 top-0.5 size-3 -translate-x-1/2 fill-current text-current"
                    />
                  ) : null}
                </Button>
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1",
                    answerState(answers[question.id])
                      ? "bg-primary"
                      : questionIndex === currentIndex && view === "question"
                        ? "bg-border"
                        : "bg-transparent",
                  )}
                />
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className={cn(
              "hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:text-foreground focus-visible:ring-0 py-4.5 px-6 ml-0.5",
              view === "review" && "bg-primary text-primary-foreground",
            )}
            size="xl"
            aria-pressed={view === "review"}
            onClick={() => onViewChange("review")}
          >
            <Check aria-hidden />
            Review
          </Button>
        </nav>
      </footer>
    </div>
  );
}

export function AssessmentPlayerDemoRoute() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [view, setView] = useState<"question" | "contents" | "review">(
    "contents",
  );
  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("all");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const current = questions[index];
  const currentAnswer = answers[current.id];
  const selectedOptionIds = Array.isArray(currentAnswer) ? currentAnswer : [];
  const answeredCount = questions.filter((question) =>
    answerState(answers[question.id]),
  ).length;
  const visibleQuestions = useMemo(
    () =>
      questions.filter((question) =>
        filter === "all" || filter === "unanswered"
          ? filter === "all" || !answerState(answers[question.id])
          : flagged.includes(question.id),
      ),
    [answers, filter, flagged],
  );

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setView("question");
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-secondary text-foreground antialiased">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as typeof filter)}
        className="min-h-0 flex-1 gap-0"
      >
        <AssessmentPlayerHeader
          answeredCount={answeredCount}
          flaggedCount={flagged.length}
          optionsOpen={optionsOpen}
          questionCount={questions.length}
          view={view}
          onOpenOptions={() => setOptionsOpen((open) => !open)}
          onStartOver={() => {
            setAnswers({});
            setFlagged([]);
            goTo(0);
          }}
        />

        <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
          <DialogContent
            overlayClassName="bg-transparent duration-0 supports-backdrop-filter:backdrop-blur-none data-open:animate-none data-closed:animate-none"
            closeButtonSize="icon-xl"
            className="inset-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none bg-secondary p-4 font-sans duration-0 data-open:animate-none data-closed:animate-none sm:max-w-none sm:p-6"
          >
            <DialogTitle className="text-center text-2xl font-normal">
              Options
            </DialogTitle>
            <div className="mx-auto flex w-full max-w-180 flex-col gap-4 font-sans">
              <Button
                size="xl"
                className="h-20 justify-between rounded bg-primary px-6 text-base font-normal text-primary-foreground hover:bg-primary/90"
              >
                <span className="flex items-center gap-5">
                  <Send aria-hidden className="size-5" />
                  Go to submission page
                </span>
                <ChevronRight aria-hidden className="size-6" />
              </Button>

              <div className="overflow-hidden rounded border border-border bg-card">
                {[
                  { label: "Language", icon: CircleHelp },
                  { label: "Contrast", icon: Contrast, selected: true },
                  { label: "Text size", icon: ZoomIn },
                ].map(({ label, icon: Icon, selected }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    size="xl"
                    className={cn(
                      "h-20 w-full justify-between rounded-none px-6 text-base font-normal hover:bg-muted",
                      selected && "bg-primary/10",
                    )}
                  >
                    <span className="flex items-center gap-5">
                      <Icon
                        aria-hidden
                        className="size-5 text-muted-foreground"
                      />
                      {label}
                    </span>
                    <ChevronRight aria-hidden className="size-6" />
                  </Button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="xl"
                className="h-20 justify-between rounded border border-border bg-card px-6 text-base font-normal hover:bg-muted"
              >
                <span className="flex items-center gap-5">
                  <EyeOff
                    aria-hidden
                    className="size-5 text-muted-foreground"
                  />
                  Hide or show remaining time
                </span>
                <ChevronRight aria-hidden className="size-6" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <main className="min-h-0 w-full flex-1 overflow-y-scroll py-4 pl-4">
          <div className="w-full mx-auto max-w-4xl flex-1">
            {view === "contents" || view === "review" ? (
              <section
                aria-labelledby={
                  view === "review" ? "review-heading" : "contents-heading"
                }
              >
                {(["all", "unanswered", "flagged"] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-8">
                    <section aria-labelledby="section-one-heading">
                      <h3
                        id="section-one-heading"
                        className="border-b border-border bg-secondary px-5 py-4 text-base font-semibold text-foreground"
                      >
                        Section 1
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Question type</TableHead>
                            {view === "contents" ? (
                              <TableHead>Flag</TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleQuestions.map((question) => {
                            const number = questions.indexOf(question);
                            const answered = answerState(answers[question.id]);
                            return (
                              <TableRow
                                key={question.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`${number + 1} ${answered ? "Answered" : "Unattempted"} ${question.title}${flagged.includes(question.id) ? " Flagged" : ""}`}
                                onClick={() => goTo(number)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    goTo(number);
                                  }
                                }}
                              >
                                <TableCell>
                                  <span>
                                    <span>{number + 1}</span>
                                    <span>
                                      {answered ? "Answered" : "Unattempted"}
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell>{question.title}</TableCell>
                                {view === "contents" ? (
                                  <TableCell>
                                    {flagged.includes(question.id) ? (
                                      <Bookmark aria-label="Flagged" />
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            );
                          })}
                          {visibleQuestions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={view === "contents" ? 3 : 2}>
                                No questions match this filter.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </section>
                  </TabsContent>
                ))}
              </section>
            ) : null}

            {view === "question" ? (
              current.kind === "multi" ? (
                <MultipleResponseQuestion
                  questionNumber={index + 1}
                  stem={current.prompt}
                  image={current.image}
                  imageLayout="above"
                  options={(current.options ?? []).map((option) => ({
                    id: option,
                    text: option,
                  }))}
                  selectedOptionIds={selectedOptionIds}
                  onSelectionChange={(optionId, selected) =>
                    setAnswers((previous) => {
                      const previousAnswer = previous[current.id];
                      const selectedIds = Array.isArray(previousAnswer)
                        ? previousAnswer
                        : [];
                      return {
                        ...previous,
                        [current.id]: selected
                          ? [...selectedIds, optionId]
                          : selectedIds.filter((id) => id !== optionId),
                      };
                    })
                  }
                  onReset={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: undefined,
                    }))
                  }
                  flagged={flagged.includes(current.id)}
                  onToggleFlag={() =>
                    setFlagged((items) =>
                      items.includes(current.id)
                        ? items.filter((id) => id !== current.id)
                        : [...items, current.id],
                    )
                  }
                  className="mx-auto max-w-4xl"
                />
              ) : current.kind === "single" ? (
                <MultipleChoiceQuestion
                  questionNumber={index + 1}
                  stem={current.prompt}
                  image={current.image}
                  options={(current.options ?? []).map((option) => ({
                    id: option,
                    text: option,
                  }))}
                  value={
                    typeof currentAnswer === "string" ? currentAnswer : null
                  }
                  onValueChange={(optionId) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: optionId,
                    }))
                  }
                  onReset={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: undefined,
                    }))
                  }
                  flagged={flagged.includes(current.id)}
                  onToggleFlag={() =>
                    setFlagged((items) =>
                      items.includes(current.id)
                        ? items.filter((id) => id !== current.id)
                        : [...items, current.id],
                    )
                  }
                  className="mx-auto max-w-4xl"
                />
              ) : current.kind === "inline" ? (
                <InlineChoiceQuestion
                  questionNumber={index + 1}
                  stem="Fill out the blanks."
                  segments={[
                    { slotId: "subject" },
                    " are actors that work together to maximize total value creation in a market.",
                    "The point of a resource analysis is to ",
                    { slotId: "purpose" },
                    ".",
                  ]}
                  slots={[
                    {
                      id: "subject",
                      label: "First inline answer",
                      placeholder: "Select alternative",
                      options: [
                        { value: "Companies", label: "Companies" },
                        { value: "Suppliers", label: "Suppliers" },
                        { value: "Competitors", label: "Competitors" },
                      ],
                    },
                    {
                      id: "purpose",
                      label: "Second inline answer",
                      placeholder: "Select alternative",
                      options: [
                        {
                          value: "identify strengths",
                          label: "identify strengths",
                        },
                        { value: "set prices", label: "set prices" },
                        { value: "hire employees", label: "hire employees" },
                      ],
                    },
                  ]}
                  values={(() => {
                    const values =
                      typeof currentAnswer === "string"
                        ? currentAnswer.split("|")
                        : [];
                    return { subject: values[0], purpose: values[1] };
                  })()}
                  onValueChange={(slotId, value) =>
                    setAnswers((previous) => {
                      const previousAnswer = previous[current.id];
                      const values =
                        typeof previousAnswer === "string"
                          ? previousAnswer.split("|")
                          : ["", ""];
                      const nextValues =
                        slotId === "subject"
                          ? [value, values[1] ?? ""]
                          : [values[0] ?? "", value];
                      return {
                        ...previous,
                        [current.id]: nextValues.join("|"),
                      };
                    })
                  }
                  onReset={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: undefined,
                    }))
                  }
                  flagged={flagged.includes(current.id)}
                  onToggleFlag={() =>
                    setFlagged((items) =>
                      items.includes(current.id)
                        ? items.filter((id) => id !== current.id)
                        : [...items, current.id],
                    )
                  }
                  className="mx-auto max-w-4xl"
                />
              ) : current.kind === "boolean" ? (
                <section
                  aria-labelledby="question-heading"
                  className="mx-auto max-w-4xl rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8"
                >
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        QUESTION {index + 1} OF {questions.length}
                      </p>
                      <h2
                        id="question-heading"
                        className="mt-1 text-balance text-2xl font-medium"
                      >
                        {current.title}
                      </h2>
                    </div>
                    <Button
                      variant={
                        flagged.includes(current.id) ? "secondary" : "outline"
                      }
                      size="icon-xl"
                      aria-label={
                        flagged.includes(current.id)
                          ? "Remove question flag"
                          : "Flag question for review"
                      }
                      aria-pressed={flagged.includes(current.id)}
                      onClick={() =>
                        setFlagged((items) =>
                          items.includes(current.id)
                            ? items.filter((id) => id !== current.id)
                            : [...items, current.id],
                        )
                      }
                    >
                      <Bookmark
                        aria-hidden
                        className={cn(
                          "size-5",
                          flagged.includes(current.id) && "fill-current",
                        )}
                      />
                    </Button>
                  </div>
                  <p className="mb-8 max-w-3xl text-pretty text-lg leading-8">
                    {current.prompt}
                  </p>
                  <QuestionResponse
                    question={current}
                    answer={answers[current.id]}
                    onChange={(value) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [current.id]: value,
                      }))
                    }
                  />
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                    <Button
                      variant="ghost"
                      size="xl"
                      onClick={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [current.id]: undefined,
                        }))
                      }
                    >
                      <RotateCcw aria-hidden />
                      Reset response
                    </Button>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CircleHelp aria-hidden className="size-4" /> Your answer
                      is saved as you work.
                    </p>
                  </div>
                </section>
              ) : (
                <AdvancedPlayerQuestion
                  question={current}
                  questionNumber={index + 1}
                  answer={currentAnswer}
                  flagged={flagged.includes(current.id)}
                  onAnswerChange={(value) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: value,
                    }))
                  }
                  onReset={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [current.id]: undefined,
                    }))
                  }
                  onToggleFlag={() =>
                    setFlagged((items) =>
                      items.includes(current.id)
                        ? items.filter((id) => id !== current.id)
                        : [...items, current.id],
                    )
                  }
                />
              )
            ) : null}
          </div>
        </main>
      </Tabs>

      <AssessmentPlayerFooter
        answers={answers}
        currentIndex={index}
        flagged={flagged}
        questions={questions}
        view={view}
        onGoTo={goTo}
        onViewChange={setView}
      />
    </div>
  );
}

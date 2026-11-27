import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Code2,
  FileText,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  SquareTerminal,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Kbd, KbdGroup } from "@/shared/ui/primitives/kbd";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/primitives/tabs";
import { cn } from "@/shared/ui/cn";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import type { CodeRunResult, CodingConfig } from "./assessment-player-types";
import {
  CodeEditor,
  type CodeEditorHandle,
  type CodeEditorPosition,
} from "./CodeEditor";
import {
  CodingResults,
  runSummary,
  runTabSummary,
  type CodeRunState,
} from "./CodingResults";
import { LimitedMarkdown } from "./LimitedMarkdown";

export interface CodingWorkspaceProps {
  questionNumber: number;
  questionCount: number;
  /** Problem statement in limited Markdown. */
  prompt: string;
  stemLang?: string;
  coding: CodingConfig;
  /** Saved answer; undefined until the candidate changes the starter code. */
  code: string | undefined;
  /** Debounced; undefined when the code is empty or back to the starter code. */
  onCodeChange: (code: string | undefined) => void;
  /** Runs the sample tests. Rejects when the run itself could not happen. */
  onRun?: (code: string) => Promise<CodeRunResult>;
  /** The latest run of this question, so results survive moving between questions. */
  lastRun?: CodeRunResult;
  /** A run started earlier (before the candidate left and came back) is still going. */
  runPending?: boolean;
  disabled?: boolean;
  /** "auto" picks split view or tabs from the available width. */
  layout?: "auto" | "split" | "tabs";
  className?: string;
}

export const SAVE_DELAY_MS = 1000;
export const RUN_TIMEOUT_MS = 30_000;

type Tab = "problem" | "code" | "results";

/** Code worth saving: nothing when it is empty or untouched starter code. */
export function savedCode(code: string, starterCode = "") {
  const trimmed = code.trim();
  return trimmed === "" || trimmed === starterCode.trim() ? undefined : code;
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Split view when the workspace is at least --container-coding-split wide. */
function useSplitLayout(layout: CodingWorkspaceProps["layout"]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  useLayoutEffect(() => {
    if (layout !== "auto") return;
    const container = containerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;
    const measure = () => setWide(container.clientWidth >= probe.offsetWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [layout]);
  const split = layout === "split" || (layout === "auto" && wide);
  return { split, containerRef, probeRef };
}

function SectionHeader({
  icon,
  headingId,
  children,
  hiddenHeading,
  trailing,
  headingLabelledBy,
}: {
  icon: ReactNode;
  headingId: string;
  children: ReactNode;
  hiddenHeading?: boolean;
  trailing?: ReactNode;
  /** The player focuses the first h2 on arrival; name it with the position too. */
  headingLabelledBy?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3",
        hiddenHeading && !trailing && "sr-only",
      )}
    >
      {hiddenHeading ? null : (
        <span aria-hidden className="flex">
          {icon}
        </span>
      )}
      <h2
        id={headingId}
        tabIndex={-1}
        aria-labelledby={headingLabelledBy}
        className={cn(
          "min-h-10 content-center text-base font-semibold",
          hiddenHeading && "sr-only",
        )}
      >
        {children}
      </h2>
      {trailing}
    </div>
  );
}

/**
 * Body of a coding question (SCR-25): problem, accessible C editor and sample
 * test results. Split view when there is room, tabs when there is not; the DOM
 * order is the same either way: problem → Reset/Run → editor → results.
 */
export function CodingWorkspace({
  questionNumber,
  questionCount,
  prompt,
  stemLang,
  coding,
  code,
  onCodeChange,
  onRun,
  lastRun,
  runPending = false,
  disabled = false,
  layout = "auto",
  className,
}: CodingWorkspaceProps) {
  const strings = vi.exam.coding;
  const id = useId();
  const ids = {
    position: `${id}-position`,
    problem: `${id}-problem`,
    code: `${id}-code`,
    results: `${id}-results`,
    help: `${id}-help`,
  };
  const starter = coding.starterCode ?? "";
  const { split, containerRef, probeRef } = useSplitLayout(layout);
  const [tab, setTab] = useState<Tab>("problem");

  // The editor owns the document; this mirrors it for saving and Reset.
  const initialCode = useRef(code ?? starter).current;
  const codeRef = useRef(initialCode);
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [position, setPosition] = useState<CodeEditorPosition>({
    line: 1,
    column: 1,
    indent: 0,
  });
  const editorRef = useRef<CodeEditorHandle>(null);

  const saveTimer = useRef<number | undefined>(undefined);
  const pendingSave = useRef(false);
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;
  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    if (!pendingSave.current) return;
    pendingSave.current = false;
    onCodeChangeRef.current(savedCode(codeRef.current, starter));
  }, [starter]);
  useEffect(() => flush, [flush]);

  const handleChange = (next: string) => {
    codeRef.current = next;
    setCurrentCode(next);
    pendingSave.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, SAVE_DELAY_MS);
  };

  const [localRun, setRun] = useState<CodeRunState>({ kind: "idle" });
  // A run from an earlier visit (still going, or finished) shows until this visit runs again.
  const run: CodeRunState =
    localRun.kind !== "idle"
      ? localRun
      : runPending
        ? { kind: "running" }
        : lastRun
          ? { kind: "done", result: lastRun }
          : localRun;
  const running = run.kind === "running";
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const runCode = async () => {
    if (running || disabled || !onRun) return;
    flush();
    setRun({ kind: "running" });
    try {
      const result = await withTimeout(onRun(codeRef.current), RUN_TIMEOUT_MS);
      if (!mounted.current) return;
      setRun({ kind: "done", result });
      announce(runSummary(result));
    } catch {
      if (!mounted.current) return;
      setRun({ kind: "failed" });
      announce(strings.runFailed);
    }
  };

  const errors =
    run.kind === "done" && run.result.status === "compileError"
      ? run.result.errors
      : [];

  const atStarter = currentCode === starter;
  const reset = () => {
    if (atStarter || disabled) return;
    editorRef.current?.replaceAll(starter);
    announce(strings.resetDone);
  };

  const goToLine = (line: number) => {
    if (!split) setTab("code");
    // Let the code panel show before moving focus into it.
    window.requestAnimationFrame(() => editorRef.current?.goToLine(line));
    const error = errors.find((item) => item.line === line);
    if (error) announce(strings.errorAt(error.line, error.message));
  };

  // Ctrl+Enter runs from anywhere in the question, not only the editor.
  const runRef = useRef(runCode);
  runRef.current = runCode;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void runRef.current();
      }
    };
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [containerRef]);

  // Split view only: problem column width, and results height inside the code column.
  const [problemShare, setProblemShare] = useState(40);
  const [resultsShare, setResultsShare] = useState(40);
  const splitRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  // Editor fills the whole workspace; other panels stay mounted (hidden) so nothing resets.
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((value) => !value);
    if (!split) setTab("code");
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="exam"
        aria-pressed={expanded}
        onClick={toggleExpanded}
      >
        {expanded ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        {strings.expandEditor}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="exam"
        aria-disabled={atStarter || disabled}
        aria-describedby={atStarter ? `${id}-reset-why` : undefined}
        onClick={reset}
      >
        <RotateCcw aria-hidden />
        {strings.reset}
      </Button>
      <span id={`${id}-reset-why`} className="sr-only">
        {strings.resetUnavailable}
      </span>
      <Button
        type="button"
        size="exam"
        aria-disabled={running || disabled || !onRun}
        aria-keyshortcuts="Control+Enter"
        onClick={() => void runCode()}
      >
        {running ? (
          <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <Play aria-hidden />
        )}
        {running ? strings.running : strings.run}
        <span aria-hidden className="text-sm opacity-90">
          {strings.runShortcut}
        </span>
      </Button>
    </div>
  );

  const positionLabel = (
    <span id={ids.position} className="text-sm text-muted-foreground">
      {vi.exam.questionPosition(questionNumber, questionCount)} ·{" "}
      {strings.kindTitle}
    </span>
  );

  const problem = (
    <section
      aria-labelledby={ids.problem}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border bg-card"
    >
      <SectionHeader
        icon={<FileText className="size-4" />}
        headingId={ids.problem}
        headingLabelledBy={`${ids.position} ${ids.problem}`}
        hiddenHeading={!split}
        trailing={
          split ? <div className="ml-auto">{positionLabel}</div> : undefined
        }
      >
        {strings.problem}
      </SectionHeader>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-4 pb-6">
        {coding.title ? (
          <h3 lang={stemLang} className="text-2xl leading-tight font-semibold">
            {coding.title}
          </h3>
        ) : null}
        <LimitedMarkdown
          source={prompt}
          lang={stemLang}
          className="text-base leading-relaxed"
        />
        {coding.samples.map((sample, index) => {
          const sampleId = `${id}-sample-${index}`;
          return (
            <div
              key={index}
              role="group"
              aria-labelledby={sampleId}
              className="flex flex-col gap-1.5"
            >
              <h4 id={sampleId} className="text-base font-semibold">
                {strings.sample(index + 1)}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: strings.input, text: sample.input },
                  { label: strings.output, text: sample.output },
                ].map((block) => (
                  <div
                    key={block.label}
                    className="flex min-w-0 flex-col gap-1"
                  >
                    <span className="text-sm text-muted-foreground">
                      {block.label}
                    </span>
                    <pre
                      aria-label={`${strings.sample(index + 1)} ${block.label.toLowerCase()}`}
                      className="m-0 rounded border border-border bg-muted/40 px-3 py-2 font-mono text-base whitespace-pre-wrap [font-variant-ligatures:none]"
                    >
                      {block.text}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const codeSection = (
    <section
      aria-labelledby={ids.code}
      className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded border border-border bg-card"
    >
      <SectionHeader
        icon={<Code2 className="size-4" />}
        headingId={ids.code}
        hiddenHeading={!split}
        trailing={
          split ? (
            <span className="text-sm text-muted-foreground">
              {strings.language}
            </span>
          ) : undefined
        }
      >
        {strings.code}
      </SectionHeader>
      <CodeEditor
        ref={editorRef}
        initialValue={codeRef.current}
        label={strings.editorLabel}
        describedBy={ids.help}
        readOnly={disabled}
        errors={errors}
        onChange={handleChange}
        onPositionChange={setPosition}
        onRun={() => void runCode()}
        onSpeakPosition={() =>
          announce(
            strings.status(position.line, position.column, position.indent),
          )
        }
        onSpeakError={(error) =>
          announce(strings.errorAt(error.line, error.message))
        }
        markStart={codeRef.current === starter}
        onEnterAtStart={(line) => announce(strings.startHere(line))}
        className="flex-1"
      />
      <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-2 text-sm text-muted-foreground">
        <span id={ids.help} className="sr-only">
          {strings.editorHelp} {strings.shortcutsHelp}
        </span>
        <ul aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {strings.shortcuts.map((shortcut) => (
            <li key={shortcut.label} className="flex items-center gap-1.5">
              {shortcut.keys.map((chord, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  {index > 0 ? <span>{strings.then}</span> : null}
                  <KbdGroup>
                    {chord.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </KbdGroup>
                </span>
              ))}
              <span>{shortcut.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="tabular-nums">
            {strings.status(position.line, position.column, position.indent)}
          </span>
          <div className="ml-auto">{toolbar}</div>
        </div>
      </div>
    </section>
  );

  const results = (
    <section
      aria-labelledby={ids.results}
      aria-busy={running}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border bg-card"
    >
      <SectionHeader
        icon={<SquareTerminal className="size-4" />}
        headingId={ids.results}
        hiddenHeading={!split}
      >
        {strings.results}
      </SectionHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <CodingResults
          state={run}
          sampleCount={coding.samples.length}
          onRetry={() => void runCode()}
          onGoToLine={goToLine}
        />
      </div>
    </section>
  );

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={strings.workspaceLabel}
      className={cn("relative flex min-h-0 flex-1 flex-col gap-2", className)}
    >
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute h-0 w-(--container-coding-split)"
      />
      {split ? (
        <div ref={splitRef} className="flex min-h-0 flex-1">
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col",
              expanded && "hidden",
            )}
            style={{ flex: `${problemShare} 1 0` }}
          >
            {problem}
          </div>
          {expanded ? null : (
            <ResizeHandle
              orientation="vertical"
              label={strings.resizeProblem}
              value={problemShare}
              min={25}
              max={60}
              onChange={setProblemShare}
              areaRef={splitRef}
            />
          )}
          <div
            ref={columnRef}
            className="flex min-h-0 min-w-0 flex-col"
            style={{ flex: expanded ? "1 1 0" : `${100 - problemShare} 1 0` }}
          >
            <div
              className="flex min-h-0 flex-col"
              style={{ flex: expanded ? "1 1 0" : `${100 - resultsShare} 1 0` }}
            >
              {codeSection}
            </div>
            {expanded ? null : (
              <ResizeHandle
                orientation="horizontal"
                label={strings.resizeResults}
                value={resultsShare}
                min={20}
                max={75}
                onChange={setResultsShare}
                areaRef={columnRef}
              />
            )}
            <div
              className={cn("flex min-h-0 flex-col", expanded && "hidden")}
              style={{ flex: `${resultsShare} 1 0` }}
            >
              {results}
            </div>
          </div>
        </div>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          className="min-h-0 flex-1"
        >
          <div
            className={cn(
              "flex flex-col gap-2 rounded border border-border bg-card p-3",
              expanded && "hidden",
            )}
          >
            {positionLabel}
            <TabsList
              variant="line"
              aria-label={strings.workspaceLabel}
              className="h-auto w-full flex-wrap justify-start"
            >
              <TabsTrigger value="problem" className="min-h-11 flex-none">
                {strings.problem}
              </TabsTrigger>
              <TabsTrigger value="code" className="min-h-11 flex-none">
                {strings.code}
              </TabsTrigger>
              <TabsTrigger value="results" className="min-h-11 flex-none">
                {runTabSummary(run)}
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Panels stay mounted so the editor keeps its undo history across tabs. */}
          <TabsContent
            value="problem"
            forceMount
            className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            {problem}
          </TabsContent>
          <TabsContent
            value="code"
            forceMount
            className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            {codeSection}
          </TabsContent>
          <TabsContent
            value="results"
            forceMount
            className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            {results}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface ResizeHandleProps {
  /** "vertical": a bar between columns, value = left share. "horizontal": between rows, value = bottom share. */
  orientation: "vertical" | "horizontal";
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  areaRef: RefObject<HTMLDivElement | null>;
}

/** WAI-ARIA window splitter: arrows move by 5, Home/End jump to the limits, pointer drags. */
function ResizeHandle({
  orientation,
  label,
  value,
  min,
  max,
  onChange,
  areaRef,
}: ResizeHandleProps) {
  const vertical = orientation === "vertical";
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next)));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = vertical
      ? { ArrowRight: 5, ArrowLeft: -5 }
      : { ArrowUp: 5, ArrowDown: -5 };
    let next: number | undefined;
    if (event.key in steps) next = value + steps[event.key];
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === undefined) return;
    event.preventDefault();
    onChange(clamp(next));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current;
    if (!area) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const move = (moveEvent: globalThis.PointerEvent) => {
      const rect = area.getBoundingClientRect();
      onChange(
        clamp(
          vertical
            ? ((moveEvent.clientX - rect.left) / rect.width) * 100
            : ((rect.bottom - moveEvent.clientY) / rect.height) * 100,
        ),
      );
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
  };
  return (
    // A focusable separator is a widget (WAI-ARIA window splitter).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="separator"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className={cn(
        "flex shrink-0 touch-none items-center justify-center rounded focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-solid",
        vertical ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "rounded-full bg-muted-foreground",
          vertical ? "h-12 w-1.5" : "h-1.5 w-12",
        )}
      />
    </div>
  );
}

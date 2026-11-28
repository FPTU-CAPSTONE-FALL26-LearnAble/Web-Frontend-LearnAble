import { Check, LoaderCircle, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import type { CodeRunResult, CodeTestResult } from "./assessment-player-types";

export type CodeRunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: CodeRunResult }
  /** `reason`: the host's own explanation, shown instead of the generic text. */
  | { kind: "failed"; reason?: string };

/** Longest output shown per block; the server should also cap it. */
export const OUTPUT_LIMIT = 2000;

const strings = () => vi.exam.coding;

/** The one sentence announced after a run, and shown as the results summary. */
export function runSummary(result: CodeRunResult) {
  const s = strings();
  if (result.status === "compileError") {
    const [first, ...rest] = result.errors;
    if (!first) return `${s.compileFailedTitle}.`;
    return `${s.compileFailed(first.line, first.message)}${rest.length ? s.moreErrors(rest.length) : ""}.`;
  }
  const total = result.tests.length;
  const passed = result.tests.filter((test) => test.outcome === "passed").length;
  if (passed === total) return `${s.allPassed(total)}.`;
  const firstFailed = result.tests.find((test) => test.outcome !== "passed");
  return `${s.somePassed(passed, total)}. ${firstFailed ? s.firstFailed(firstFailed.index) : ""}`.trim();
}

/** Short state for the Test results tab name. */
export function runTabSummary(state: CodeRunState) {
  const s = strings();
  if (state.kind === "running") return s.resultsTab(s.running);
  if (state.kind !== "done") return s.results;
  if (state.result.status === "compileError") return s.compileErrorTab;
  const total = state.result.tests.length;
  const passed = state.result.tests.filter((test) => test.outcome === "passed").length;
  return s.resultsTab(`${passed} of ${total} passed`);
}

function OutputBlock({ label, text, failed }: { label: string; text: string; failed?: boolean }) {
  const s = strings();
  const truncated = text.length > OUTPUT_LIMIT;
  const shown = truncated ? text.slice(0, OUTPUT_LIMIT) : text;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <pre
        className={cn(
          "m-0 min-h-10 rounded border px-3 py-2 font-mono text-sm whitespace-pre-wrap [font-variant-ligatures:none]",
          failed ? "border-destructive" : "border-border bg-muted/40",
        )}
      >
        {shown === "" ? <span className="text-muted-foreground">{s.emptyOutput}</span> : shown}
      </pre>
      {truncated ? <span className="text-sm text-muted-foreground">{s.truncated(OUTPUT_LIMIT)}</span> : null}
    </div>
  );
}

function TestItem({ test }: { test: CodeTestResult }) {
  const s = strings();
  const passed = test.outcome === "passed";
  return (
    <li className={cn("rounded border", passed ? "border-border" : "border-destructive")}>
      <details open={!passed} className="group">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 font-semibold">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
              passed ? "border-foreground" : "border-destructive text-destructive",
            )}
          >
            {passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          </span>
          <span>
            {s.testName(test.index)}: {s.outcome[test.outcome]}
          </span>
        </summary>
        <div className="grid gap-2 px-3 pb-3 md:grid-cols-3">
          <OutputBlock label={s.input} text={test.input} />
          <OutputBlock label={s.expectedOutput} text={test.expectedOutput} />
          <OutputBlock label={s.yourOutput} text={test.actualOutput} failed={!passed} />
        </div>
        {test.message ? <p className="m-0 px-3 pb-3 text-sm">{test.message}</p> : null}
      </details>
    </li>
  );
}

export interface CodingResultsProps {
  state: CodeRunState;
  sampleCount: number;
  onRetry: () => void;
  onGoToLine: (line: number) => void;
}

/**
 * Sample test results. Not a live region: the workspace announces one summary
 * per run, and everything here is read on demand.
 */
export function CodingResults({ state, sampleCount, onRetry, onGoToLine }: CodingResultsProps) {
  const s = strings();
  if (state.kind === "idle") {
    return <p className="m-0 text-muted-foreground">{s.emptyResults}</p>;
  }
  if (state.kind === "running") {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 flex items-center gap-2 text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
          {s.runningResults(sampleCount)}
        </p>
        {/* Placeholder rows, one per sample test; the sentence above says what is happening. */}
        <ul aria-hidden className="m-0 flex list-none flex-col gap-2 p-0">
          {Array.from({ length: sampleCount }, (_, index) => (
            <li
              key={index}
              className="flex h-12 items-center gap-3 rounded border border-border bg-muted/40 px-3 motion-safe:animate-pulse"
            >
              <span className="size-5 shrink-0 rounded-full bg-muted" />
              <span className="h-3 w-32 rounded-sm bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (state.kind === "failed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="m-0 font-semibold">{state.reason ?? s.runFailed}</p>
        {/* A known reason (a run limit, nothing saved) is not fixed by running again. */}
        {state.reason ? null : (
          <Button type="button" variant="outline" size="xl" onClick={onRetry}>
            {s.tryAgain}
          </Button>
        )}
      </div>
    );
  }

  const { result } = state;
  if (result.status === "compileError") {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-xl font-semibold text-destructive">{s.compileFailedTitle}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {result.errors.map((error, index) => (
            <li key={index} className="flex flex-col items-start gap-2 rounded border border-destructive p-3">
              <pre className="m-0 font-mono text-sm whitespace-pre-wrap [font-variant-ligatures:none]">
                {`main.c:${error.line}${error.column ? `:${error.column}` : ""}: error: ${error.message}`}
              </pre>
              <Button type="button" variant="outline" size="xl" onClick={() => onGoToLine(error.line)}>
                {s.goToLine(error.line)}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const failedFirst = [
    ...result.tests.filter((test) => test.outcome !== "passed"),
    ...result.tests.filter((test) => test.outcome === "passed"),
  ];
  const allPassed = failedFirst.every((test) => test.outcome === "passed");
  return (
    <div className="flex flex-col gap-3">
      <p className={cn("m-0 text-xl font-semibold", !allPassed && "text-destructive")}>
        {runSummary(result).split(". ")[0].replace(/\.$/, "")}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {failedFirst.map((test) => (
          <TestItem key={test.index} test={test} />
        ))}
      </ul>
    </div>
  );
}

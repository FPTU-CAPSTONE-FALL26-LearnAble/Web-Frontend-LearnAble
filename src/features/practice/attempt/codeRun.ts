import { ApiFailure } from "@/api/client";
import {
  runPracticeCode,
  type CodingPublicResult,
  type CodingRunJob,
  type PracticeCodeRunTarget,
  type RunCodeOptions,
} from "@/api/studentCoding";
import { vi } from "@/shared/strings/vi";
import type { CodeRunResult, CodeTestResult } from "@/shared/ui/patterns/exam/assessment-player-types";

/**
 * A finished code run as the shared player shows it. Ported from the desktop
 * exam client (`session/codeRun.ts`) so both apps read results the same way.
 */

/** A Coding question's public example, as the attempt sends it. */
export type CodeExample = { input: string; expectedOutput: string };

/**
 * Compiler diagnostics as `file:line[:column]: [fatal ]error: message` (gcc and
 * clang). Warnings and notes are left out. Output with no located error (a
 * linker error, say) becomes one error at line 1 with the compiler's own words,
 * because the player always offers to go to an error's line.
 */
export function parseCompilerErrors(output: string | null): { line: number; column?: number; message: string }[] {
  const text = (output ?? "").replace(/\r\n?/g, "\n");
  const errors = [...text.matchAll(/^[^\n:]*:(\d+):(?:(\d+):)? (?:fatal )?error: (.+)$/gm)].map((match) => ({
    line: Number(match[1]),
    ...(match[2] ? { column: Number(match[2]) } : {}),
    message: match[3].trim(),
  }));
  if (errors.length) return errors;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const message =
    lines.find((line) => /undefined reference/i.test(line)) ??
    lines.find((line) => /error/i.test(line)) ??
    lines[0] ??
    vi.exam.coding.didNotCompile;
  return [{ line: 1, message }];
}

const outcomes: Record<Exclude<CodingPublicResult["verdict"], "CompilationError">, CodeTestResult["outcome"]> = {
  Accepted: "passed",
  WrongAnswer: "failed",
  TimeLimitExceeded: "timeLimitExceeded",
  RuntimeError: "runtimeError",
};

/** A completed job as the player shows it: one result per public example, in the examples' order. */
export function toCodeRunResult(job: CodingRunJob, examples: readonly CodeExample[]): CodeRunResult {
  const results = job.publicResults;
  if (job.status !== "Completed" || !results || results.length !== examples.length) {
    throw new ApiFailure({ kind: "parse" });
  }
  const compile = results.find((result) => result.verdict === "CompilationError");
  if (compile) return { status: "compileError", errors: parseCompilerErrors(compile.compilationOutput) };
  return {
    status: "compiled",
    tests: results.map((result, index): CodeTestResult => {
      const outcome = outcomes[result.verdict as keyof typeof outcomes];
      const message = outcome === "runtimeError" ? result.stderr?.trim() || undefined : undefined;
      return {
        index: index + 1,
        outcome,
        input: examples[index].input,
        expectedOutput: examples[index].expectedOutput,
        actualOutput: result.stdout ?? "",
        ...(message ? { message } : {}),
      };
    }),
  };
}

/**
 * Runs the answer saved at `expectedRevision` and returns what the player
 * shows. Failures are thrown, which the player reports as "couldn't run".
 */
export async function runSavedPracticeCode(
  target: PracticeCodeRunTarget,
  expectedRevision: number,
  examples: readonly CodeExample[],
  options?: RunCodeOptions,
): Promise<CodeRunResult> {
  return toCodeRunResult(await runPracticeCode(target, expectedRevision, options), examples);
}

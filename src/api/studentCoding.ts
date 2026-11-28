import { z } from "zod";
import { ApiFailure } from "@/api/client";
import { newOperationId, unwrapEnvelope } from "@/api/assessmentAttempt";

/**
 * Code runs in a practice attempt: the student's saved program is run against
 * the question's public examples in the sandbox, without changing the answer
 * or the score.
 *
 *   POST /me/practice-sessions/{sessionId}/attempts/{attemptId}/questions/{questionId}/code-runs
 *        { operationId, expectedRevision }  → 202, the queued job
 *   GET  /me/coding-jobs/{submissionId}     → the job, polled until it finishes
 *
 * A run tests the answer the Backend saved at `expectedRevision`, never code
 * sent with the request, so the caller saves the answer first. (The lecturer
 * and examiner coding endpoints are in `coding.ts`.)
 */

/** Only these verdicts reach a student. A sandbox fault fails the whole job instead (`InfrastructureFailed`). */
const verdictSchema = z.enum(["Accepted", "WrongAnswer", "TimeLimitExceeded", "CompilationError", "RuntimeError"]);

/** `CodingPublicResult`: one per public example, in the order of `coding.examples`. */
export const codingPublicResultSchema = z.object({
  verdict: verdictSchema,
  stdout: z.string().nullable(),
  stderr: z.string().nullable(),
  compilationOutput: z.string().nullable(),
});
export type CodingPublicResult = z.infer<typeof codingPublicResultSchema>;

/** `CodingJobDto` for a run. Graded submissions report only "Submitted" and are never polled here. */
export const codingRunJobSchema = z
  .object({
    submissionId: z.string().min(1),
    status: z.enum(["Pending", "Dispatching", "Running", "Completed", "InfrastructureFailed"]),
    publicResults: z.array(codingPublicResultSchema).nullable().optional(),
  })
  .refine((job) => (job.status === "Completed") === Array.isArray(job.publicResults), "Results only when completed");
export type CodingRunJob = z.infer<typeof codingRunJobSchema>;

/** The practice attempt question a run belongs to. */
export type PracticeCodeRunTarget = { sessionId: string; attemptId: string; questionId: string };

/** The only error code the Backend gives a refused run; its message says why. */
const RUN_REJECTED = "CODING_REQUEST_REJECTED";

/**
 * Why a run produced no results:
 * - `refused`: the Backend turned the run down. `message` is its reason, for
 *   example that the run limit is reached or the attempt is no longer active.
 * - `infrastructure`: the sandbox failed the job.
 * - `timeout`: no result within {@link CODE_RUN_LIMIT_MS}. The run may still
 *   finish on the server.
 */
export class CodeRunFailed extends Error {
  constructor(
    public readonly reason: "refused" | "infrastructure" | "timeout",
    public readonly submissionId?: string,
    /** The Backend's own reason, for a refused run. */
    public readonly serverMessage?: string,
  ) {
    super(`code-run:${reason}`);
    this.name = "CodeRunFailed";
  }
}

/**
 * A refused run is a 409 whose `errors` is `CODING_REQUEST_REJECTED`. The
 * shared client joins `message` and `errors` into one text, so the code is
 * taken off again to leave only the reason a student can read.
 */
function refusal(error: unknown): CodeRunFailed | null {
  if (!(error instanceof ApiFailure) || error.detail.kind !== "server" || error.detail.status !== 409) return null;
  const text = error.serverMessage ?? "";
  if (!text.includes(RUN_REJECTED)) return null;
  const reason = text.replace(RUN_REJECTED, "").replace(/[:;\s]+$/, "").trim();
  return new CodeRunFailed("refused", undefined, reason || undefined);
}

const runPath = ({ sessionId, attemptId, questionId }: PracticeCodeRunTarget) =>
  `/me/practice-sessions/${encodeURIComponent(sessionId)}/attempts/${encodeURIComponent(attemptId)}` +
  `/questions/${encodeURIComponent(questionId)}/code-runs`;

/** Queues a run of the answer saved at `expectedRevision`. Sending the same `operationId` again returns the same job. */
export async function startPracticeCodeRun(
  target: PracticeCodeRunTarget,
  operationId: string,
  expectedRevision: number,
): Promise<CodingRunJob> {
  try {
    return await unwrapEnvelope(runPath(target), codingRunJobSchema, {
      method: "POST",
      cache: "no-store",
      json: { operationId, expectedRevision },
    });
  } catch (error) {
    throw refusal(error) ?? error;
  }
}

/** One poll of a run's job. */
export async function getCodingJob(submissionId: string): Promise<CodingRunJob> {
  const job = await unwrapEnvelope(`/me/coding-jobs/${encodeURIComponent(submissionId)}`, codingRunJobSchema, {
    cache: "no-store",
  });
  if (job.submissionId !== submissionId) throw new ApiFailure({ kind: "parse" });
  return job;
}

/** How long a run is polled before the student is told it couldn't run. */
export const CODE_RUN_LIMIT_MS = 30_000;
/** Every second for the first five seconds, then every two. */
export const codeRunPollDelay = (elapsedMs: number) => (elapsedMs < 5_000 ? 1_000 : 2_000);

export type RunCodeOptions = {
  operationId?: string;
  signal?: AbortSignal;
  /** Test seams. */
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
};

const abortError = () => new DOMException("Code run aborted", "AbortError");

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const stop = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal?.addEventListener("abort", stop, { once: true });
  });
}

const isNetworkFailure = (error: unknown) => error instanceof ApiFailure && error.detail.kind === "network";

/**
 * Runs the answer saved at `expectedRevision` and waits for the job to finish,
 * returning it with its results. A lost start is sent once more with the same
 * operation, which the Backend treats as the same run; a lost poll is polled
 * again. Throws {@link CodeRunFailed} for a refused, failed or timed-out run,
 * and the `ApiFailure` itself for anything else.
 */
export async function runPracticeCode(
  target: PracticeCodeRunTarget,
  expectedRevision: number,
  options: RunCodeOptions = {},
): Promise<CodingRunJob> {
  const { operationId = newOperationId(), signal, wait = delay, now = Date.now } = options;
  const started = now();
  let job: CodingRunJob;
  try {
    job = await startPracticeCodeRun(target, operationId, expectedRevision);
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    await wait(codeRunPollDelay(0), signal);
    job = await startPracticeCodeRun(target, operationId, expectedRevision);
  }
  const { submissionId } = job;
  for (;;) {
    if (job.status === "Completed") return job;
    if (job.status === "InfrastructureFailed") throw new CodeRunFailed("infrastructure", submissionId);
    const elapsed = now() - started;
    if (elapsed >= CODE_RUN_LIMIT_MS) throw new CodeRunFailed("timeout", submissionId);
    await wait(Math.min(codeRunPollDelay(elapsed), CODE_RUN_LIMIT_MS - elapsed), signal);
    try {
      job = await getCodingJob(submissionId);
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
    }
  }
}

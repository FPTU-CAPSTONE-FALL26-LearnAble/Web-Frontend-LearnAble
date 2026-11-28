import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { PracticeAttemptRoute } from "./PracticeAttemptRoute";

// jsdom has no layout; CodeMirror measures text ranges (as in CodingWorkspace.test.tsx).
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();

/**
 * Coding questions in a practice attempt: the C workspace with Run wired to
 * the Backend's code runs, and the note for a question the web cannot edit.
 */

const SESSION = "7b000000-0000-4000-8000-0000000000c1";
const ATTEMPT = "8c000000-0000-4000-8000-0000000000c1";
const STARTER = "#include <stdio.h>\n\nint main(void) {\n  return 0;\n}\n";
const PROGRAM = "#include <stdio.h>\nint main(void) { puts(\"3\"); return 0; }\n";

const ok = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: null, data, errors: null }, { status });
const coding = (languageCode: string) => ({
  languageCode,
  starterCode: STARTER,
  starterCodes: { [languageCode]: STARTER },
  inputDescription: "Two integers.",
  outputDescription: "Their sum.",
  constraints: "",
  cpuSeconds: 1,
  wallSeconds: 2,
  memoryKb: 65536,
  examples: [
    { input: "1 2\n", expectedOutput: "3\n" },
    { input: "2 2\n", expectedOutput: "4\n" },
  ],
});
const codingQuestion = (attemptQuestionId: string, position: number, languageCode: string) => ({
  attemptQuestionId,
  questionType: "Coding",
  position,
  content: "Add two integers.",
  maxWords: null,
  audio: null,
  options: [],
  images: [],
  answerFormat: null,
  coding: coding(languageCode),
});
const attempt = (answers: unknown[]) => ({
  attemptId: ATTEMPT,
  sessionId: SESSION,
  status: "Active",
  startedAt: new Date().toISOString(),
  deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  submittedAt: null,
  submissionReason: null,
  serverNow: new Date().toISOString(),
  questions: [codingQuestion("c-q", 1, "c-gcc-9.2.0"), codingQuestion("py-q", 2, "python3")],
  answers,
});
const savedProgram = {
  attemptQuestionId: "c-q",
  answer: { kind: "Coding", sourceCode: PROGRAM, languageCode: "c-gcc-9.2.0" },
  revision: 2,
  lastOperationId: "8c000000-0000-4000-8000-0000000000ff",
  serverSavedAt: new Date().toISOString(),
};

const runs: unknown[] = [];
const server = setupServer(
  http.post(`*/me/practice-sessions/${SESSION}/attempts/${ATTEMPT}/questions/c-q/code-runs`, async ({ request }) => {
    runs.push(await request.json());
    return ok({ submissionId: "job-1", status: "Pending", publicResults: null }, 202);
  }),
  http.get("*/me/coding-jobs/job-1", () =>
    ok({
      submissionId: "job-1",
      status: "Completed",
      publicResults: [
        { verdict: "Accepted", stdout: "3\n", stderr: null, compilationOutput: null },
        { verdict: "WrongAnswer", stdout: "3\n", stderr: null, compilationOutput: null },
      ],
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  sessionStorage.clear();
  runs.length = 0;
});

function openAttempt(answers: unknown[]) {
  server.use(
    http.post(`*/me/practice-sessions/${SESSION}/attempt`, () => ok(attempt(answers))),
    http.get(`*/me/practice-sessions/${SESSION}/attempt`, () => ok(attempt(answers))),
  );
  const router = createMemoryRouter([{ path: "/practice/:sessionId", element: <PracticeAttemptRoute /> }], {
    initialEntries: [`/practice/${SESSION}`],
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
      <LiveRegion />
    </QueryClientProvider>,
  );
}

async function openQuestion(name: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name }, { timeout: 3000 }));
}

describe("coding questions in practice", () => {
  it("runs the saved program and shows each sample's result", async () => {
    openAttempt([savedProgram]);
    await openQuestion(/Question 1/);
    expect(screen.getByRole("textbox", { name: "Code editor, C" })).toBeInTheDocument();
    expect(screen.queryByText(/only language the web editor supports/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByText("1 of 2 sample tests passed", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(runs).toEqual([{ operationId: expect.any(String), expectedRevision: 2 }]);
    const results = within(screen.getByRole("region", { name: "Test results" })).getAllByRole("listitem");
    expect(results).toHaveLength(2);
  });

  it("runs the untouched starter code of an unanswered question by saving it first", async () => {
    const saves: { revision: number; answer: unknown }[] = [];
    server.use(
      http.put(`*/me/practice-sessions/${SESSION}/answers`, async ({ request }) => {
        const operation = (await request.json()) as { operationId: string; revision: number; answer: unknown };
        saves.push(operation);
        return ok({
          attemptId: ATTEMPT,
          attemptQuestionId: "c-q",
          operationId: operation.operationId,
          acceptedRevision: operation.revision,
          serverSavedAt: new Date().toISOString(),
          serverNow: new Date().toISOString(),
          deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: "Active",
        });
      }),
    );
    openAttempt([]);
    await openQuestion(/Question 1/);
    await userEvent.click(screen.getByRole("button", { name: /^Run/ }));
    expect(await screen.findByText("1 of 2 sample tests passed", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(saves).toEqual([
      { operationId: expect.any(String), attemptQuestionId: "c-q", baseRevision: 0, revision: 1, answer: { kind: "Coding", sourceCode: STARTER, languageCode: "c-gcc-9.2.0" } },
    ]);
    // The run waits for the save and tests the revision it was accepted at.
    expect(runs).toEqual([{ operationId: expect.any(String), expectedRevision: 1 }]);
  });

  it("shows the Backend's reason when it refuses the run", async () => {
    server.use(
      http.post(`*/me/practice-sessions/${SESSION}/attempts/${ATTEMPT}/questions/c-q/code-runs`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "The Coding limit for this question has been reached.",
            data: null,
            errors: ["CODING_REQUEST_REJECTED"],
          },
          { status: 409 },
        ),
      ),
    );
    openAttempt([savedProgram]);
    await openQuestion(/Question 1/);
    await userEvent.click(screen.getByRole("button", { name: /^Run/ }));
    const results = screen.getByRole("region", { name: "Test results" });
    expect(
      await within(results).findByText("The Coding limit for this question has been reached.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(results).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("explains a coding question that is not in C instead of offering the editor", async () => {
    openAttempt([]);
    await openQuestion(/Question 2/);
    expect(await screen.findByText(/only language the web editor supports/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Code editor, C" })).not.toBeInTheDocument();
  });
});

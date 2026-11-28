import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { PracticeResultRoute } from "./PracticeResultRoute";

// jsdom has no layout; CodeMirror measures text ranges (as in CodingWorkspace.test.tsx).
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();

/**
 * The review of a Coding question: the result has no source code, so the
 * program the student saved is read from the submitted attempt.
 */

const SESSION = "7b000000-0000-4000-8000-0000000000d1";
const PROGRAM = '#include <stdio.h>\nint main(void) { puts("3"); return 0; }\n';
const REFERENCE = '#include <stdio.h>\nint main(void) { int a, b; scanf("%d %d", &a, &b); printf("%d\\n", a + b); }\n';

const ok = (data: unknown) => HttpResponse.json({ success: true, message: null, data, errors: null });
const grade = (attemptQuestionId: string, position: number, questionType: string, extra: object = {}) => ({
  attemptQuestionId,
  position,
  questionType,
  content: "Add two integers.",
  answerText: null,
  referenceAnswer: null,
  maxScore: 2,
  score: 1,
  feedback: null,
  options: [],
  selectedOptionIds: [],
  ...extra,
});
const result = (review: unknown[]) => ({
  result: {
    attemptId: "a-1",
    participation: "Submitted",
    submittedAt: new Date().toISOString(),
    gradingStatus: "Complete",
    totalScore: 1,
    maxScore: 2,
    scoreOnTen: 5,
    passed: true,
  },
  review,
});
const attempt = (answers: unknown[]) => ({
  attemptId: "a-1",
  sessionId: SESSION,
  status: "Submitted",
  startedAt: new Date().toISOString(),
  deadlineAt: new Date().toISOString(),
  submittedAt: new Date().toISOString(),
  submissionReason: "Student",
  serverNow: new Date().toISOString(),
  questions: [],
  answers,
});
const saved = (attemptQuestionId: string, sourceCode: string) => ({
  attemptQuestionId,
  answer: { kind: "Coding", sourceCode, languageCode: "c-gcc-9.2.0" },
  revision: 3,
  lastOperationId: "8c000000-0000-4000-8000-0000000000ff",
  serverSavedAt: new Date().toISOString(),
});

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function openResult(review: unknown[], attemptResponse?: () => Response) {
  const attemptReads: string[] = [];
  server.use(
    http.get(`*/me/practice-sessions/${SESSION}/result`, () => ok(result(review))),
    http.get(`*/me/practice-sessions/${SESSION}/attempt`, ({ request }) => {
      attemptReads.push(request.url);
      return attemptResponse ? attemptResponse() : ok(attempt([saved("code", PROGRAM)]));
    }),
  );
  const router = createMemoryRouter([{ path: "/practice/:sessionId/result", element: <PracticeResultRoute /> }], {
    initialEntries: [`/practice/${SESSION}/result`],
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return attemptReads;
}

const question = (name: RegExp) => screen.findByRole("article", { name }, { timeout: 3000 });

describe("reviewing a coding question", () => {
  it("shows the saved program and the reference answer in read-only C editors", async () => {
    openResult([
      grade("code", 1, "Coding", { referenceAnswer: REFERENCE, content: "Read `n` integers. Sum the **even** ones." }),
    ]);
    const item = await question(/Question 1 · Coding/);
    const program = await within(item).findByRole("textbox", { name: "Your program, C, read only" });
    expect(program).toHaveAttribute("aria-readonly", "true");
    expect(program).toHaveTextContent('puts("3")');
    const reference = within(item).getByRole("textbox", { name: "Reference answer, C, read only" });
    expect(reference).toHaveTextContent("scanf");
    expect(within(item).getByText("1 of 2 points")).toBeInTheDocument();
    // The statement's Markdown is rendered, as in the player, not shown raw.
    expect(within(item).getByText("even", { selector: "strong" })).toBeInTheDocument();
    expect(within(item).getByText("n", { selector: "code" })).toBeInTheDocument();
    expect(within(item).queryByText(/\*\*even\*\*/)).not.toBeInTheDocument();
    // The grading status is written out, not shown as the Backend's code.
    expect(screen.getByText("Grading: complete")).toBeInTheDocument();
  });

  it("says when no program was saved", async () => {
    openResult([grade("code", 1, "Coding", { score: 0 })], () => ok(attempt([saved("code", "")])));
    const item = await question(/Question 1 · Coding/);
    expect(await within(item).findByText("No answer")).toBeInTheDocument();
    expect(within(item).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("keeps the score when the program cannot be loaded", async () => {
    openResult([grade("code", 1, "Coding")], () =>
      HttpResponse.json({ success: false, message: "Down", data: null, errors: null }, { status: 503 }),
    );
    const item = await question(/Question 1 · Coding/);
    expect(await within(item).findByText(/Your program could not be loaded/)).toBeInTheDocument();
    expect(within(item).getByText("1 of 2 points")).toBeInTheDocument();
  });

  it("does not read the attempt when the review has no coding question", async () => {
    const reads = openResult([grade("essay", 1, "Essay", { answerText: "A graph." })]);
    expect(await screen.findByText("A graph.", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(reads).toEqual([]);
  });
});

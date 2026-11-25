import { HttpResponse, delay, http } from "msw";

/**
 * Offline stand-in for `StudentPracticeSessions` (see `src/api/studentPractice.ts`),
 * used only when `VITE_USE_MSW=true`. Bodies follow the OpenAPI response models;
 * grading is computed here only so the result screen has something to show.
 */

const ok = <T,>(data: T) => HttpResponse.json({ success: true, message: null, data, errors: null });
const fail = (status: number, message: string) =>
  HttpResponse.json({ success: false, message, data: null, errors: null }, { status });

const hour = 60 * 60 * 1000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const OPEN = "7b000000-0000-4000-8000-000000000001";
const UPCOMING = "7b000000-0000-4000-8000-000000000002";
const RELEASED = "7b000000-0000-4000-8000-000000000003";

const sessions = () => [
  {
    sessionId: OPEN, examSubjectId: "s-1", examPaperId: "p-1", name: "PRO192 · Object-oriented basics",
    status: "Open", opensAt: iso(-hour), closesAt: iso(3 * hour), durationMinutes: 30, registered: 40,
    revision: "1", releasedAt: null,
  },
  {
    sessionId: UPCOMING, examSubjectId: "s-2", examPaperId: "p-2", name: "MAD101 · Sets and relations",
    status: "Scheduled", opensAt: iso(24 * hour), closesAt: iso(26 * hour), durationMinutes: 45, registered: 38,
    revision: "1", releasedAt: null,
  },
  {
    sessionId: RELEASED, examSubjectId: "s-1", examPaperId: "p-1", name: "PRO192 · Warm-up quiz",
    status: "Completed", opensAt: iso(-72 * hour), closesAt: iso(-70 * hour), durationMinutes: 20, registered: 40,
    revision: "3", releasedAt: iso(-48 * hour),
  },
];

const option = (id: string, position: number, content: string) => ({
  optionId: id, position, label: String.fromCharCode(64 + position), content, audio: null,
});

const questions = [
  {
    attemptQuestionId: "q-1", questionType: "Single", position: 1, maxWords: null, audio: null, images: [], answerFormat: null,
    content: "Which keyword creates a new object in Java?",
    options: [option("q1-a", 1, "new"), option("q1-b", 2, "create"), option("q1-c", 3, "make"), option("q1-d", 4, "object")],
  },
  {
    attemptQuestionId: "q-2", questionType: "Multiple", position: 2, maxWords: null, audio: null, images: [], answerFormat: null,
    content: "Which of these are access modifiers in Java? Choose all that apply.",
    options: [option("q2-a", 1, "public"), option("q2-b", 2, "private"), option("q2-c", 3, "static"), option("q2-d", 4, "protected")],
  },
  {
    attemptQuestionId: "q-3", questionType: "Essay", position: 3, maxWords: 150, audio: null, images: [], answerFormat: null, options: [],
    content: "In two or three sentences, explain the difference between a class and an object.",
  },
  {
    attemptQuestionId: "q-4", questionType: "Coding", position: 4, maxWords: null, audio: null, images: [], answerFormat: null, options: [],
    content: "Write a method that returns the larger of two integers.",
  },
];
const correct: Record<string, string[]> = { "q-1": ["q1-a"], "q-2": ["q2-a", "q2-b", "q2-d"] };

type Stored = { attemptQuestionId: string; answer: Record<string, unknown>; revision: number; lastOperationId: string; serverSavedAt: string };
let attempt: { attemptId: string; startedAt: string; deadlineAt: string; submittedAt: string | null; answers: Map<string, Stored> } | null = null;

const attemptBody = () => ({
  attemptId: attempt!.attemptId, sessionId: OPEN, status: attempt!.submittedAt ? "Submitted" : "Active",
  startedAt: attempt!.startedAt, deadlineAt: attempt!.deadlineAt, submittedAt: attempt!.submittedAt,
  submissionReason: attempt!.submittedAt ? "Student" : null, serverNow: new Date().toISOString(),
  questions, answers: [...attempt!.answers.values()],
});

function store(operation: { operationId: string; attemptQuestionId: string; revision?: number; answer: Record<string, unknown> }) {
  const saved = {
    attemptQuestionId: operation.attemptQuestionId, answer: operation.answer,
    revision: operation.revision ?? (attempt!.answers.get(operation.attemptQuestionId)?.revision ?? 0) + 1,
    lastOperationId: operation.operationId, serverSavedAt: new Date().toISOString(),
  };
  attempt!.answers.set(operation.attemptQuestionId, saved);
  return saved;
}

const review = (selected: (id: string) => string[], text: (id: string) => string | null) =>
  questions.map((q) => {
    const chosen = selected(q.attemptQuestionId);
    const right = correct[q.attemptQuestionId];
    const auto = Boolean(right);
    const score = auto ? (right.length === chosen.length && right.every((id) => chosen.includes(id)) ? 1 : 0) : null;
    return {
      attemptQuestionId: q.attemptQuestionId, position: q.position, questionType: q.questionType, content: q.content,
      answerText: text(q.attemptQuestionId), referenceAnswer: q.questionType === "Essay" ? "A class is a blueprint; an object is one instance built from it." : null,
      gradingCriteria: null, maxScore: 1, score, gradingMethod: auto ? "Automatic" : "Manual", gradedBy: null, gradedAt: null,
      feedback: null, selectedOptionIds: chosen, images: [], answerFormat: null,
      options: q.options.map((o) => ({ optionId: o.optionId, position: o.position, content: o.content, isCorrect: right?.includes(o.optionId) ?? false })),
    };
  });

export const studentPracticeHandlers = [
  http.get("*/me/practice-sessions", async () => {
    await delay(250);
    return ok(sessions());
  }),

  http.post("*/me/practice-sessions/:id/attempt", async ({ params }) => {
    await delay(300);
    if (params.id !== OPEN) return fail(409, "This practice session is not open.");
    attempt ??= {
      attemptId: "8c000000-0000-4000-8000-000000000001", startedAt: new Date().toISOString(),
      deadlineAt: iso(30 * 60 * 1000), submittedAt: null, answers: new Map(),
    };
    return ok(attemptBody());
  }),

  http.get("*/me/practice-sessions/:id/attempt", async () => {
    await delay(200);
    return attempt ? ok(attemptBody()) : fail(404, "No attempt has been started.");
  }),

  http.put("*/me/practice-sessions/:id/answers", async ({ request }) => {
    await delay(250);
    if (!attempt || attempt.submittedAt) return fail(409, "The attempt is not active.");
    const saved = store((await request.json()) as Parameters<typeof store>[0]);
    return ok({
      attemptId: attempt.attemptId, attemptQuestionId: saved.attemptQuestionId, operationId: saved.lastOperationId,
      acceptedRevision: saved.revision, serverSavedAt: saved.serverSavedAt, serverNow: new Date().toISOString(),
      deadlineAt: attempt.deadlineAt, status: "Active",
    });
  }),

  http.post("*/me/practice-sessions/:id/submit", async ({ request }) => {
    await delay(400);
    if (!attempt) return fail(404, "No attempt has been started.");
    const body = (await request.json()) as { finalAnswers?: Parameters<typeof store>[0][] };
    body.finalAnswers?.forEach(store);
    attempt.submittedAt = new Date().toISOString();
    return ok(attemptBody());
  }),

  http.get("*/me/practice-sessions/:id/result", async ({ params }) => {
    await delay(250);
    if (params.id === RELEASED) {
      const items = review((id) => (id === "q-1" ? ["q1-a"] : id === "q-2" ? ["q2-a", "q2-c"] : []), (id) => (id === "q-3" ? "A class describes objects." : null));
      return ok({
        result: { studentId: "me", attemptId: "old", participation: "Submitted", submittedAt: iso(-71 * hour), gradingStatus: "Completed", autoScore: 1, manualScore: 1, totalScore: 2, maxScore: 4, scoreOnTen: 5, passed: true },
        review: items.map((item) => (item.questionType === "Essay" ? { ...item, score: 1, feedback: "Clear and correct." } : item)),
      });
    }
    return fail(403, "Your lecturer has not released the results of this session yet.");
  }),
];

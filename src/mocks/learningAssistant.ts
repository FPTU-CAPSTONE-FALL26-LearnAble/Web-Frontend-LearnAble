import { HttpResponse, delay, http } from "msw";

/**
 * Offline stand-in for the deployed `LearningAssistant` API (see
 * `src/api/learningAssistant.ts`), used only when `VITE_USE_MSW=true`.
 *
 * Only the answer to a question has a declared response in the OpenAPI
 * document; the other bodies here are this app's assumption of the shape.
 * The course list is the student's curriculum, read as `useAssistantCourses`
 * reads it: profile → curriculum → subjects, named from `GET /Subjects`.
 */

const ok = <T,>(data: T) =>
  HttpResponse.json({ success: true, message: null, data, errors: null });
const fail = (status: number, message: string) =>
  HttpResponse.json({ success: false, message, data: null, errors: null }, { status });

const courses = [
  { subjectId: "6a000000-0000-4000-8000-000000000001", subjectCode: "PRO192", subjectNameEn: "Object-Oriented Programming" },
  { subjectId: "6a000000-0000-4000-8000-000000000002", subjectCode: "MAD101", subjectNameEn: "Discrete Mathematics" },
];
/** In the catalogue, but not in the mock student's curriculum. */
const outsideCurriculum = {
  subjectId: "6a000000-0000-4000-8000-000000000003",
  subjectCode: "ENG111",
  subjectNameEn: "Elementary English",
};
const CURRICULUM_ID = "6b000000-0000-4000-8000-000000000001";
const NOT_IN_CURRICULUM = "Subject is not available in your curriculum.";
const inCurriculum = (courseId: unknown) => courses.some((course) => course.subjectId === courseId);
const courseName = (courseId: string) => {
  const course = courses.find((item) => item.subjectId === courseId);
  return course ? `${course.subjectCode} — ${course.subjectNameEn}` : null;
};

type Message = {
  messageId: string;
  role: "User" | "Assistant";
  content: string;
  evidenceStatus: string | null;
  sources: object[];
  limitations: string[];
  createdAt: string;
};
type Conversation = {
  conversationId: string;
  courseId: string;
  courseName: string | null;
  title: string | null;
  createdAt: string;
  lastMessageAt: string;
  messages: Message[];
};

const source = {
  id: "6c000000-0000-4000-8000-000000000001",
  type: "Material",
  title: "PRO192 Course Book — Chapter 2: Encapsulation",
  url: null,
  materialId: "6d000000-0000-4000-8000-000000000001",
  pageNumber: 34,
  slideNumber: null,
};

let conversations: Conversation[] = [
  {
    conversationId: "6b000000-0000-4000-8000-000000000001",
    courseId: courses[0].subjectId,
    courseName: courseName(courses[0].subjectId),
    title: "What is encapsulation?",
    createdAt: "2026-11-12T02:00:00Z",
    lastMessageAt: "2026-11-12T02:00:20Z",
    messages: [
      { messageId: "6e000000-0000-4000-8000-000000000001", role: "User", content: "What is encapsulation?", evidenceStatus: null, sources: [], limitations: [], createdAt: "2026-11-12T02:00:00Z" },
      { messageId: "6e000000-0000-4000-8000-000000000002", role: "Assistant", content: "Encapsulation hides an object's internal state and gives controlled access through public methods.", evidenceStatus: "Grounded", sources: [source], limitations: [], createdAt: "2026-11-12T02:00:20Z" },
    ],
  },
];

const find = (id: unknown) => conversations.find((item) => item.conversationId === id);
const summary = (conversation: Conversation) => ({
  conversationId: conversation.conversationId,
  courseId: conversation.courseId,
  courseName: conversation.courseName,
  title: conversation.title,
  createdAt: conversation.createdAt,
  lastMessageAt: conversation.lastMessageAt,
});
const page = <T,>(items: T[]) => ({
  items,
  pageNumber: 1,
  pageSize: Math.max(items.length, 1),
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

/** A very short silent WAV, so "Listen" has something to play offline. */
function silentWav(): ArrayBuffer {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) =>
    [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, "data");
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128);
  return buffer;
}

export const learningAssistantHandlers = [
  // Before "*/Subjects": that pattern also matches "…/Curriculums/{id}/subjects".
  http.get("*/StudentProfiles/:userId", async ({ params }) => {
    await delay(100);
    return ok({ userId: params.userId, curriculumId: CURRICULUM_ID });
  }),
  http.get("*/Curriculums/:curriculumId/subjects", async ({ params }) => {
    await delay(100);
    if (params.curriculumId !== CURRICULUM_ID) return fail(404, "Curriculum not found.");
    return ok(courses.map((course) => ({ subjectId: course.subjectId })));
  }),
  // The whole catalogue; the page keeps only the curriculum's subjects.
  http.get("*/Subjects", async () => {
    await delay(150);
    return ok(page([...courses, outsideCurriculum].map((course) => ({ ...course, isActive: true }))));
  }),

  http.get("*/me/learning-assistant/conversations", async ({ request }) => {
    await delay(200);
    const courseId = new URL(request.url).searchParams.get("courseId");
    if (!courseId) return fail(400, "A subject is required.");
    if (!inCurriculum(courseId)) return fail(400, NOT_IN_CURRICULUM);
    return ok(page(conversations.filter((item) => item.courseId === courseId).map(summary)));
  }),

  http.post("*/me/learning-assistant/conversations", async ({ request }) => {
    await delay(200);
    const { courseId } = (await request.json()) as { courseId?: string };
    if (!courseId) return fail(400, "A course is required.");
    if (!inCurriculum(courseId)) return fail(400, NOT_IN_CURRICULUM);
    const now = new Date().toISOString();
    const created: Conversation = {
      conversationId: crypto.randomUUID(),
      courseId,
      courseName: courseName(courseId),
      title: null,
      createdAt: now,
      lastMessageAt: now,
      messages: [],
    };
    conversations = [created, ...conversations];
    return ok(summary(created));
  }),

  http.get("*/me/learning-assistant/conversations/:conversationId/messages", async ({ params }) => {
    await delay(200);
    const conversation = find(params.conversationId);
    return conversation ? ok(page(conversation.messages)) : fail(404, "Conversation not found.");
  }),

  http.post("*/me/learning-assistant/conversations/:conversationId/messages", async ({ params, request }) => {
    // The real Backend answers only after validating citations, so this is slow on purpose.
    await delay(1500);
    const conversation = find(params.conversationId);
    if (!conversation) return fail(404, "Conversation not found.");
    const { message } = (await request.json()) as { message?: string };
    const question = message?.trim() ?? "";
    if (!question) return fail(400, "A question is required.");
    if (/joke|weather/i.test(question)) {
      return fail(400, "This question is outside the scope of the course. Ask about the course materials.");
    }
    const grounded = !/outside the materials/i.test(question);
    const now = new Date().toISOString();
    const answer: Message = {
      messageId: crypto.randomUUID(),
      role: "Assistant",
      content: grounded
        ? "Encapsulation hides an object's internal state and gives controlled access through public methods. See chapter 2 of the course book."
        : "This topic is not covered by the uploaded course materials, so this is only general guidance.",
      evidenceStatus: grounded ? "Grounded" : "Insufficient",
      sources: grounded ? [source, { ...source, id: "6c000000-0000-4000-8000-000000000002", title: "Week 3 lecture slides", pageNumber: null, slideNumber: 12 }] : [],
      limitations: grounded ? [] : ["No supporting passage was found in the course materials."],
      createdAt: now,
    };
    conversation.messages.push(
      { messageId: crypto.randomUUID(), role: "User", content: question, evidenceStatus: null, sources: [], limitations: [], createdAt: now },
      answer,
    );
    conversation.lastMessageAt = now;
    conversation.title ??= question.slice(0, 60);
    return ok({
      messageId: answer.messageId,
      answer: answer.content,
      evidenceStatus: answer.evidenceStatus,
      sources: answer.sources,
      usedWebSearch: false,
      usage: { model: "mock", inputTokens: 0, outputTokens: 0, estimatedCostUsd: null },
      limitations: answer.limitations,
    });
  }),

  http.post("*/me/learning-assistant/conversations/:conversationId/messages/:messageId/audio", async () => {
    await delay(300);
    return new HttpResponse(silentWav(), { headers: { "Content-Type": "audio/wav" } });
  }),

  // Signalling only: echoes a minimal SDP answer; no media flows in the mock.
  http.post(
    "*/me/learning-assistant/conversations/:conversationId/realtime/sessions",
    async ({ params, request }) => {
      await delay(150);
      if (!find(params.conversationId)) return fail(404, "Conversation not found.");
      const body = (await request.json().catch(() => null)) as { sdp?: string | null } | null;
      if (!body?.sdp?.trim()) return fail(400, "An SDP offer is required.");
      return ok({
        conversationId: params.conversationId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=LearnAble mock\r\nt=0 0\r\n",
        model: "mock-realtime",
        voice: "mock-voice",
      });
    },
  ),
  http.delete("*/me/learning-assistant/conversations/:conversationId", async ({ params }) => {
    await delay(150);
    if (!find(params.conversationId)) return fail(404, "Conversation not found.");
    conversations = conversations.filter((item) => item.conversationId !== params.conversationId);
    return ok(null);
  }),
];

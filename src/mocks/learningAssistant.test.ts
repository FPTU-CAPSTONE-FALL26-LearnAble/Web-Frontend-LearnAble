import { HttpResponse, getResponse, http } from "msw";
import {
  askAssistant,
  deleteAssistantConversation,
  getAssistantConversations,
  getAssistantMessageAudio,
  getAssistantMessages,
  getMyCurriculumSubjectIds,
  startAssistantConversation,
  startAssistantRealtimeSession,
} from "@/api/learningAssistant";
import { getSubjects } from "@/api/catalog";
import { learningAssistantHandlers } from "./learningAssistant";

/** The signed-in student; `handlers.ts` serves this one in the running app. */
const currentUser = http.get("*/auth/me", () =>
  HttpResponse.json({
    success: true,
    message: null,
    data: { userId: "student-1", fullName: "Mock Student", email: null, role: "Student" },
    errors: null,
  }),
);

/** The mocks must be readable by the same API module that reads the real Backend. */
describe("learning assistant mocks", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = new URL(String(input), "http://localhost");
      const response = await getResponse([currentUser, ...learningAssistantHandlers], new Request(url, init));
      if (!response) throw new Error(`No mock handler for ${init?.method ?? "GET"} ${url.pathname}`);
      return response;
    });
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:mock-audio" }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("serves a whole conversation: courses, start, ask, history, audio, delete", async () => {
    const [course] = (await getSubjects()).items;
    const started = await startAssistantConversation(course.subjectId);
    expect(started.courseId).toBe(course.subjectId);

    const answer = await askAssistant(started.conversationId, "What is encapsulation?");
    expect(answer.text).toMatch(/Encapsulation/);
    expect(answer.sources.length).toBeGreaterThan(0);

    const messages = await getAssistantMessages(started.conversationId);
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(messages[1].messageId).toBe(answer.messageId);

    expect(await getAssistantMessageAudio(started.conversationId, answer.messageId)).toBe("blob:mock-audio");

    const listed = await getAssistantConversations(course.subjectId);
    expect(listed[0]).toMatchObject({ conversationId: started.conversationId, title: "What is encapsulation?" });

    await deleteAssistantConversation(started.conversationId);
    expect((await getAssistantConversations(course.subjectId)).map((item) => item.conversationId)).not.toContain(started.conversationId);
  }, 10_000);

  it("refuses a question outside the course with a message", async () => {
    const [course] = (await getSubjects()).items;
    const [existing] = await getAssistantConversations(course.subjectId);
    await expect(askAssistant(existing.conversationId, "Tell me a joke")).rejects.toMatchObject({
      serverMessage: expect.stringMatching(/outside the scope/),
    });
  }, 10_000);

  it("answers a realtime SDP offer for an existing conversation", async () => {
    const [course] = (await getSubjects()).items;
    const [existing] = await getAssistantConversations(course.subjectId);
    const session = await startAssistantRealtimeSession(existing.conversationId, "v=0 offer");
    expect(session.conversationId).toBe(existing.conversationId);
    expect(session.sdp).toMatch(/^v=0/);
    await expect(startAssistantRealtimeSession(existing.conversationId, " ")).rejects.toMatchObject({
      serverMessage: "An SDP offer is required.",
    });
  });

  it("keeps a catalogue subject outside the curriculum out of reach", async () => {
    const catalogue = (await getSubjects()).items;
    const allowed = await getMyCurriculumSubjectIds();
    const outside = catalogue.find((subject) => !allowed?.includes(subject.subjectId));
    expect(allowed).toHaveLength(catalogue.length - 1);
    await expect(getAssistantConversations(outside!.subjectId)).rejects.toMatchObject({
      serverMessage: "Subject is not available in your curriculum.",
    });
  });
});

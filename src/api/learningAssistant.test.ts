import {
  askAssistant,
  deleteAssistantConversation,
  getAssistantConversations,
  getAssistantMessageAudio,
  getAssistantMessages,
  getMyCurriculumSubjectIds,
  startAssistantConversation,
  startAssistantRealtimeSession,
} from "./learningAssistant";

const reply = (data: unknown, status = 200, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Outside the course scope.", data, errors: null }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const body = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));

describe("learning assistant API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("starts a conversation for one course", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ conversationId: "c1", title: "PRO192" }));
    expect(await startAssistantConversation("course-1")).toEqual({
      conversationId: "c1", courseId: "course-1", courseName: null, title: "PRO192", updatedAt: null,
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me\/learning-assistant\/conversations$/);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
    expect(body(fetchMock.mock.calls[0])).toEqual({ courseId: "course-1" });
  });

  it("lists conversations from a page or a bare array, skipping rows without an id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      reply({ items: [{ id: "c1", courseName: "PRO192", lastMessageAt: "2026-11-10T00:00:00Z" }, { title: "broken" }] }),
    );
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(await getAssistantConversations("course-1")).toEqual([
      { conversationId: "c1", courseId: "course-1", courseName: "PRO192", title: null, updatedAt: "2026-11-10T00:00:00Z" },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/conversations\?courseId=course-1&PageNumber=1&PageSize=100$/);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply([{ conversationId: "c2" }]));
    expect((await getAssistantConversations("course-1")).map((row) => row.conversationId)).toEqual(["c2"]);
  });

  it("reads messages oldest first, with roles and sources", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        items: [
          { messageId: "m2", role: "Assistant", content: "Encapsulation hides state.", createdAt: "2026-11-10T00:00:05Z", sources: [{ id: "s1", title: "Chapter 2", pageNumber: 34, url: "javascript:alert(1)" }] },
          { messageId: "m1", role: "User", content: "What is encapsulation?", createdAt: "2026-11-10T00:00:00Z" },
        ],
      }),
    );
    const messages = await getAssistantMessages("c1");
    expect(messages.map((message) => [message.messageId, message.role])).toEqual([["m1", "user"], ["m2", "assistant"]]);
    expect(messages[1].sources).toEqual([
      { key: "s1", title: "Chapter 2", type: null, url: null, pageNumber: 34, slideNumber: null },
    ]);
  });

  it("asks a question without streaming and returns the answer with its sources", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        messageId: "m9",
        answer: "Encapsulation hides state.",
        evidenceStatus: "Grounded",
        sources: [{ id: "s1", type: "Material", title: "Chapter 2", url: "https://example.com/doc", slideNumber: 12 }],
        usedWebSearch: false,
        limitations: ["Only chapter 2 was indexed."],
      }),
    );
    const answer = await askAssistant("c1", "What is encapsulation?");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/conversations\/c1\/messages$/);
    expect(body(fetchMock.mock.calls[0])).toEqual({ message: "What is encapsulation?", stream: false });
    expect(answer).toMatchObject({
      messageId: "m9",
      role: "assistant",
      text: "Encapsulation hides state.",
      evidenceStatus: "Grounded",
      limitations: ["Only chapter 2 was indexed."],
      sources: [{ key: "s1", title: "Chapter 2", type: "Material", url: "https://example.com/doc", pageNumber: null, slideNumber: 12 }],
    });
  });

  it("keeps the Backend's explanation when a question is refused", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, 400, false));
    await expect(askAssistant("c1", "Tell me a joke")).rejects.toMatchObject({ serverMessage: "Outside the course scope." });
  });

  it("deletes a conversation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null));
    await deleteAssistantConversation("c1");
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/conversations\/c1$/);
  });

  it("plays an audio file from an object URL and a JSON reply from its link", async () => {
    const createObjectURL = vi.fn(() => "blob:audio-1");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(new Blob(["x"], { type: "audio/mpeg" })));
    expect(await getAssistantMessageAudio("c1", "m9")).toBe("blob:audio-1");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/conversations\/c1\/messages\/m9\/audio$/);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ audioUrl: "https://cdn.example.com/m9.mp3" }));
    expect(await getAssistantMessageAudio("c1", "m9")).toBe("https://cdn.example.com/m9.mp3");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({}));
    await expect(getAssistantMessageAudio("c1", "m9")).rejects.toThrow();
  });

  it("exchanges an SDP offer for the realtime answer", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ conversationId: "c1", sdp: "v=0 answer", model: "realtime-1", voice: "alloy" }));
    expect(await startAssistantRealtimeSession("c1", "v=0 offer")).toEqual({
      conversationId: "c1", sdp: "v=0 answer", model: "realtime-1", voice: "alloy",
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/conversations\/c1\/realtime\/sessions$/);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
    expect(body(fetchMock.mock.calls[0])).toEqual({ sdp: "v=0 offer" });

    // An answer without SDP cannot start a call.
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ conversationId: "c1", sdp: null }));
    await expect(startAssistantRealtimeSession("c1", "v=0 offer")).rejects.toThrow();
  });

  it("reads the subject ids of the student's own curriculum", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ userId: "u1", fullName: null, email: null, role: "Student" }))
      .mockResolvedValueOnce(reply({ userId: "u1", curriculumId: "cur-1" }))
      .mockResolvedValueOnce(reply([{ subjectId: "s1" }, { subjectId: "s2" }]));
    expect(await getMyCurriculumSubjectIds()).toEqual(["s1", "s2"]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/me$/);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/StudentProfiles\/u1$/);
    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/Curriculums\/cur-1\/subjects$/);

    // No curriculum: nothing to ask about, and no second request.
    const lone = vi.spyOn(globalThis, "fetch");
    lone.mockClear();
    lone
      .mockResolvedValueOnce(reply({ userId: "u1", fullName: null, email: null, role: "Student" }))
      .mockResolvedValueOnce(reply({ userId: "u1", curriculumId: null }));
    expect(await getMyCurriculumSubjectIds()).toBeNull();
    expect(lone).toHaveBeenCalledTimes(2);
  });
});

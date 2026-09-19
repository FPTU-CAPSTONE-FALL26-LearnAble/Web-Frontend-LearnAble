import {
  getMaterials,
  getQuestion,
  getQuestions,
  getSemesters,
  getSubjects,
  getTopics,
  queryString,
} from "./lecturer";
import { tokenStore } from "@/lib/auth/tokenStore";
const page = {
  pageNumber: 1,
  pageSize: 10,
  totalCount: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};
const question = {
  questionId: "q1",
  topicId: "t1",
  createdBy: "lecturer",
  content: "Explain routing.",
  questionType: "Single",
  difficulty: "Easy",
  defaultScore: 1,
  status: "Active",
  createdAt: "2026-09-15",
};
const response = (items: unknown[]) =>
  new Response(
    JSON.stringify({ success: true, data: { items, ...page }, errors: null }),
    { status: 200 },
  );
describe("Lecturer read API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tokenStore.clear();
  });
  it("encodes only documented non-empty filters", () => {
    expect(
      queryString({
        SearchTerm: "API & routing",
        TopicId: undefined,
        CreatedBy: "lecturer",
        PageNumber: 2,
      }),
    ).toBe("?SearchTerm=API+%26+routing&CreatedBy=lecturer&PageNumber=2");
  });
  it("parses questions and uses the session without a write", async () => {
    tokenStore.set(
      {
        accessToken: "access",
        refreshToken: "refresh",
        accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      },
      false,
    );
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response([question]));
    expect(
      (await getQuestions({ CreatedBy: "lecturer", Status: "Active" })).items[0]
        .questionId,
    ).toBe("q1");
    expect(spy.mock.calls[0][0]).toBe(
      "/api/v1/Questions?CreatedBy=lecturer&Status=Active",
    );
    expect(spy.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer access",
    });
    expect(spy.mock.calls[0][1]?.method).toBeUndefined();
    expect(spy.mock.calls[0][1]?.body).toBeUndefined();
  });
  it("preserves missing accessibility information in materials", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response([
          {
            materialId: "m1",
            topicId: null,
            uploadedBy: "lecturer",
            title: "Lecture",
            materialType: "PDF",
            fileUrl: null,
            fileName: null,
            fileSizeBytes: null,
            ocrStatus: "Done",
            status: "Published",
            uploadedAt: "2026-09-15",
          },
        ]),
      );
    expect(
      (await getMaterials({ UploadedBy: "lecturer", OcrStatus: "Done" }))
        .items[0].isTtsReady,
    ).toBeUndefined();
    expect(spy.mock.calls[0][0]).toContain(
      "UploadedBy=lecturer&OcrStatus=Done",
    );
  });
  it("reads English subjects and exact topic fields", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response([
          {
            subjectId: "s1",
            subjectCode: "SWE201",
            subjectNameEn: "Software Engineering",
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([{ topicId: "t1", subjectId: "s1", topicName: "Routing" }]),
      );
    expect((await getSubjects()).items[0].subjectNameEn).toBe(
      "Software Engineering",
    );
    expect((await getTopics({ SubjectId: "s1" })).items[0].topicName).toBe(
      "Routing",
    );
    expect(spy.mock.calls[1][0]).toContain("SubjectId=s1");
  });
  it("normalizes nullable Swagger fields and reads detail and semesters", async () => {
    const nullableQuestion = {
      ...question,
      content: null,
      questionType: null,
      difficulty: null,
      status: null,
      options: [
        { optionId: "o1", content: null, isCorrect: false, displayOrder: 1 },
      ],
    };
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: nullableQuestion })),
      )
      .mockResolvedValueOnce(
        response([
          {
            semesterId: "sem1",
            semesterCode: null,
            semesterName: null,
            academicYear: null,
            startDate: "2026-01-01",
            endDate: "2026-04-30",
            status: null,
          },
        ]),
      );
    const detail = await getQuestion("q1");
    expect(detail).toMatchObject({
      content: "Not available",
      questionType: "Not available",
      status: "Not available",
    });
    expect(detail.options[0].content).toBe("Not available");
    expect(spy.mock.calls[0][0]).toBe("/api/v1/Questions/q1");
    const semesters = await getSemesters();
    expect(semesters.items[0]).toMatchObject({
      semesterName: "Not available",
      academicYear: "Not available",
    });
    expect(spy.mock.calls[1][0]).toContain(
      "/api/v1/Semesters?PageNumber=1&PageSize=100&SortBy=-startDate",
    );
  });
  it("handles empty pages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response([]));
    expect((await getQuestions({})).items).toEqual([]);
  });
  it("rejects success false without fixture fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, data: null })),
    );
    await expect(getQuestions({})).rejects.toMatchObject({
      detail: { kind: "server" },
    });
  });
  it("rejects malformed fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response([{ questionId: "bad" }]),
    );
    await expect(getQuestions({})).rejects.toMatchObject({
      detail: { kind: "parse" },
    });
  });
  it("preserves unauthorized and server failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(getQuestions({})).rejects.toMatchObject({
      detail: { kind: "unauthorized" },
    });
    await expect(getMaterials({})).rejects.toMatchObject({
      detail: { kind: "server", status: 500 },
    });
  });
  it("preserves not found failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    await expect(getQuestion("missing")).rejects.toMatchObject({
      detail: { kind: "not_found" },
    });
  });
  it("reports network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    await expect(getQuestions({})).rejects.toMatchObject({
      detail: { kind: "network" },
    });
  });
});

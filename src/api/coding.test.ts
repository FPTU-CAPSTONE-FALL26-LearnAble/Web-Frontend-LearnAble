import { getCodingLanguages } from "@/api/coding";

const respond = (body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 }),
  );

describe("coding runtime API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts the standard Backend envelope", async () => {
    respond({ success: true, message: null, errors: null, data: ["python3", "java"] });
    await expect(getCodingLanguages()).resolves.toEqual(["python3", "java"]);
  });

  it("accepts the undocumented plain array response and removes empty duplicates", async () => {
    respond([" python3 ", "python3", "", "cpp"]);
    await expect(getCodingLanguages()).resolves.toEqual(["python3", "cpp"]);
  });
});

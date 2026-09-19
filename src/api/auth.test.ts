import { getCurrentUser, login } from "@/api/auth";

describe("auth API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses the live login envelope and sends the documented body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, message: "Signed in", data: { accessToken: "access", refreshToken: "refresh", accessTokenExpiresAt: "2026-09-14T08:00:00Z" }, errors: null }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(login({ identifier: "user@fpt.edu.vn", password: "secret" })).resolves.toMatchObject({ accessToken: "access", refreshToken: "refresh" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ identifier: "user@fpt.edu.vn", password: "secret" });
  });

  it("rejects success false and HTTP 401 as unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: "No", data: null, errors: [] }), { status: 200, headers: { "Content-Type": "application/json" } })).mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(login({ identifier: "user", password: "wrong" })).rejects.toMatchObject({ detail: { kind: "unauthorized" } });
    await expect(getCurrentUser()).rejects.toMatchObject({ detail: { kind: "unauthorized" } });
  });

  it("maps network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    await expect(login({ identifier: "user", password: "secret" })).rejects.toMatchObject({ detail: { kind: "network" } });
  });
  it("uses the local API proxy and preserves backend HTTP 500", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    await expect(login({ identifier: "LEC0001", password: "123" })).rejects.toMatchObject({ detail: { kind: "server", status: 500 } });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/login");
  });
});

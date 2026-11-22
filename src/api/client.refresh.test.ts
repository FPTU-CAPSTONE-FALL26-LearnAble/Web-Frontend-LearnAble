import { z } from "zod";
import { tokenStore } from "@/lib/auth/tokenStore";
import { ApiFailure, request, SESSION_EXPIRED_EVENT } from "./client";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const tokens = (accessToken: string, refreshToken = "refresh-1") => ({
  accessToken,
  refreshToken,
  accessTokenExpiresAt: "2026-11-16T10:00:00Z",
});
const renewed = () =>
  json(200, { success: true, message: null, data: tokens("access-2", "refresh-2"), errors: null });
const authorization = (call: unknown[]) =>
  (call[1] as RequestInit).headers as Record<string, string>;

describe("session renewal", () => {
  const expired = vi.fn();
  beforeEach(() => {
    tokenStore.set(tokens("access-1"), true);
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
  });
  afterEach(() => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
    expired.mockReset();
    tokenStore.clear();
    vi.restoreAllMocks();
  });

  it("renews an expired access token and repeats the request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(renewed())
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(request("/me/exam-schedules", z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh-token$/);
    expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))).toEqual({ refreshToken: "refresh-1" });
    expect(authorization(fetchMock.mock.calls[2]).Authorization).toBe("Bearer access-2");
    expect(tokenStore.get()).toBe("access-2");
    expect(tokenStore.getRefreshToken()).toBe("refresh-2");
    expect(localStorage.getItem("learnable.auth.tokens")).toContain("access-2");
    expect(expired).not.toHaveBeenCalled();
  });

  it("spends the refresh token once when several requests expire together", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/auth/refresh-token")) return renewed();
      const sent = (init?.headers as Record<string, string>).Authorization;
      return sent === "Bearer access-2" ? json(200, { ok: true }) : json(401, {});
    });
    await Promise.all([
      request("/me/notifications", z.object({ ok: z.boolean() })),
      request("/me/notifications/unread-count", z.object({ ok: z.boolean() })),
      request("/me/exam-schedules", z.object({ ok: z.boolean() })),
    ]);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/auth/refresh-token"))).toHaveLength(1);
  });

  it("ends the session when it cannot be renewed", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, { success: false, message: "Refresh token expired." }));
    const error = await request("/me/exam-schedules", z.object({})).catch((e) => e);
    expect(error).toBeInstanceOf(ApiFailure);
    expect(error.detail.kind).toBe("unauthorized");
    expect(tokenStore.get()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("does not try to renew a failed sign-in or a request sent without a token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(401, {}));
    await request("/auth/login", z.object({}), { method: "POST", json: {} }).catch(() => undefined);
    tokenStore.clear();
    await request("/me/exam-schedules", z.object({})).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(expired).not.toHaveBeenCalled();
  });
});

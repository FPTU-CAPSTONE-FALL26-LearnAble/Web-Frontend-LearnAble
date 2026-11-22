import { tokenStore, type AuthTokens } from "@/lib/auth/tokenStore";

const tokens: AuthTokens = { accessToken: "access", refreshToken: "refresh", accessTokenExpiresAt: "2026-09-14T08:00:00Z" };

describe("tokenStore", () => {
  beforeEach(() => tokenStore.clear());

  it("persists remembered sessions in localStorage", () => {
    tokenStore.set(tokens, true);
    expect(localStorage.getItem("learnable.auth.tokens")).toContain("access");
    expect(tokenStore.getRefreshToken()).toBe("refresh");
  });

  it("keeps non-remembered sessions in sessionStorage", () => {
    tokenStore.set(tokens, false);
    expect(localStorage.getItem("learnable.auth.tokens")).toBeNull();
    expect(sessionStorage.getItem("learnable.auth.tokens")).toContain("access");
  });
});

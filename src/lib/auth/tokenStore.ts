/**
 * Quyết định 6 (§10): TokenStore là interface, không phải quyết định lưu trữ.
 * Bản localStorage chạy trước; nếu backend chốt httpOnly cookie thì thay MỘT file này.
 * Desktop dùng safeStorage của Electron sau cùng interface này.
 */
export interface TokenStore {
  get(): string | null;
  getRefreshToken(): string | null;
  set(tokens: AuthTokens, remember: boolean): void;
  clear(): void;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

const KEY = "learnable.auth.tokens";

function readTokens(): AuthTokens | null {
  const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export const tokenStore: TokenStore = {
  get: () => readTokens()?.accessToken ?? null,
  getRefreshToken: () => readTokens()?.refreshToken ?? null,
  set: (tokens, remember) => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    const target = remember ? localStorage : sessionStorage;
    target.setItem(KEY, JSON.stringify(tokens));
  },
  clear: () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  },
};

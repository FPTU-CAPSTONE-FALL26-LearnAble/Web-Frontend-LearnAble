/**
 * Quyết định 6 (§10): TokenStore là interface, không phải quyết định lưu trữ.
 * Bản localStorage chạy trước; nếu backend chốt httpOnly cookie thì thay MỘT file này.
 * Desktop dùng safeStorage của Electron sau cùng interface này.
 */
export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

const KEY = "learnable.auth.token";

export const tokenStore: TokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (token) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
};

import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import type { AuthTokens } from "@/lib/auth/tokenStore";

/** API-01 — POST /auth/login */

/**
 * `universityId` / `isSuperAdmin` scope tenant-owned writes. They are optional
 * so a user persisted before multi-tenancy still parses until the next login.
 */
export const userSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.string(),
  universityId: z.string().optional(),
  isSuperAdmin: z.boolean().optional(),
});
export type User = z.infer<typeof userSchema>;

const authTokensSchema = z.object({
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  accessTokenExpiresAt: z.string(),
});

const authResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
  data: authTokensSchema.nullable(),
  errors: z.array(z.string()).nullable(),
});

const currentUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
  data: z.object({
    universityId: z.string().optional(),
    isSuperAdmin: z.boolean().optional(),
    userId: z.string(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string().nullable(),
  }).nullable(),
  errors: z.array(z.string()).nullable(),
});

export async function login(body: { identifier: string; password: string }): Promise<AuthTokens> {
  const response = await request("/auth/login", authResponseSchema, { method: "POST", json: body });
  if (!response.success || !response.data?.accessToken || !response.data.refreshToken) {
    throw new ApiFailure({ kind: "unauthorized" });
  }
  return {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
    accessTokenExpiresAt: response.data.accessTokenExpiresAt,
  };
}

export async function getCurrentUser(): Promise<User> {
  const response = await request("/auth/me", currentUserResponseSchema);
  if (!response.success || !response.data) throw new ApiFailure({ kind: "unauthorized" });
  return {
    id: response.data.userId,
    fullName: response.data.fullName ?? "LearnAble user",
    email: response.data.email ?? "",
    role: response.data.role ?? "User",
    universityId: response.data.universityId,
    isSuperAdmin: response.data.isSuperAdmin ?? false,
  };
}

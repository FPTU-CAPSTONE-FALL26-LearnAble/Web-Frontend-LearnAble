import { z } from "zod";
import { request } from "@/api/client";

/** API-01 — POST /auth/login */

export const userSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.literal("student"),
});
export type User = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export function login(body: { email: string; password: string }): Promise<LoginResponse> {
  return request("/auth/login", loginResponseSchema, { method: "POST", json: body });
}

import { z } from "zod";
import { tokenStore } from "@/lib/auth/tokenStore";

/**
 * Client HTTP duy nhất của repo web. Lỗi là discriminated union có kiểu —
 * KHÔNG lỗi im lặng: QueryCache trong providers.tsx announce mọi lỗi (§10).
 */

export type ApiError =
  | { kind: "network" }
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "server"; status: number }
  | { kind: "parse" };

export class ApiFailure extends Error {
  constructor(public readonly detail: ApiError) {
    super(`api:${detail.kind}`);
    this.name = "ApiFailure";
  }
}

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://54.79.78.167:8080/api/v1";

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const token = tokenStore.get();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiFailure({ kind: "network" });
  }

  if (!res.ok) {
    if (res.status === 401) throw new ApiFailure({ kind: "unauthorized" });
    if (res.status === 404) throw new ApiFailure({ kind: "not_found" });
    throw new ApiFailure({ kind: "server", status: res.status });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiFailure({ kind: "parse" });
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiFailure({ kind: "parse" });
  return parsed.data;
}

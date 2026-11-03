import { z } from "zod";
import { tokenStore } from "@/lib/auth/tokenStore";
import { getDemoApiResponse } from "@/lib/demoData";

/**
 * Client HTTP duy nhất của repo web. Lỗi là discriminated union có kiểu —
 * KHÔNG lỗi im lặng: QueryCache trong providers.tsx announce mọi lỗi (§10).
 */

export type ApiError =
  | { kind: "network" }
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "server"; status: number; message?: string; errors?: string[] }
  | { kind: "parse" };

export class ApiFailure extends Error {
  constructor(public readonly detail: ApiError) {
    super(`api:${detail.kind}`);
    this.name = "ApiFailure";
  }
}

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export async function request<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  init?: RequestInit & { json?: unknown },
): Promise<z.output<TSchema>> {
  const demoResponse = getDemoApiResponse(path, init);
  if (demoResponse !== undefined) {
    const parsed = schema.safeParse(demoResponse);
    if (!parsed.success) throw new ApiFailure({ kind: "parse" });
    return parsed.data;
  }

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
    let serverMessage: string | undefined;
    let serverErrors: string[] | undefined;
    try {
      const payload = await res.clone().json() as { message?: unknown; errors?: unknown };
      if (typeof payload.message === "string") serverMessage = payload.message;
      if (Array.isArray(payload.errors)) serverErrors = payload.errors.filter((item): item is string => typeof item === "string");
    } catch {
      // Some server failures intentionally return an empty body.
    }
    throw new ApiFailure({ kind: "server", status: res.status, message: serverMessage, errors: serverErrors });
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

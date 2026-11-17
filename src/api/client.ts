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
  | { kind: "server"; status: number; message?: string; errors?: string[] }
  | { kind: "parse" };

export class ApiFailure extends Error {
  constructor(
    public readonly detail: ApiError,
    /** The backend's own explanation, shown to the user when it sent one. */
    public readonly serverMessage?: string,
  ) {
    super(`api:${detail.kind}`);
    this.name = "ApiFailure";
  }
}

const errorBodySchema = z.object({
  message: z.string().nullish(),
  errors: z.array(z.string()).nullish(),
});

/**
 * Readable text from the `{ message, errors }` envelope. `errors` carries the
 * specifics ("PageNumber: The value 'abc' is not valid"), so it is kept with
 * the summary in `message`.
 */
export function apiMessage(body: unknown): string | undefined {
  const parsed = errorBodySchema.safeParse(body);
  if (!parsed.success) return undefined;
  const message = parsed.data.message?.trim() ?? "";
  const errors = (parsed.data.errors ?? [])
    .map((error) => error.trim())
    .filter(Boolean)
    .join("; ");
  if (!message || !errors) return message || errors || undefined;
  return `${message}${/[.!?]$/.test(message) ? "" : ":"} ${errors}`;
}

/** A 200 response whose envelope reports `success: false` or no data. */
export const envelopeFailure = (body: unknown) =>
  new ApiFailure({ kind: "server", status: 200 }, apiMessage(body));

async function errorMessage(res: Response): Promise<string | undefined> {
  try {
    return apiMessage(await res.json());
  } catch {
    return undefined;
  }
}

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/** Fired on `window` when the session can no longer be renewed; the auth guard signs the user out. */
export const SESSION_EXPIRED_EVENT = "learnable:session-expired";

const refreshResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      accessToken: z.string().nullish(),
      refreshToken: z.string().nullish(),
      accessTokenExpiresAt: z.string(),
    })
    .nullish(),
});

let refreshing: Promise<boolean> | null = null;

/**
 * POST /auth/refresh-token. Requests that fail together share one refresh, so
 * the refresh token is spent only once.
 */
function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const parsed = refreshResponseSchema.safeParse(await res.json());
      const data = parsed.success && parsed.data.success ? parsed.data.data : null;
      if (!data?.accessToken) return false;
      tokenStore.update({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
      });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Sends a request with the access token. A 401 on a signed-in request means the
 * access token expired: it is renewed once and the request repeated. When the
 * session cannot be renewed the tokens are dropped and the app is told.
 */
async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
  const send = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  const token = tokenStore.get();
  const res = await send(token);
  // A 401 from sign-in itself means wrong credentials, not an expired session.
  if (res.status !== 401 || !token || path === "/auth/login") return res;
  // Another request may already have renewed the session while this one was in flight.
  const current = tokenStore.get();
  if (current && current !== token) return send(current);
  if (await refreshSession()) return send(tokenStore.get());
  tokenStore.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return res;
}

export async function request<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  init?: RequestInit & { json?: unknown },
): Promise<z.output<TSchema>> {
  const { json, ...rest } = init ?? {};

  let res: Response;
  try {
    res = await authorizedFetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiFailure({ kind: "network" });
  }

  if (!res.ok) {
    const message = await errorMessage(res);
    if (res.status === 401)
      throw new ApiFailure({ kind: "unauthorized" }, message);
    if (res.status === 404)
      throw new ApiFailure({ kind: "not_found" }, message);
    throw new ApiFailure({ kind: "server", status: res.status }, message);
  }

  let data: unknown;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiFailure({ kind: "parse" });
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiFailure({ kind: "parse" });
  return parsed.data;
}

export async function requestBlob(
  path: string,
  init?: RequestInit,
): Promise<{ blob: Blob; fileName: string | null }> {
  let res: Response;
  try {
    res = await authorizedFetch(path, init ?? {});
  } catch {
    throw new ApiFailure({ kind: "network" });
  }
  if (!res.ok) {
    const message = await errorMessage(res);
    if (res.status === 401)
      throw new ApiFailure({ kind: "unauthorized" }, message);
    if (res.status === 404)
      throw new ApiFailure({ kind: "not_found" }, message);
    throw new ApiFailure({ kind: "server", status: res.status }, message);
  }
  const disposition = res.headers.get("Content-Disposition");
  const fileName = disposition?.match(
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i,
  )?.[1];
  return {
    blob: await res.blob(),
    fileName: fileName ? decodeURIComponent(fileName) : null,
  };
}

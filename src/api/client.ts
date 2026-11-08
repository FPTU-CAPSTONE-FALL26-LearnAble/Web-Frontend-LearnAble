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
    const message = await errorMessage(res);
    if (res.status === 401)
      throw new ApiFailure({ kind: "unauthorized" }, message);
    if (res.status === 404)
      throw new ApiFailure({ kind: "not_found" }, message);
    throw new ApiFailure({ kind: "server", status: res.status }, message);
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

export async function requestBlob(
  path: string,
  init?: RequestInit,
): Promise<{ blob: Blob; fileName: string | null }> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
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
  const disposition = res.headers.get("Content-Disposition");
  const fileName = disposition?.match(
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i,
  )?.[1];
  return {
    blob: await res.blob(),
    fileName: fileName ? decodeURIComponent(fileName) : null,
  };
}

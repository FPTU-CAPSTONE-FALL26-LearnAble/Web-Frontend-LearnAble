import { z } from "zod";
import { ApiFailure, envelopeFailure, request } from "@/api/client";

/**
 * Exam hand-gesture configuration (FR-47 · FFCB-284), served by the backend
 * under `/api/v1/gesture-configurations`:
 *
 *   GET  /gesture-configurations/current       the configuration in force (ETag)
 *   PUT  /gesture-configurations/current       Admin; full body + If-Match → new version
 *   GET  /gesture-configurations/catalog       supported gestures and exam actions
 *   GET  /gesture-configurations/edit-status   Admin; locked while exams are running
 *   GET  /gesture-configurations?Page=&PageSize=  Admin; version history
 *   GET  /gesture-configurations/{version}     one historical version
 *
 * One configuration applies to the whole system. The API is keyed by gesture
 * (a gesture appears at most once per version); the admin screen is keyed by
 * action — see `features/admin/gestures/gestureModel.ts`.
 */

export type GestureCode = { code: string; name: string; description: string | null };
export type GestureCatalog = { gestures: GestureCode[]; actions: GestureCode[] };

export type PreferredHand = "Left" | "Right" | "Either";
export const preferredHands: readonly PreferredHand[] = ["Left", "Right", "Either"];

export type GestureBinding = {
  /** null for bindings created in the UI and not saved yet. */
  bindingId: string | null;
  gestureCode: string;
  actionCode: string;
  isEnabled: boolean;
};

export type GestureSettings = {
  isEnabled: boolean;
  preferredHand: PreferredHand;
  /** 0..1, at most 4 decimals. */
  confidenceThreshold: number;
  /** 0..10000 ms. */
  holdDurationMs: number;
  /** 0..60000 ms. */
  cooldownMs: number;
  requireRelease: boolean;
};

export type GestureConfig = GestureSettings & {
  settingId: string;
  version: number;
  updatedAt: string | null;
  bindings: GestureBinding[];
  /** If-Match value, built with `gestureETag(settingId, version)`. */
  eTag: string;
};

export type GestureConfigBody = GestureSettings & {
  bindings: Pick<GestureBinding, "gestureCode" | "actionCode" | "isEnabled">[];
};

export type GestureBlockingReason = "OPEN_EXAM_SCHEDULES" | "ACTIVE_ATTEMPTS" | (string & {});
export type GestureEditStatus = {
  canEdit: boolean;
  openScheduleCount: number;
  activeAttemptCount: number;
  blockingReasons: GestureBlockingReason[];
};

export type GestureVersion = {
  settingId: string;
  version: number;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
  bindingCount: number;
};

export type GestureHistoryPage = {
  items: GestureVersion[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: data.nullable().optional(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data === null || response.data === undefined) {
    throw envelopeFailure(response);
  }
  return response.data as T;
}

const BASE = "/gesture-configurations";

const codeSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const catalogSchema = z.object({
  gestures: z.array(codeSchema).nullable().optional(),
  actions: z.array(codeSchema).nullable().optional(),
});

const bindingSchema = z.object({
  bindingId: z.string().nullable().optional(),
  gestureCode: z.string().nullable().optional(),
  actionCode: z.string().nullable().optional(),
  isEnabled: z.boolean().nullable().optional(),
});

const configSchema = z.object({
  settingId: z.string(),
  version: z.number(),
  isEnabled: z.boolean(),
  preferredHand: z.string().nullable().optional(),
  confidenceThreshold: z.number(),
  holdDurationMs: z.number(),
  cooldownMs: z.number(),
  requireRelease: z.boolean(),
  updatedAt: z.string().nullable().optional(),
  bindings: z.array(bindingSchema).nullable().optional(),
});

const editStatusSchema = z.object({
  canEdit: z.boolean(),
  openScheduleCount: z.number().nullable().optional(),
  activeAttemptCount: z.number().nullable().optional(),
  blockingReasons: z.array(z.string()).nullable().optional(),
});

const versionSchema = z.object({
  settingId: z.string(),
  version: z.number(),
  isEnabled: z.boolean(),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  bindingCount: z.number().nullable().optional(),
});

const historySchema = z.object({
  items: z.array(versionSchema).nullable().optional(),
  pageNumber: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

/**
 * The If-Match value for a version. `request()` does not expose response
 * headers, so this rebuilds the backend's ETag, which is deterministic:
 * `"gesture-{settingId:N}-{version}"` (N = 32 lowercase hex digits, no dashes).
 */
export const gestureETag = (settingId: string, version: number): string =>
  `"gesture-${settingId.replace(/-/g, "").toLowerCase()}-${version}"`;

const toCodes = (rows: z.infer<typeof codeSchema>[] | null | undefined): GestureCode[] =>
  (rows ?? [])
    .filter((row) => !!row.code)
    .map((row) => ({
      code: row.code!,
      name: row.name?.trim() || row.code!,
      description: row.description?.trim() || null,
    }));

const toHand = (value: string | null | undefined): PreferredHand =>
  preferredHands.find((hand) => hand.toLowerCase() === value?.trim().toLowerCase()) ?? "Either";

const toConfig = (row: z.infer<typeof configSchema>): GestureConfig => ({
  settingId: row.settingId,
  version: row.version,
  isEnabled: row.isEnabled,
  preferredHand: toHand(row.preferredHand),
  confidenceThreshold: row.confidenceThreshold,
  holdDurationMs: row.holdDurationMs,
  cooldownMs: row.cooldownMs,
  requireRelease: row.requireRelease,
  updatedAt: row.updatedAt ?? null,
  bindings: (row.bindings ?? [])
    .filter((binding) => !!binding.gestureCode && !!binding.actionCode)
    .map((binding) => ({
      bindingId: binding.bindingId ?? null,
      gestureCode: binding.gestureCode!,
      actionCode: binding.actionCode!,
      isEnabled: binding.isEnabled ?? true,
    })),
  eTag: gestureETag(row.settingId, row.version),
});

/** GET /gesture-configurations/catalog */
export async function getGestureCatalog(): Promise<GestureCatalog> {
  const data = await call(`${BASE}/catalog`, catalogSchema);
  return { gestures: toCodes(data.gestures), actions: toCodes(data.actions) };
}

/** GET /gesture-configurations/current */
export async function getGestureConfig(): Promise<GestureConfig> {
  return toConfig(await call(`${BASE}/current`, configSchema));
}

/** GET /gesture-configurations/{version} */
export async function getGestureConfigVersion(version: number): Promise<GestureConfig> {
  return toConfig(await call(`${BASE}/${encodeURIComponent(String(version))}`, configSchema));
}

/** GET /gesture-configurations/edit-status (Admin) */
export async function getGestureEditStatus(): Promise<GestureEditStatus> {
  const data = await call(`${BASE}/edit-status`, editStatusSchema);
  return {
    canEdit: data.canEdit,
    openScheduleCount: data.openScheduleCount ?? 0,
    activeAttemptCount: data.activeAttemptCount ?? 0,
    blockingReasons: data.blockingReasons ?? [],
  };
}

/** GET /gesture-configurations?Page=&PageSize= (Admin), newest first. */
export async function getGestureHistory(page: number, pageSize: number): Promise<GestureHistoryPage> {
  const params = new URLSearchParams({
    Page: String(Math.max(1, Math.floor(page))),
    PageSize: String(Math.min(100, Math.max(1, Math.floor(pageSize)))),
  });
  const data = await call(`${BASE}?${params}`, historySchema);
  return {
    items: (data.items ?? []).map((row) => ({
      settingId: row.settingId,
      version: row.version,
      isEnabled: row.isEnabled,
      updatedBy: row.updatedBy ?? null,
      updatedAt: row.updatedAt ?? null,
      bindingCount: row.bindingCount ?? 0,
    })),
    pageNumber: data.pageNumber,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
}

/**
 * PUT /gesture-configurations/current (Admin). Every field is required. The
 * backend answers with the new version, or the same version when nothing changed.
 */
export async function saveGestureConfig(body: GestureConfigBody, eTag: string): Promise<GestureConfig> {
  return toConfig(
    await call(`${BASE}/current`, configSchema, {
      method: "PUT",
      json: body,
      headers: { "If-Match": eTag },
    }),
  );
}

export type GestureSaveError = "locked" | "stale" | "invalid" | "forbidden" | "other";

/** Why a save failed, so the screen can choose what to say and what to refetch. */
export function gestureSaveError(error: unknown): GestureSaveError {
  if (!(error instanceof ApiFailure) || error.detail.kind !== "server") return "other";
  switch (error.detail.status) {
    case 409:
      return "locked";
    case 412:
    case 428:
      return "stale";
    case 400:
      return "invalid";
    case 403:
      return "forbidden";
    default:
      return "other";
  }
}

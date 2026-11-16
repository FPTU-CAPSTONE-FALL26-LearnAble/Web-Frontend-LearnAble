import { z } from "zod";
import { envelopeFailure, request } from "@/api/client";

/**
 * Exam keyboard shortcuts (FR-52 · FFCB-296), as deployed under the
 * `MyShortcuts` tag of the OpenAPI document:
 *
 *   GET    /me/shortcuts/catalog       actions and the rules for combinations
 *   GET    /me/shortcuts               the configured shortcuts
 *   POST   /me/shortcuts               bind an action that has no shortcut yet
 *   GET    /me/shortcuts/{shortcutId}
 *   PUT    /me/shortcuts/{shortcutId}  optimistic concurrency through If-Match
 *   DELETE /me/shortcuts/{shortcutId}  optimistic concurrency through If-Match
 *
 * Each shortcut is saved on its own; there is no batch or publish step. The
 * backend owns the business rules (unique combinations, no change while an
 * exam session is running) and explains a refusal in the response envelope.
 */

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

const shortcutActionSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const shortcutCatalogSchema = z.object({
  actions: z.array(shortcutActionSchema).nullable().optional(),
  keyCodes: z.array(z.string()).nullable().optional(),
  modifierOrder: z.array(z.string()).nullable().optional(),
  reservedCombinations: z.array(z.string()).nullable().optional(),
  requiresControlAltOrMeta: z.boolean().optional(),
});

const shortcutSchema = z.object({
  shortcutId: z.string(),
  actionCode: z.string().nullable().optional(),
  keyCombination: z.string().nullable().optional(),
  isEnabled: z.boolean(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  eTag: z.string().nullable().optional(),
});

export type ShortcutAction = {
  code: string;
  name: string;
  description: string | null;
};

export type ShortcutCatalog = {
  actions: ShortcutAction[];
  /** Key names the exam app can bind; empty when the backend does not restrict them. */
  keyCodes: string[];
  /** Modifier names in the order the backend writes them. */
  modifierOrder: string[];
  reservedCombinations: string[];
  requiresControlAltOrMeta: boolean;
};

export type Shortcut = {
  shortcutId: string;
  actionCode: string;
  keyCombination: string;
  isEnabled: boolean;
  updatedAt: string | null;
  /** Sent back as `If-Match` so a stale edit is refused instead of overwriting. */
  eTag: string | null;
};

export type ShortcutBody = {
  actionCode: string;
  keyCombination: string;
  isEnabled: boolean;
};

const toShortcut = (row: z.infer<typeof shortcutSchema>): Shortcut => ({
  shortcutId: row.shortcutId,
  actionCode: row.actionCode ?? "",
  keyCombination: row.keyCombination ?? "",
  isEnabled: row.isEnabled,
  updatedAt: row.updatedAt ?? null,
  eTag: row.eTag ?? null,
});

const ifMatch = (eTag: string | null): HeadersInit | undefined =>
  eTag ? { "If-Match": eTag } : undefined;

/** GET /me/shortcuts/catalog */
export async function getShortcutCatalog(): Promise<ShortcutCatalog> {
  const data = await call("/me/shortcuts/catalog", shortcutCatalogSchema);
  return {
    actions: (data.actions ?? [])
      .filter((action) => !!action.code)
      .map((action) => ({
        code: action.code!,
        name: action.name?.trim() || action.code!,
        description: action.description?.trim() || null,
      })),
    keyCodes: data.keyCodes ?? [],
    modifierOrder: data.modifierOrder ?? [],
    reservedCombinations: data.reservedCombinations ?? [],
    requiresControlAltOrMeta: data.requiresControlAltOrMeta ?? false,
  };
}

/** GET /me/shortcuts */
export async function getShortcuts(): Promise<Shortcut[]> {
  const rows = await call("/me/shortcuts", z.array(shortcutSchema));
  return rows.map(toShortcut);
}

/** POST /me/shortcuts */
export async function createShortcut(body: ShortcutBody): Promise<Shortcut> {
  return toShortcut(
    await call("/me/shortcuts", shortcutSchema, { method: "POST", json: body }),
  );
}

/** PUT /me/shortcuts/{shortcutId} */
export async function updateShortcut(
  shortcutId: string,
  body: ShortcutBody,
  eTag: string | null,
): Promise<Shortcut> {
  return toShortcut(
    await call(`/me/shortcuts/${encodeURIComponent(shortcutId)}`, shortcutSchema, {
      method: "PUT",
      json: body,
      headers: ifMatch(eTag),
    }),
  );
}

/** DELETE /me/shortcuts/{shortcutId} — the envelope carries no data. */
export async function deleteShortcut(
  shortcutId: string,
  eTag: string | null,
): Promise<void> {
  const response = await request(
    `/me/shortcuts/${encodeURIComponent(shortcutId)}`,
    envelope(z.unknown()),
    { method: "DELETE", headers: ifMatch(eTag) },
  );
  if (!response.success) throw envelopeFailure(response);
}

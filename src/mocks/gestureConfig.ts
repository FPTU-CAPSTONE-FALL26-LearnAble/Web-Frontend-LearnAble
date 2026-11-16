import { HttpResponse, delay, http } from "msw";
import { gestureETag, type GestureConfigBody } from "@/api/gestureConfig";

/**
 * Offline stand-in for `/gesture-configurations` (see `src/api/gestureConfig.ts`),
 * used only when `VITE_USE_MSW=true`. Mirrors the backend's rules: full body,
 * If-Match required, one gesture per version, locked while exams run.
 *
 * To demo the locked state from the browser console:
 *   (await import("/src/mocks/gestureConfig.ts")).setGestureMockLock(["ACTIVE_ATTEMPTS"])
 */

const ok = <T,>(data: T, headers?: HeadersInit) =>
  HttpResponse.json({ success: true, message: null, data, errors: null }, { headers });
const fail = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, message, data: null, errors: [code] }, { status });

// Names and descriptions copied from the backend's GestureCatalog and InputActionCatalog.
const catalog = {
  gestures: [
    { code: "ONE_FINGER", name: "One finger", description: "Extend only the index finger; fold the other fingers and thumb." },
    { code: "TWO_FINGERS", name: "Two fingers", description: "Extend the index and middle fingers; fold the ring finger, little finger and thumb." },
    { code: "THREE_FINGERS", name: "Three fingers", description: "Extend the index, middle and ring fingers; fold the little finger and thumb." },
    { code: "FOUR_FINGERS", name: "Four fingers", description: "Extend all four fingers and fold the thumb." },
    { code: "OPEN_PALM", name: "Open palm", description: "Extend all five digits with the palm visible." },
    { code: "CLOSED_FIST", name: "Closed fist", description: "Fold all fingers and the thumb into a closed fist." },
    { code: "THUMB_UP", name: "Thumb up", description: "Extend the thumb upward while folding all four fingers." },
    { code: "THUMB_DOWN", name: "Thumb down", description: "Extend the thumb downward while folding all four fingers." },
    { code: "PINCH", name: "Pinch", description: "Bring thumb and index fingertips together; fold the other three fingers." },
  ],
  actions: [
    { code: "TOGGLE_OPTION_A", name: "Toggle option A", description: "Toggle the first displayed option of the current question; use the attempt option ID after shuffling." },
    { code: "TOGGLE_OPTION_B", name: "Toggle option B", description: "Toggle the second displayed option of the current question; use the attempt option ID after shuffling." },
    { code: "TOGGLE_OPTION_C", name: "Toggle option C", description: "Toggle the third displayed option of the current question; use the attempt option ID after shuffling." },
    { code: "TOGGLE_OPTION_D", name: "Toggle option D", description: "Toggle the fourth displayed option of the current question; use the attempt option ID after shuffling." },
    { code: "READ_FOCUSED_CONTENT", name: "Read focused content", description: "Read the accessible content of the current focus without activating it." },
    { code: "TOGGLE_AUDIO_PLAYBACK", name: "Pause or resume audio", description: "Pause or resume the current audio playback without selecting an answer." },
    { code: "NEXT_ITEM", name: "Focus next item", description: "Move focus to the next available item and announce it; do not activate it." },
    { code: "PREVIOUS_ITEM", name: "Focus previous item", description: "Move focus to the previous available item and announce it; do not activate it." },
    { code: "ACTIVATE_FOCUSED_ITEM", name: "Activate focused item", description: "Activate the available focused control. Submission must use a separate safe confirmation step." },
  ],
};

const SETTING_ID = "9a000000-0000-0000-0000-000000000001";
/** Stands in for the signed-in admin; the history resolves it with getAdminUser. */
const MOCK_ADMIN_ID = "00000000-0000-0000-0000-0000000000a1";

type Binding = { bindingId: string; gestureCode: string; actionCode: string; isEnabled: boolean };
type Version = Omit<GestureConfigBody, "bindings"> & {
  settingId: string;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  bindings: Binding[];
};

const seed: Version = {
  settingId: SETTING_ID,
  version: 1,
  isEnabled: false,
  preferredHand: "Either",
  confidenceThreshold: 0.8,
  holdDurationMs: 800,
  cooldownMs: 500,
  requireRelease: true,
  updatedAt: "2026-11-08T03:56:24Z",
  updatedBy: null,
  bindings: [],
};

let versions: Version[] = [seed];
let lockReasons: string[] = [];

const current = () => versions[versions.length - 1];
const eTagOf = (v: Version) => gestureETag(v.settingId, v.version);
/** The single-version response has no `updatedBy`; only the history does. */
const response = (v: Version) => {
  const { updatedBy, ...rest } = v;
  void updatedBy;
  return rest;
};

/** Lock or unlock editing, e.g. `setGestureMockLock(["OPEN_EXAM_SCHEDULES"])`; `[]` unlocks. */
export function setGestureMockLock(reasons: string[]) {
  lockReasons = reasons;
}

/** Back to version 1, unlocked. For tests. */
export function resetGestureMock() {
  versions = [seed];
  lockReasons = [];
}

const editStatus = () => ({
  canEdit: lockReasons.length === 0,
  openScheduleCount: lockReasons.includes("OPEN_EXAM_SCHEDULES") ? 2 : 0,
  activeAttemptCount: lockReasons.includes("ACTIVE_ATTEMPTS") ? 14 : 0,
  blockingReasons: lockReasons,
});

const comparable = (v: Omit<GestureConfigBody, "bindings"> & { bindings: Omit<Binding, "bindingId">[] }) =>
  JSON.stringify({
    isEnabled: v.isEnabled,
    preferredHand: v.preferredHand.toLowerCase(),
    confidenceThreshold: v.confidenceThreshold,
    holdDurationMs: v.holdDurationMs,
    cooldownMs: v.cooldownMs,
    requireRelease: v.requireRelease,
    bindings: v.bindings
      .map((b) => `${b.gestureCode}:${b.actionCode}:${b.isEnabled}`)
      .sort(),
  });

const gestureCodes = new Set(catalog.gestures.map((g) => g.code));
const actionCodes = new Set(catalog.actions.map((a) => a.code));

export const gestureConfigHandlers = [
  http.get("*/gesture-configurations/catalog", async () => {
    await delay(200);
    return ok(catalog);
  }),
  http.get("*/gesture-configurations/current", async () => {
    await delay(250);
    const v = current();
    return ok(response(v), { ETag: eTagOf(v) });
  }),
  http.get("*/gesture-configurations/edit-status", async () => {
    await delay(150);
    return ok(editStatus());
  }),
  http.put("*/gesture-configurations/current", async ({ request }) => {
    await delay(300);
    const match = request.headers.get("If-Match");
    if (!match) return fail(428, "IF_MATCH_REQUIRED", "The If-Match header is required.");
    if (match !== eTagOf(current()))
      return fail(412, "RESOURCE_CHANGED", "The gesture configuration was changed by another request.");
    if (lockReasons.length > 0)
      return fail(
        409,
        "EXAM_OPERATIONS_IN_PROGRESS",
        `Gesture configuration cannot change while exams are in progress: ${lockReasons.join(", ")}.`,
      );

    const body = (await request.json()) as GestureConfigBody;
    const unsupported = body.bindings.find((b) => !gestureCodes.has(b.gestureCode) || !actionCodes.has(b.actionCode));
    if (unsupported)
      return fail(400, gestureCodes.has(unsupported.gestureCode) ? "UNSUPPORTED_ACTION" : "UNSUPPORTED_GESTURE", "The binding is not supported.");
    const gestures = body.bindings.map((b) => b.gestureCode);
    if (new Set(gestures).size !== gestures.length)
      return fail(400, "DUPLICATE_GESTURE", "Each gesture can be bound only once.");
    if (body.isEnabled && !body.bindings.some((b) => b.isEnabled))
      return fail(400, "NO_ENABLED_BINDINGS", "Enable at least one gesture binding before enabling gestures.");

    const before = current();
    if (comparable(body) === comparable(before)) return ok(response(before), { ETag: eTagOf(before) });

    const next: Version = {
      ...body,
      settingId: SETTING_ID,
      version: before.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_ADMIN_ID,
      bindings: body.bindings.map((b) => ({ ...b, bindingId: crypto.randomUUID() })),
    };
    versions = [...versions, next];
    return ok(response(next), { ETag: eTagOf(next) });
  }),
  http.get("*/gesture-configurations/:version", async ({ params }) => {
    await delay(200);
    const found = versions.find((v) => String(v.version) === params.version);
    return found
      ? ok(response(found))
      : fail(404, "CONFIGURATION_NOT_FOUND", "The gesture configuration version was not found.");
  }),
  http.get("*/gesture-configurations", async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("Page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("PageSize") ?? 20)));
    const newestFirst = [...versions].reverse();
    const items = newestFirst.slice((page - 1) * pageSize, page * pageSize).map((v) => ({
      settingId: v.settingId,
      version: v.version,
      isEnabled: v.isEnabled,
      updatedBy: v.updatedBy,
      updatedAt: v.updatedAt,
      bindingCount: v.bindings.length,
    }));
    const totalPages = Math.max(1, Math.ceil(versions.length / pageSize));
    return ok({
      items,
      pageNumber: page,
      pageSize,
      totalCount: versions.length,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }),
];

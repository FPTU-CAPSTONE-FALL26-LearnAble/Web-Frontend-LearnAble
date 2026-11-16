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
 *
 * Phase 0 holds the shared types only; the request functions follow below.
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

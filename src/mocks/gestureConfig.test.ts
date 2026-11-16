import { getResponse } from "msw";
import { gestureETag } from "@/api/gestureConfig";
import { gestureConfigHandlers, resetGestureMock, setGestureMockLock } from "./gestureConfig";

const SEED_ETAG = gestureETag("9a000000-0000-0000-0000-000000000001", 1);

const call = async (path: string, init: { method?: string; ifMatch?: string; body?: unknown } = {}) => {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.ifMatch) headers.set("If-Match", init.ifMatch);
  const response = await getResponse(
    gestureConfigHandlers,
    new Request(`http://localhost/api/v1${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  );
  if (!response) throw new Error(`No mock handler for ${init.method ?? "GET"} ${path}`);
  return {
    status: response.status,
    eTag: response.headers.get("ETag"),
    ...((await response.json()) as { success: boolean; data: Record<string, unknown> | null; errors: string[] | null }),
  };
};

const body = (bindings: { gestureCode: string; actionCode: string; isEnabled: boolean }[], isEnabled = true) => ({
  isEnabled,
  preferredHand: "Either",
  confidenceThreshold: 0.8,
  holdDurationMs: 800,
  cooldownMs: 500,
  requireRelease: true,
  bindings,
});
const optionA = { gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true };

describe("gesture configuration mocks", () => {
  beforeEach(() => resetGestureMock());

  it("starts at the disabled version 1 seed and sends the backend's ETag", async () => {
    const current = await call("/gesture-configurations/current");
    expect(current.data).toMatchObject({ version: 1, isEnabled: false, bindings: [] });
    expect(current.eTag).toBe(SEED_ETAG);
    const catalog = await call("/gesture-configurations/catalog");
    expect((catalog.data!.gestures as unknown[]).length).toBe(9);
    expect((catalog.data!.actions as unknown[]).length).toBe(9);
  });

  it("refuses a save without If-Match or with a stale one", async () => {
    expect((await call("/gesture-configurations/current", { method: "PUT", body: body([optionA]) })).status).toBe(428);
    const stale = await call("/gesture-configurations/current", { method: "PUT", ifMatch: '"old"', body: body([optionA]) });
    expect(stale.status).toBe(412);
    expect(stale.errors).toEqual(["RESOURCE_CHANGED"]);
  });

  it("enforces one gesture per version and an enabled binding", async () => {
    const duplicate = await call("/gesture-configurations/current", {
      method: "PUT",
      ifMatch: SEED_ETAG,
      body: body([optionA, { ...optionA, actionCode: "TOGGLE_OPTION_B" }]),
    });
    expect(duplicate.errors).toEqual(["DUPLICATE_GESTURE"]);
    const none = await call("/gesture-configurations/current", { method: "PUT", ifMatch: SEED_ETAG, body: body([]) });
    expect(none.errors).toEqual(["NO_ENABLED_BINDINGS"]);
  });

  it("saves a new version, keeps the same version when nothing changed, and lists the history", async () => {
    const saved = await call("/gesture-configurations/current", { method: "PUT", ifMatch: SEED_ETAG, body: body([optionA]) });
    expect(saved.data).toMatchObject({ version: 2, isEnabled: true });
    const v2 = gestureETag("9a000000-0000-0000-0000-000000000001", 2);
    const same = await call("/gesture-configurations/current", { method: "PUT", ifMatch: v2, body: body([optionA]) });
    expect(same.data).toMatchObject({ version: 2 });

    const history = await call("/gesture-configurations?Page=1&PageSize=20");
    expect((history.data!.items as { version: number }[]).map((item) => item.version)).toEqual([2, 1]);
    expect((await call("/gesture-configurations/1")).data).toMatchObject({ version: 1 });
    expect((await call("/gesture-configurations/9")).status).toBe(404);
  });

  it("locks editing while exams are in progress", async () => {
    setGestureMockLock(["OPEN_EXAM_SCHEDULES", "ACTIVE_ATTEMPTS"]);
    expect((await call("/gesture-configurations/edit-status")).data).toMatchObject({
      canEdit: false,
      blockingReasons: ["OPEN_EXAM_SCHEDULES", "ACTIVE_ATTEMPTS"],
    });
    const locked = await call("/gesture-configurations/current", { method: "PUT", ifMatch: SEED_ETAG, body: body([optionA]) });
    expect(locked.status).toBe(409);
    expect(locked.errors).toEqual(["EXAM_OPERATIONS_IN_PROGRESS"]);
  });
});

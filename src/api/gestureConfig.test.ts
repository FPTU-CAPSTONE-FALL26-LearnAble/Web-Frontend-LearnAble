import {
  gestureETag,
  gestureSaveError,
  getGestureCatalog,
  getGestureConfig,
  getGestureEditStatus,
  getGestureHistory,
  saveGestureConfig,
} from "./gestureConfig";
import { ApiFailure } from "./client";

const SETTING_ID = "9a000000-0000-0000-0000-000000000001";

const configRow = {
  settingId: SETTING_ID,
  version: 3,
  isEnabled: true,
  preferredHand: "left",
  confidenceThreshold: 0.8,
  holdDurationMs: 800,
  cooldownMs: 500,
  requireRelease: true,
  updatedAt: "2026-11-16T09:00:00Z",
  bindings: [
    { bindingId: "b1", gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true },
    { bindingId: "b2", gestureCode: null, actionCode: "TOGGLE_OPTION_B", isEnabled: true },
  ],
};

const reply = (data: unknown, init: ResponseInit = { status: 200 }, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Refused.", data, errors: null }), init);

const refusal = (status: number, code: string) =>
  new Response(JSON.stringify({ success: false, message: "Refused.", data: null, errors: [code] }), { status });

describe("Gesture configuration API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("builds the backend's ETag from the setting id and version", () => {
    expect(gestureETag(SETTING_ID, 1)).toBe('"gesture-9a000000000000000000000000000001-1"');
    expect(gestureETag("9A000000-0000-0000-0000-00000000000F", 12)).toBe(
      '"gesture-9a00000000000000000000000000000f-12"',
    );
  });

  it("reads the catalog and tolerates missing names and descriptions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        gestures: [
          { code: "OPEN_PALM", name: "Open palm", description: "  " },
          { code: null, name: "Broken", description: null },
        ],
        actions: [{ code: "NEXT_ITEM", name: null, description: "Move focus." }],
      }),
    );
    expect(await getGestureCatalog()).toEqual({
      gestures: [{ code: "OPEN_PALM", name: "Open palm", description: null }],
      actions: [{ code: "NEXT_ITEM", name: "NEXT_ITEM", description: "Move focus." }],
    });
  });

  it("reads the current configuration, normalising the hand and adding the ETag", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(configRow));
    const config = await getGestureConfig();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/gesture-configurations\/current$/);
    expect(config.preferredHand).toBe("Left");
    expect(config.bindings).toEqual([
      { bindingId: "b1", gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true },
    ]);
    expect(config.eTag).toBe('"gesture-9a000000000000000000000000000001-3"');
  });

  it("treats null bindings as none and an unknown hand as Either", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({ ...configRow, preferredHand: "Both", bindings: null, updatedAt: null }),
    );
    const config = await getGestureConfig();
    expect(config.bindings).toEqual([]);
    expect(config.preferredHand).toBe("Either");
    expect(config.updatedAt).toBeNull();
  });

  it("reads the edit status with defaults for missing counts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({ canEdit: false, openScheduleCount: 2, activeAttemptCount: null, blockingReasons: ["OPEN_EXAM_SCHEDULES"] }),
    );
    expect(await getGestureEditStatus()).toEqual({
      canEdit: false,
      openScheduleCount: 2,
      activeAttemptCount: 0,
      blockingReasons: ["OPEN_EXAM_SCHEDULES"],
    });
  });

  it("pages the history and clamps the page size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        items: [{ settingId: SETTING_ID, version: 2, isEnabled: true, updatedBy: null, updatedAt: null, bindingCount: 4 }],
        pageNumber: 1,
        pageSize: 100,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    );
    const page = await getGestureHistory(0, 500);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toMatch(/\/gesture-configurations$/);
    expect(url.searchParams.get("Page")).toBe("1");
    expect(url.searchParams.get("PageSize")).toBe("100");
    expect(page.items[0]).toMatchObject({ version: 2, bindingCount: 4, updatedBy: null });
  });

  it("saves with PUT, the full body and If-Match", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ ...configRow, version: 4 }));
    const body = {
      isEnabled: true,
      preferredHand: "Either" as const,
      confidenceThreshold: 0.8,
      holdDurationMs: 800,
      cooldownMs: 500,
      requireRelease: true,
      bindings: [{ gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true }],
    };
    const saved = await saveGestureConfig(body, '"gesture-x-3"');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/gesture-configurations\/current$/);
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual(body);
    expect(new Headers(init?.headers).get("If-Match")).toBe('"gesture-x-3"');
    expect(saved.version).toBe(4);
  });

  it("turns a success:false envelope into an ApiFailure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, { status: 200 }, false));
    await expect(getGestureConfig()).rejects.toBeInstanceOf(ApiFailure);
  });

  it.each([
    [409, "EXAM_OPERATIONS_IN_PROGRESS", "locked"],
    [412, "RESOURCE_CHANGED", "stale"],
    [428, "IF_MATCH_REQUIRED", "stale"],
    [400, "DUPLICATE_GESTURE", "invalid"],
    [403, "FORBIDDEN", "forbidden"],
    [500, "INTERNAL", "other"],
  ])("classifies a %i save refusal as %s", async (status, code, expected) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(refusal(status, code));
    const failure = await saveGestureConfig(
      { ...configRow, preferredHand: "Either", bindings: [] },
      '"x"',
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiFailure);
    expect(gestureSaveError(failure)).toBe(expected);
  });

  it("classifies non-API errors as other", () => {
    expect(gestureSaveError(new Error("boom"))).toBe("other");
    expect(gestureSaveError(new ApiFailure({ kind: "network" }))).toBe("other");
  });
});

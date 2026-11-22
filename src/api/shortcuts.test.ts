import {
  createShortcut,
  deleteShortcut,
  getShortcutCatalog,
  getShortcuts,
  updateShortcut,
} from "./shortcuts";
import { ApiFailure } from "./client";

const row = {
  shortcutId: "s1",
  actionCode: "QUESTION_NEXT",
  keyCombination: "Ctrl+Right",
  isEnabled: true,
  createdAt: "2026-11-05T09:00:00Z",
  updatedAt: "2026-11-06T09:00:00Z",
  eTag: '"7"',
};
const reply = (data: unknown, init: ResponseInit = { status: 200 }, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Refused.", data, errors: null }), init);

describe("Exam shortcut API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the catalog and tolerates the nullable fields of the contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({
        actions: [
          { code: "QUESTION_NEXT", name: null, description: null },
          { code: null, name: "Broken", description: null },
        ],
        keyCodes: null,
        modifierOrder: ["Ctrl", "Alt", "Shift"],
        reservedCombinations: null,
        requiresControlAltOrMeta: true,
      }),
    );
    expect(await getShortcutCatalog()).toEqual({
      actions: [{ code: "QUESTION_NEXT", name: "QUESTION_NEXT", description: null }],
      keyCodes: [],
      modifierOrder: ["Ctrl", "Alt", "Shift"],
      reservedCombinations: [],
      requiresControlAltOrMeta: true,
    });
  });

  it("lists shortcuts with the ETag needed for later writes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply([row]));
    expect(await getShortcuts()).toEqual([
      {
        shortcutId: "s1",
        actionCode: "QUESTION_NEXT",
        keyCombination: "Ctrl+Right",
        isEnabled: true,
        updatedAt: "2026-11-06T09:00:00Z",
        eTag: '"7"',
      },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me\/shortcuts$/);
  });

  it("creates with POST and updates with PUT and If-Match", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => reply(row));
    const body = { actionCode: "QUESTION_NEXT", keyCombination: "Ctrl+M", isEnabled: true };

    await createShortcut(body);
    let [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/shortcuts$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(body);

    await updateShortcut("s1", body, '"7"');
    [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/me\/shortcuts\/s1$/);
    expect(init?.method).toBe("PUT");
    expect(new Headers(init?.headers).get("If-Match")).toBe('"7"');
  });

  it("deletes with If-Match and accepts an envelope without data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null));
    await expect(deleteShortcut("s1", '"7"')).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/shortcuts\/s1$/);
    expect(init?.method).toBe("DELETE");
    expect(new Headers(init?.headers).get("If-Match")).toBe('"7"');
  });

  it("surfaces the backend's reason when a save is refused", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: "An exam session is in progress.", data: null, errors: null }),
        { status: 409 },
      ),
    );
    const failure = await updateShortcut("s1", { actionCode: "A", keyCombination: "Ctrl+M", isEnabled: true }, null).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ApiFailure);
    expect((failure as ApiFailure).serverMessage).toBe("An exam session is in progress.");
  });
});

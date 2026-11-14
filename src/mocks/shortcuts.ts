import { HttpResponse, delay, http } from "msw";
import type { ShortcutBody } from "@/api/shortcuts";

/**
 * Offline stand-in for the deployed `MyShortcuts` API (see
 * `src/api/shortcuts.ts`), used only when `VITE_USE_MSW=true`.
 */

const ok = <T,>(data: T) =>
  HttpResponse.json({ success: true, message: null, data, errors: null });
const fail = (status: number, message: string) =>
  HttpResponse.json({ success: false, message, data: null, errors: null }, { status });

const catalog = {
  actions: [
    { code: "ANSWER_SELECT_A", name: "Select option A", description: "Chooses answer option A." },
    { code: "ANSWER_SELECT_B", name: "Select option B", description: "Chooses answer option B." },
    { code: "ANSWER_SELECT_C", name: "Select option C", description: "Chooses answer option C." },
    { code: "ANSWER_SELECT_D", name: "Select option D", description: "Chooses answer option D." },
    { code: "QUESTION_PREVIOUS", name: "Previous question", description: "Moves to the previous question." },
    { code: "QUESTION_NEXT", name: "Next question", description: "Moves to the next question." },
    { code: "QUESTION_SUBMIT", name: "Submit answer", description: "Saves the answer to the current question." },
    { code: "EXAM_SUBMIT", name: "Submit exam", description: "Opens the submit confirmation." },
    { code: "QUESTION_REPLAY", name: "Replay question", description: "Reads the question aloud again." },
  ],
  keyCodes: [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
    "Enter", "Space", "Up", "Down", "Left", "Right",
  ],
  modifierOrder: ["Ctrl", "Alt", "Shift"],
  reservedCombinations: ["Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+W", "Ctrl+Alt+N"],
  requiresControlAltOrMeta: true,
};

type Row = ShortcutBody & {
  shortcutId: string;
  createdAt: string;
  updatedAt: string;
  eTag: string;
};

let revision = 1;
const row = (actionCode: string, keyCombination: string): Row => ({
  shortcutId: crypto.randomUUID(),
  actionCode,
  keyCombination,
  isEnabled: true,
  createdAt: "2026-11-05T09:00:00Z",
  updatedAt: "2026-11-05T09:00:00Z",
  eTag: `"${revision++}"`,
});

let rows: Row[] = [
  row("ANSWER_SELECT_A", "Ctrl+1"),
  row("ANSWER_SELECT_B", "Ctrl+2"),
  row("ANSWER_SELECT_C", "Ctrl+3"),
  row("ANSWER_SELECT_D", "Ctrl+4"),
  row("QUESTION_PREVIOUS", "Ctrl+Left"),
  row("QUESTION_NEXT", "Ctrl+Right"),
  row("QUESTION_SUBMIT", "Ctrl+Enter"),
  row("EXAM_SUBMIT", "Ctrl+Shift+Enter"),
  row("QUESTION_REPLAY", "Ctrl+Shift+R"),
];

const conflict = (body: ShortcutBody, selfId?: string) =>
  rows.some(
    (item) =>
      item.shortcutId !== selfId &&
      (item.actionCode === body.actionCode ||
        item.keyCombination.toLowerCase() === body.keyCombination.toLowerCase()),
  );

export const shortcutHandlers = [
  http.get("*/me/shortcuts/catalog", async () => {
    await delay(200);
    return ok(catalog);
  }),
  http.get("*/me/shortcuts", async () => {
    await delay(250);
    return ok(rows);
  }),
  http.post("*/me/shortcuts", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as ShortcutBody;
    if (conflict(body)) return fail(409, "This action or key combination is already configured.");
    const created = { ...row(body.actionCode, body.keyCombination), isEnabled: body.isEnabled };
    rows = [...rows, created];
    return ok(created);
  }),
  http.get("*/me/shortcuts/:shortcutId", async ({ params }) => {
    const found = rows.find((item) => item.shortcutId === params.shortcutId);
    return found ? ok(found) : fail(404, "Shortcut not found.");
  }),
  http.put("*/me/shortcuts/:shortcutId", async ({ params, request }) => {
    await delay(300);
    const found = rows.find((item) => item.shortcutId === params.shortcutId);
    if (!found) return fail(404, "Shortcut not found.");
    const match = request.headers.get("If-Match");
    if (match && match !== found.eTag)
      return fail(412, "This shortcut was changed by someone else. Reload and try again.");
    const body = (await request.json()) as ShortcutBody;
    if (conflict(body, found.shortcutId))
      return fail(409, "This key combination is already used by another action.");
    const updated = {
      ...found,
      ...body,
      updatedAt: new Date().toISOString(),
      eTag: `"${revision++}"`,
    };
    rows = rows.map((item) => (item === found ? updated : item));
    return ok(updated);
  }),
  http.delete("*/me/shortcuts/:shortcutId", async ({ params }) => {
    await delay(300);
    rows = rows.filter((item) => item.shortcutId !== params.shortcutId);
    return ok(null);
  }),
];

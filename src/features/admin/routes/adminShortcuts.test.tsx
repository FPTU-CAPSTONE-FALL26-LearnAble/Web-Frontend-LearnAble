import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiFailure } from "@/api/client";
import {
  createShortcut,
  deleteShortcut,
  getShortcutCatalog,
  getShortcuts,
  updateShortcut,
  type Shortcut,
  type ShortcutCatalog,
} from "@/api/shortcuts";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { ExamShortcutsRoute } from "./ExamShortcutsRoute";

const catalog: ShortcutCatalog = {
  actions: [
    { code: "QUESTION_NEXT", name: "Next question", description: "Moves on." },
    { code: "QUESTION_PREVIOUS", name: "Previous question", description: "Moves back." },
    { code: "QUESTION_REPLAY", name: "Replay question", description: null },
  ],
  keyCodes: ["N", "M", "B", "R", "Enter"],
  modifierOrder: ["Ctrl", "Alt", "Shift"],
  reservedCombinations: [],
  requiresControlAltOrMeta: true,
};

const shortcut = (overrides: Partial<Shortcut>): Shortcut => ({
  shortcutId: "s-next",
  actionCode: "QUESTION_NEXT",
  keyCombination: "Ctrl+N",
  isEnabled: true,
  updatedAt: "2026-11-06T09:00:00Z",
  eTag: '"1"',
  ...overrides,
});

const configured = (): Shortcut[] => [
  shortcut({}),
  shortcut({
    shortcutId: "s-prev",
    actionCode: "QUESTION_PREVIOUS",
    keyCombination: "Ctrl+B",
    eTag: '"2"',
  }),
];

vi.mock("@/api/shortcuts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/shortcuts")>();
  return {
    ...actual,
    getShortcutCatalog: vi.fn(),
    getShortcuts: vi.fn(),
    createShortcut: vi.fn(),
    updateShortcut: vi.fn(),
    deleteShortcut: vi.fn(),
  };
});

function view() {
  const router = createMemoryRouter([{ path: "/", element: <ExamShortcutsRoute /> }]);
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const rowOf = async (action: string) =>
  (await screen.findByRole("cell", { name: action })).closest("tr")!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getShortcutCatalog).mockResolvedValue(catalog);
  vi.mocked(getShortcuts).mockResolvedValue(configured());
  vi.mocked(createShortcut).mockResolvedValue(shortcut({}));
  vi.mocked(updateShortcut).mockResolvedValue(shortcut({}));
  vi.mocked(deleteShortcut).mockResolvedValue(undefined);
});

describe("Keyboard shortcuts", { timeout: 30000 }, () => {
  it("lists every catalog action with its shortcut and state", async () => {
    const result = view();
    const next = await rowOf("Next question");
    expect(within(next).getByText("Ctrl+N")).toBeInTheDocument();
    expect(within(next).getByText("On")).toBeInTheDocument();
    const replay = await rowOf("Replay question");
    expect(within(replay).getByText("Not set")).toBeInTheDocument();
    expect(
      within(replay).getByRole("button", { name: "Set shortcut for Replay question" }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(result.container);
  });

  it("records keys, rejects invalid and duplicate combinations, then saves with the ETag", async () => {
    const user = userEvent.setup();
    const result = view();
    await user.click(
      await screen.findByRole("button", { name: "Change shortcut for Next question" }),
    );
    const field = screen.getByLabelText("New shortcut");
    const submit = screen.getByRole("button", { name: "Save shortcut" });

    await user.click(field);
    await user.keyboard("{Alt>}m{/Alt}");
    expect(field).toHaveValue("Alt+M");
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent(/Hold Ctrl together with the key/);

    await user.click(field);
    await user.keyboard("{Control>}b{/Control}");
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ctrl+B is already used by “Previous question”.",
    );
    await expectNoAxeViolations(result.baseElement);
    expect(updateShortcut).not.toHaveBeenCalled();

    await user.click(field);
    await user.keyboard("{Control>}m{/Control}");
    expect(field).toHaveValue("Ctrl+M");
    await user.click(submit);
    await waitFor(() =>
      expect(updateShortcut).toHaveBeenCalledWith(
        "s-next",
        { actionCode: "QUESTION_NEXT", keyCombination: "Ctrl+M", isEnabled: true },
        '"1"',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("New shortcut")).not.toBeInTheDocument(),
    );
  });

  it("creates a shortcut for an action that has none", async () => {
    const user = userEvent.setup();
    view();
    await user.click(
      await screen.findByRole("button", { name: "Set shortcut for Replay question" }),
    );
    await user.click(screen.getByLabelText("New shortcut"));
    await user.keyboard("{Control>}{Shift>}r{/Shift}{/Control}");
    await user.click(screen.getByRole("button", { name: "Save shortcut" }));
    await waitFor(() =>
      expect(createShortcut).toHaveBeenCalledWith({
        actionCode: "QUESTION_REPLAY",
        keyCombination: "Ctrl+Shift+R",
        isEnabled: true,
      }),
    );
  });

  it("turns a shortcut off and removes one after confirmation", async () => {
    const user = userEvent.setup();
    view();
    await user.click(
      await screen.findByRole("button", { name: "Turn off shortcut for Next question" }),
    );
    await waitFor(() =>
      expect(updateShortcut).toHaveBeenCalledWith(
        "s-next",
        { actionCode: "QUESTION_NEXT", keyCombination: "Ctrl+N", isEnabled: false },
        '"1"',
      ),
    );

    await user.click(
      await screen.findByRole("button", { name: "Remove shortcut for Previous question" }),
    );
    expect(deleteShortcut).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(deleteShortcut).toHaveBeenCalledWith("s-prev", '"2"'));
  });

  it("tells the admin what a recorded combination will do before saving", async () => {
    const user = userEvent.setup();
    view();
    await user.click(
      await screen.findByRole("button", { name: "Change shortcut for Next question" }),
    );
    const dialog = screen.getByRole("dialog");
    const field = within(dialog).getByLabelText("New shortcut");
    await user.click(field);
    await user.keyboard("{Control>}b{/Control}");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Ctrl+B is already used by “Previous question”.",
    );
    await user.keyboard("{Control>}m{/Control}");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Ctrl+M is free. Saving makes it trigger “Next question”.",
    );
    expect(updateShortcut).not.toHaveBeenCalled();
  });

  it("lets the admin press saved shortcuts and tracks which ones were tested", async () => {
    vi.mocked(getShortcuts).mockResolvedValue([
      ...configured(),
      shortcut({
        shortcutId: "s-replay",
        actionCode: "QUESTION_REPLAY",
        keyCombination: "Ctrl+Shift+R",
        isEnabled: false,
        eTag: '"3"',
      }),
    ]);
    const user = userEvent.setup();
    const result = view();
    const tester = (await screen.findByRole("heading", { name: "Test shortcuts" })).closest(
      "section",
    )!;
    const field = within(tester).getByLabelText("Test area");
    const status = within(tester).getByRole("status");
    expect(within(tester).getByText("0 of 2 shortcuts tested")).toBeInTheDocument();

    await user.click(field);
    await user.keyboard("{Control>}n{/Control}");
    expect(status).toHaveTextContent("Ctrl+N triggers “Next question”.");
    expect(within(tester).getByText("1 of 2 shortcuts tested")).toBeInTheDocument();

    await user.keyboard("{Control>}m{/Control}");
    expect(status).toHaveTextContent("Ctrl+M is not assigned to any action.");

    await user.keyboard("{Control>}{Shift>}r{/Shift}{/Control}");
    expect(status).toHaveTextContent(/“Replay question”, but that shortcut is turned off/);
    expect(within(tester).getByText("1 of 2 shortcuts tested")).toBeInTheDocument();
    await expectNoAxeViolations(result.container);

    // Tab is never captured, so the field cannot trap keyboard users.
    await user.tab();
    expect(field).not.toHaveFocus();

    await user.click(within(tester).getByRole("button", { name: "Reset test" }));
    expect(within(tester).getByText("0 of 2 shortcuts tested")).toBeInTheDocument();
    expect(updateShortcut).not.toHaveBeenCalled();
    expect(createShortcut).not.toHaveBeenCalled();
  });

  it("shows on a sample exam what each shortcut does", async () => {
    vi.mocked(getShortcutCatalog).mockResolvedValue({
      ...catalog,
      actions: [
        ...catalog.actions,
        { code: "ANSWER_SELECT_A", name: "Select option A", description: null },
        { code: "ANSWER_SELECT_C", name: "Select option C", description: null },
      ],
      keyCodes: [...catalog.keyCodes, "1", "3"],
    });
    vi.mocked(getShortcuts).mockResolvedValue([
      ...configured(),
      shortcut({ shortcutId: "s-a", actionCode: "ANSWER_SELECT_A", keyCombination: "Ctrl+1" }),
      shortcut({ shortcutId: "s-c", actionCode: "ANSWER_SELECT_C", keyCombination: "Ctrl+3" }),
    ]);
    const user = userEvent.setup();
    const result = view();
    const stage = await screen.findByTestId("shortcut-preview");
    const optionRow = (text: string) => within(stage).getByText(text).closest("li")!;

    // Each option shows the keys that select it, before anything is pressed.
    expect(within(optionRow("Mercury")).getByText("Ctrl+1")).toBeInTheDocument();
    expect(within(optionRow("Earth")).getByText("Ctrl+3")).toBeInTheDocument();
    expect(within(stage).queryByText("Selected")).not.toBeInTheDocument();

    // Clicking the picture focuses the test area.
    await user.click(stage);
    expect(screen.getByLabelText("Test area")).toHaveFocus();
    expect(within(stage).getByText("Listening for keys")).toBeInTheDocument();

    await user.keyboard("{Control>}1{/Control}");
    expect(within(optionRow("Mercury")).getByText("Selected")).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+1 triggers “Select option A”\. Option A is now selected\./)).toBeInTheDocument();

    await user.keyboard("{Control>}3{/Control}");
    expect(within(optionRow("Earth")).getByText("Selected")).toBeInTheDocument();
    expect(within(optionRow("Mercury")).queryByText("Selected")).not.toBeInTheDocument();

    await user.keyboard("{Control>}n{/Control}");
    expect(within(stage).getByText("Sample exam · Question 2 of 3")).toBeInTheDocument();
    expect(within(stage).queryByText("Selected")).not.toBeInTheDocument();

    await user.keyboard("{Control>}b{/Control}");
    expect(within(stage).getByText("Sample exam · Question 1 of 3")).toBeInTheDocument();
    expect(within(optionRow("Earth")).getByText("Selected")).toBeInTheDocument();
    await expectNoAxeViolations(result.container);
  });

  it("keeps the editor open and reloads the list when the backend refuses a save", async () => {
    vi.mocked(updateShortcut).mockRejectedValue(
      new ApiFailure({ kind: "server", status: 409 }, "An exam session is in progress."),
    );
    const user = userEvent.setup();
    view();
    await user.click(
      await screen.findByRole("button", { name: "Change shortcut for Next question" }),
    );
    await user.click(screen.getByLabelText("New shortcut"));
    await user.keyboard("{Control>}m{/Control}");
    await user.click(screen.getByRole("button", { name: "Save shortcut" }));
    await waitFor(() => expect(getShortcuts).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("New shortcut")).toHaveValue("Ctrl+M");
  });
});

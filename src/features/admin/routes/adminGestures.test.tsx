import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiFailure } from "@/api/client";
import { getAdminUser, type AdminUser } from "@/api/admin";
import {
  gestureETag,
  getGestureCatalog,
  getGestureConfig,
  getGestureConfigVersion,
  getGestureEditStatus,
  getGestureHistory,
  saveGestureConfig,
  type GestureCatalog,
  type GestureConfig,
  type GestureEditStatus,
} from "@/api/gestureConfig";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { useAuthStore } from "@/features/auth/store/authStore";
import { GestureConfigRoute } from "./GestureConfigRoute";

const SETTING_ID = "9a000000-0000-0000-0000-000000000001";
const ADMIN_ID = "00000000-0000-0000-0000-0000000000a1";

const catalog: GestureCatalog = {
  gestures: [
    { code: "ONE_FINGER", name: "One finger", description: "Extend only the index finger." },
    { code: "TWO_FINGERS", name: "Two fingers", description: "Extend the index and middle fingers." },
    { code: "OPEN_PALM", name: "Open palm", description: "Extend all five digits." },
  ],
  actions: [
    { code: "TOGGLE_OPTION_A", name: "Toggle option A", description: "Toggle the first option." },
    { code: "TOGGLE_OPTION_B", name: "Toggle option B", description: "Toggle the second option." },
    { code: "READ_FOCUSED_CONTENT", name: "Read focused content", description: null },
  ],
};

const config = (version: number, overrides: Partial<GestureConfig> = {}): GestureConfig => ({
  settingId: SETTING_ID,
  version,
  isEnabled: true,
  preferredHand: "Either",
  confidenceThreshold: 0.8,
  holdDurationMs: 800,
  cooldownMs: 500,
  requireRelease: true,
  updatedAt: "2026-11-16T09:00:00Z",
  bindings: [
    { bindingId: "b1", gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true },
    { bindingId: "b2", gestureCode: "OPEN_PALM", actionCode: "READ_FOCUSED_CONTENT", isEnabled: true },
  ],
  eTag: gestureETag(SETTING_ID, version),
  ...overrides,
});

const unlocked: GestureEditStatus = { canEdit: true, openScheduleCount: 0, activeAttemptCount: 0, blockingReasons: [] };
const locked: GestureEditStatus = {
  canEdit: false,
  openScheduleCount: 2,
  activeAttemptCount: 1,
  blockingReasons: ["OPEN_EXAM_SCHEDULES", "ACTIVE_ATTEMPTS"],
};

const historyPage = (versions: number[]) => ({
  items: versions.map((version) => ({
    settingId: SETTING_ID,
    version,
    isEnabled: true,
    updatedBy: version === 1 ? null : ADMIN_ID,
    updatedAt: "2026-11-16T09:00:00Z",
    bindingCount: 2,
  })),
  pageNumber: 1,
  pageSize: versions.length,
  totalCount: versions.length,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

vi.mock("@/api/gestureConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/gestureConfig")>();
  return {
    ...actual,
    getGestureCatalog: vi.fn(),
    getGestureConfig: vi.fn(),
    getGestureConfigVersion: vi.fn(),
    getGestureEditStatus: vi.fn(),
    getGestureHistory: vi.fn(),
    saveGestureConfig: vi.fn(),
  };
});
vi.mock("@/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/admin")>();
  return { ...actual, getAdminUser: vi.fn() };
});

function view() {
  const router = createMemoryRouter([{ path: "/", element: <GestureConfigRoute /> }]);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const select = (action: string) => screen.findByRole("combobox", { name: `Gesture for ${action}` });
const saveButton = () => screen.getByRole("button", { name: /^Save as version/ });
/** Opens an action's gesture list and picks the gesture whose name starts with `gesture`. */
async function choose(user: ReturnType<typeof userEvent.setup>, action: string, gesture: string) {
  await user.click(await select(action));
  await user.click(await screen.findByRole("option", { name: new RegExp(`^${gesture}`) }));
}

beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getGestureCatalog).mockResolvedValue(catalog);
  vi.mocked(getGestureConfig).mockResolvedValue(config(2));
  vi.mocked(getGestureEditStatus).mockResolvedValue(unlocked);
  vi.mocked(getGestureHistory).mockImplementation(async () => historyPage([2, 1]));
  vi.mocked(getGestureConfigVersion).mockImplementation(async (version) => config(version));
  vi.mocked(getAdminUser).mockResolvedValue({ userId: ADMIN_ID, fullName: "Lan Nguyen", email: "lan@example.edu" } as AdminUser);
  vi.mocked(saveGestureConfig).mockImplementation(async () => config(3));
});

describe("Hand gestures", { timeout: 30000 }, () => {
  it("lists every action with its gesture and the current version with its editor (AC1, AC5)", async () => {
    const result = view();
    expect(await select("Toggle option A")).toHaveTextContent("One finger");
    expect(await select("Toggle option B")).toHaveTextContent("No gesture");
    expect(await select("Read focused content")).toHaveTextContent("Open palm");
    expect(await screen.findByText("Version 2")).toBeInTheDocument();
    expect(await screen.findByText(/^Saved .* by Lan Nguyen$/)).toBeInTheDocument();
    expect(screen.getByText("Gesture input on")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    await expectNoAxeViolations(result.container);
  });

  it("tells screen-reader users which gestures are already used before they choose", async () => {
    const user = userEvent.setup();
    view();
    await user.click(await select("Toggle option B"));
    expect(await screen.findByRole("option", { name: "One finger — used by Toggle option A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Two fingers" })).toBeInTheDocument();
  });

  it("counts unsaved changes and discards them", async () => {
    const user = userEvent.setup();
    view();
    await choose(user, "Toggle option B", "Two fingers");
    expect(screen.getByText("1 unsaved change.")).toBeInTheDocument();
    expect(saveButton()).toHaveTextContent("Save as version 3");
    expect(saveButton()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(await select("Toggle option B")).toHaveTextContent("No gesture");
    expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
  });

  it("blocks saving when two actions share a gesture (AC3)", async () => {
    const user = userEvent.setup();
    view();
    await choose(user, "Toggle option B", "One finger");

    expect(await select("Toggle option B")).toHaveAttribute("aria-invalid", "true");
    expect(await select("Toggle option A")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("One finger is also assigned to Toggle option A. Each gesture can trigger only one action.")).toBeInTheDocument();
    expect(screen.getByText("One finger is also assigned to Toggle option B. Each gesture can trigger only one action.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("explains the lock with counts and disables editing while exams run (AC4)", async () => {
    vi.mocked(getGestureEditStatus).mockResolvedValue(locked);
    const result = view();
    expect(await screen.findByText("Editing is locked while exams are in progress.")).toBeInTheDocument();
    expect(screen.getByText("2 exam schedules are open.")).toBeInTheDocument();
    expect(screen.getByText("1 student is taking an exam.")).toBeInTheDocument();
    expect(await select("Toggle option A")).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Use the gesture for Toggle option A" })).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    await expectNoAxeViolations(result.container);
  });

  it("saves the full body with the ETag after confirmation and moves to the new version (AC5)", async () => {
    const user = userEvent.setup();
    view();
    await choose(user, "Toggle option B", "Two fingers");
    vi.mocked(getGestureConfig).mockResolvedValue(config(3));
    await user.click(saveButton());

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Save version 3?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save version 3" }));

    await waitFor(() =>
      expect(saveGestureConfig).toHaveBeenCalledWith(
        {
          isEnabled: true,
          preferredHand: "Either",
          confidenceThreshold: 0.8,
          holdDurationMs: 800,
          cooldownMs: 500,
          requireRelease: true,
          bindings: [
            { gestureCode: "ONE_FINGER", actionCode: "TOGGLE_OPTION_A", isEnabled: true },
            { gestureCode: "OPEN_PALM", actionCode: "READ_FOCUSED_CONTENT", isEnabled: true },
            { gestureCode: "TWO_FINGERS", actionCode: "TOGGLE_OPTION_B", isEnabled: true },
          ],
        },
        gestureETag(SETTING_ID, 2),
      ),
    );
    expect(await screen.findByText("Version 3")).toBeInTheDocument();
    expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
  });

  it("keeps the draft and shows the lock when an exam starts before saving (409)", async () => {
    const user = userEvent.setup();
    view();
    await choose(user, "Toggle option B", "Two fingers");
    vi.mocked(saveGestureConfig).mockRejectedValue(new ApiFailure({ kind: "server", status: 409 }, "Locked."));
    vi.mocked(getGestureEditStatus).mockResolvedValue(locked);
    await user.click(saveButton());
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save version 3" }));

    expect(await screen.findByText("Editing is locked while exams are in progress.")).toBeInTheDocument();
    expect(screen.getByText(/Saving was refused because an exam started/)).toBeInTheDocument();
    expect(await select("Toggle option B")).toHaveTextContent("Two fingers");
  });

  it("reloads the current version and keeps the draft when someone else saved first (412)", async () => {
    const user = userEvent.setup();
    view();
    await choose(user, "Toggle option B", "Two fingers");
    vi.mocked(saveGestureConfig).mockRejectedValueOnce(new ApiFailure({ kind: "server", status: 412 }, "Changed."));
    vi.mocked(getGestureConfig).mockResolvedValue(config(5));
    await user.click(saveButton());
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save version 3" }));

    expect(await screen.findByText("Another administrator saved version 5. Review your changes and save again.")).toBeInTheDocument();
    expect(await select("Toggle option B")).toHaveTextContent("Two fingers");
    expect(saveButton()).toHaveTextContent("Save as version 6");

    await user.click(saveButton());
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save version 6" }));
    await waitFor(() => expect(saveGestureConfig).toHaveBeenLastCalledWith(expect.anything(), gestureETag(SETTING_ID, 5)));
  });

  it("refuses to enable gesture input without an enabled gesture", async () => {
    const user = userEvent.setup();
    vi.mocked(getGestureConfig).mockResolvedValue(config(1, { isEnabled: false, bindings: [], updatedAt: null }));
    view();
    await screen.findByText("Version 1");
    await user.click(screen.getByRole("switch", { name: "Gesture input for exams" }));

    expect(screen.getByText("Turn on at least one gesture before enabling gesture input.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await choose(user, "Toggle option A", "One finger");
    expect(screen.queryByText("Turn on at least one gesture before enabling gesture input.")).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("names the signed-in admin without looking them up", async () => {
    useAuthStore.setState({ user: { id: ADMIN_ID, fullName: "Admin System", email: "admin@example.edu", role: "Admin" } });
    try {
      view();
      expect(await screen.findByText(/^Saved .* by Admin System$/)).toBeInTheDocument();
      expect(getAdminUser).not.toHaveBeenCalledWith(ADMIN_ID);
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it("opens the version history and shows a saved version", async () => {
    const user = userEvent.setup();
    const result = view();
    await user.click(await screen.findByRole("button", { name: "Version history" }));
    const dialog = await screen.findByRole("dialog", { name: "Gesture version history" });
    expect(await within(dialog).findByText("System default")).toBeInTheDocument();
    expect(await within(dialog).findByText("Lan Nguyen")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "View version 1" }));
    expect(await within(dialog).findByText("Version 1 · gesture input on")).toBeInTheDocument();
    expect(within(dialog).getByText("One finger")).toBeInTheDocument();
    await expectNoAxeViolations(result.baseElement);
  });
});

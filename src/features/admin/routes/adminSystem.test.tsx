import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  getShortcutConfig,
  getSystemHealth,
  getVoiceSettings,
  saveShortcutConfig,
  saveVoiceSettings,
  type ShortcutConfig,
  type VoiceSettings,
} from "@/api/adminSystem";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminDashboardRoute } from "./AdminDashboardRoute";
import { ExamShortcutsRoute } from "./ExamShortcutsRoute";
import { SystemMonitoringRoute } from "./SystemMonitoringRoute";
import { VoiceSettingsRoute, validateVoiceSettings } from "./VoiceSettingsRoute";

const voiceSettings: VoiceSettings = {
  voices: [
    { voiceKey: "vi-VN-HoaiMyNeural", displayName: "Hoài My", languageCode: "vi-VN", gender: "Female", isActive: true },
    { voiceKey: "en-US-JennyNeural", displayName: "Jenny", languageCode: "en-US", gender: "Female", isActive: true },
  ],
  speeds: [
    { value: 1, isActive: true },
    { value: 1.5, isActive: true },
  ],
  defaultVoiceKey: "vi-VN-HoaiMyNeural",
  defaultSpeed: 1,
  updatedAt: "2026-11-01T09:30:00Z",
  updatedBy: "System Admin",
};

const shortcuts = (activeExamSessions = 0): ShortcutConfig => ({
  version: 3,
  updatedAt: "2026-10-28T14:00:00Z",
  updatedBy: "System Admin",
  activeExamSessions,
  bindings: [
    { actionKey: "question.next", actionName: "Next question", description: "Moves on.", keys: "Alt+N" },
    { actionKey: "question.previous", actionName: "Previous question", description: "Moves back.", keys: "Alt+P" },
  ],
});

vi.mock("@/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/admin")>();
  const empty = vi.fn(async () => ({ items: [], totalCount: 0 }));
  return {
    ...actual,
    getAdminSubjects: empty,
    getAdminUsers: empty,
    getDepartments: empty,
    getLecturerProfiles: empty,
    getMajors: empty,
    getStudentProfiles: empty,
    getUniversities: empty,
  };
});

vi.mock("@/api/adminSystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminSystem")>();
  return {
    ...actual,
    getVoiceSettings: vi.fn(),
    saveVoiceSettings: vi.fn(async (body) => ({ ...body, updatedAt: null, updatedBy: null })),
    getSystemHealth: vi.fn(),
    getShortcutConfig: vi.fn(),
    saveShortcutConfig: vi.fn(async () => shortcuts()),
  };
});

function view(element: ReactNode) {
  const router = createMemoryRouter([{ path: "/", element }]);
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getVoiceSettings).mockResolvedValue(structuredClone(voiceSettings));
  vi.mocked(getShortcutConfig).mockResolvedValue(shortcuts());
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: "Degraded",
    checkedAt: "2026-11-05T14:00:00Z",
    uptimePercent30d: 99.62,
    services: [
      { name: "Database", status: "Healthy", latencyMs: 8, message: null },
      { name: "Text-to-speech", status: "Down", latencyMs: null, message: "Timed out." },
    ],
    performance: { averageResponseMs: 186, p95ResponseMs: 640, errorRatePercent: 0.42, requestsPerMinute: 1280 },
    usage: { activeUsers: 214, activeExamSessions: 0, activeUniversities: 3, storageUsedGb: null, storageQuotaGb: 100 },
  });
  useAuthStore.setState({
    user: { id: "u1", fullName: "System Admin", email: "a@x.vn", role: "Admin" },
  });
});
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

describe("Admin navigation after the Staff split", () => {
  it("lists only system administration tools", () => {
    render(
      <RouterProvider
        router={createMemoryRouter([
          {
            path: "/",
            element: (
              <AdminSidebar
                activePath="/admin/dashboard"
                user={{ id: "u1", fullName: "System Admin", email: "", role: "Admin" }}
                onSignOut={() => {}}
              />
            ),
          },
        ])}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    for (const group of ["Organisation", "People", "System", "Exam accessibility"]) {
      within(nav).getByRole("button", { name: group });
    }
    expect(within(nav).queryByText("Departments")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Semesters")).not.toBeInTheDocument();
  });

  it("gives every admin a way to reach university configuration", () => {
    render(
      <RouterProvider
        router={createMemoryRouter([
          {
            path: "/",
            element: (
              <AdminSidebar
                activePath="/admin/universities"
                user={{ id: "u1", fullName: "System Admin", email: "", role: "Admin" }}
                onSignOut={() => {}}
              />
            ),
          },
        ])}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).getByRole("link", { name: "Universities" })).toHaveAttribute(
      "href",
      "/admin/universities",
    );
  });

  it("gives every admin a way to reach user accounts", () => {
    render(
      <RouterProvider
        router={createMemoryRouter([
          {
            path: "/",
            element: (
              <AdminSidebar
                activePath="/admin/users"
                user={{ id: "u1", fullName: "System Admin", email: "", role: "Admin" }}
                onSignOut={() => {}}
              />
            ),
          },
        ])}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).getByRole("link", { name: "User accounts" })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });

  it("links to university configuration from the dashboard", async () => {
    view(<AdminDashboardRoute />);
    expect(
      await screen.findByRole("link", { name: "Manage universities" }),
    ).toHaveAttribute("href", "/admin/universities");
  });
});

describe("Voices and speeds", { timeout: 30000 }, () => {
  it("blocks a configuration whose default is hidden from students", () => {
    expect(
      validateVoiceSettings({
        ...voiceSettings,
        voices: voiceSettings.voices.map((v) =>
          v.voiceKey === "vi-VN-HoaiMyNeural" ? { ...v, isActive: false } : v,
        ),
      }),
    ).toEqual([
      "Choose a default voice that is available to students.",
      "Keep at least one Vietnamese voice available, or questions in that language cannot be read aloud.",
    ]);
  });

  it("validates before saving and saves the edited configuration", async () => {
    const user = userEvent.setup();
    const result = view(<VoiceSettingsRoute />);
    expect(await screen.findByText("Hoài My")).toBeInTheDocument();
    await expectNoAxeViolations(result.container);

    await user.click(screen.getByLabelText("Available — Hoài My"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a default voice that is available to students.",
    );
    expect(saveVoiceSettings).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText("Hidden — Hoài My"));
    await user.type(screen.getByLabelText("New speed"), "3");
    await user.click(screen.getByRole("button", { name: "Add speed" }));
    expect(screen.getByText("Speed must be between 0.5 and 2.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("New speed"));
    await user.type(screen.getByLabelText("New speed"), "1.25");
    await user.click(screen.getByRole("button", { name: "Add speed" }));
    expect(screen.getByLabelText("1.25×")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saveVoiceSettings).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveVoiceSettings).mock.calls[0][0].speeds.map((s) => s.value)).toEqual([
      1, 1.25, 1.5,
    ]);
  });
});

describe("System monitoring", { timeout: 30000 }, () => {
  it("states health in words and lets live updates be paused", async () => {
    const user = userEvent.setup();
    const result = view(<SystemMonitoringRoute />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Down")).toBeInTheDocument();
    expect(within(table).getByText("Timed out.")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Pause live updates" }));
    expect(screen.getByText(/Live updates are paused/)).toBeInTheDocument();
    await expectNoAxeViolations(result.container);
  });
});

describe("Keyboard shortcuts", { timeout: 30000 }, () => {
  it("locks editing while an exam is in progress", async () => {
    vi.mocked(getShortcutConfig).mockResolvedValue(shortcuts(2));
    view(<ExamShortcutsRoute />);
    expect(
      await screen.findByText("Editing is locked while exams are running."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change shortcut for Next question" }),
    ).toBeDisabled();
  });

  it("records keys, rejects a duplicate and publishes after confirmation", async () => {
    const user = userEvent.setup();
    const result = view(<ExamShortcutsRoute />);
    await user.click(
      await screen.findByRole("button", { name: "Change shortcut for Next question" }),
    );
    const field = screen.getByLabelText("New shortcut");
    await user.click(field);
    await user.keyboard("{Alt>}p{/Alt}");
    expect(field).toHaveValue("Alt+P");
    await user.click(screen.getByRole("button", { name: "Use this shortcut" }));
    expect(screen.getByText("Alt+P is already used by “Previous question”.")).toBeInTheDocument();

    await user.click(field);
    await user.keyboard("{Alt>}m{/Alt}");
    await user.click(screen.getByRole("button", { name: "Use this shortcut" }));
    expect(await screen.findByText("1 unpublished change.")).toBeInTheDocument();
    await expectNoAxeViolations(result.container);

    await user.click(screen.getByRole("button", { name: "Publish changes" }));
    await user.click(await screen.findByRole("button", { name: "Publish" }));
    await waitFor(() =>
      expect(saveShortcutConfig).toHaveBeenCalledWith({
        version: 3,
        bindings: [
          { actionKey: "question.next", keys: "Alt+M" },
          { actionKey: "question.previous", keys: "Alt+P" },
        ],
      }),
    );
  });
});

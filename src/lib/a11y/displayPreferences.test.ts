import {
  GUEST,
  activateDisplayPreferences,
  deactivateDisplayPreferences,
  getDisplayPreferencesSnapshot,
  loadDisplayPreferences,
  setContrastTheme,
  setTextScale,
} from "./displayPreferences";

const reply = (data: unknown) =>
  new Response(JSON.stringify({ success: true, message: null, data, errors: null }));
const preferences = { voiceCode: null, speechRate: 1, fontSize: 16, contrastTheme: "Default" };
const snapshot = getDisplayPreferencesSnapshot;

describe("display preferences", () => {
  const root = document.documentElement;
  beforeEach(() => {
    localStorage.clear();
    deactivateDisplayPreferences();
  });
  afterEach(() => vi.restoreAllMocks());

  it("starts on the default look and marks nothing", () => {
    activateDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "default", textScale: 100 });
    expect(root).not.toHaveAttribute("data-contrast");
    expect(root).not.toHaveClass("dark");
    expect(root.style.getPropertyValue("--text-scale")).toBe("");
  });

  it("keeps each owner's local copy apart on a shared computer", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => reply(preferences));
    activateDisplayPreferences("student-1");
    await setContrastTheme("yellow");
    await setTextScale(150);
    expect(root).toHaveAttribute("data-contrast", "yellow");
    expect(root).toHaveClass("dark");
    expect(root.style.getPropertyValue("--text-scale")).toBe("1.5");

    // Another student signs in on the same machine.
    deactivateDisplayPreferences();
    activateDisplayPreferences("student-2");
    expect(snapshot()).toEqual({ theme: "default", textScale: 100 });
    await setContrastTheme("white");

    deactivateDisplayPreferences();
    activateDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "yellow", textScale: 150 });
    expect(localStorage.getItem("learnable.contrastTheme.student-2")).toBe("white");
  });

  it("returns to the default outside an owner's pages without forgetting the choice", async () => {
    activateDisplayPreferences(GUEST);
    await setContrastTheme("yellow");
    deactivateDisplayPreferences();
    expect(root).not.toHaveAttribute("data-contrast");
    expect(localStorage.getItem("learnable.contrastTheme.guest")).toBe("yellow");
    // With no owner showing, nothing is stored.
    await setContrastTheme("dark");
    expect(localStorage.getItem("learnable.contrastTheme.guest")).toBe("yellow");
  });

  it("ignores stored values it does not know, and moves the retired white-on-black to yellow", () => {
    localStorage.setItem("learnable.contrastTheme.student-1", "neon");
    localStorage.setItem("learnable.textScale.student-1", "300");
    activateDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "default", textScale: 100 });
    localStorage.setItem("learnable.contrastTheme.student-2", "black");
    activateDisplayPreferences("student-2");
    expect(snapshot().theme).toBe("yellow");
  });

  it("keeps a guest's choices in this browser only and never calls the Backend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    activateDisplayPreferences(GUEST);
    await setContrastTheme("dark");
    await setTextScale(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("learnable.contrastTheme.guest")).toBe("dark");
    expect(localStorage.getItem("learnable.textScale.guest")).toBe("200");
  });

  it("never mixes a guest's choices into an account", async () => {
    activateDisplayPreferences(GUEST);
    await setContrastTheme("yellow");
    deactivateDisplayPreferences();
    activateDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "default", textScale: 100 });
  });

  it.each([
    ["Default", "default"],
    ["Dark", "dark"],
    ["HighContrast", "yellow"],
    ["Light", "white"],
  ])("shows the Backend's %s as the %s theme and keeps it locally", async (stored, theme) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ ...preferences, contrastTheme: stored }));
    activateDisplayPreferences("student-1");
    await loadDisplayPreferences("student-1");
    expect(snapshot().theme).toBe(theme);
    expect(localStorage.getItem("learnable.contrastTheme.student-1")).toBe(theme);
  });

  it.each([
    [16, 100],
    [20, 125],
    [24, 150],
    [29, 175],
    [40, 200],
  ])("shows a Backend font size of %spx as %s%%", async (fontSize, textScale) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ ...preferences, fontSize }));
    activateDisplayPreferences("student-1");
    await loadDisplayPreferences("student-1");
    expect(snapshot().textScale).toBe(textScale);
  });

  it("keeps the local copy when the Backend cannot be read or sends values it does not know", async () => {
    localStorage.setItem("learnable.contrastTheme.student-1", "dark");
    localStorage.setItem("learnable.textScale.student-1", "125");
    activateDisplayPreferences("student-1");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("offline"));
    await loadDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "dark", textScale: 125 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ contrastTheme: "Neon", fontSize: 0 }));
    await loadDisplayPreferences("student-1");
    expect(snapshot()).toEqual({ theme: "dark", textScale: 125 });
  });

  it("never lets a late Backend answer override a choice made meanwhile", async () => {
    let answer!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch")
      .mockImplementation(async () => reply(preferences))
      .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    activateDisplayPreferences("student-1");
    const loading = loadDisplayPreferences("student-1");
    const saving = setContrastTheme("white");
    answer(reply({ ...preferences, contrastTheme: "Dark" }));
    await Promise.all([loading, saving]);
    expect(snapshot().theme).toBe("white");
  });

  it("saves an account's choices as Backend values, merging quick choices into one request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => reply({ ...preferences, userId: "u-1" }));
    activateDisplayPreferences("student-1");
    const first = setContrastTheme("dark");
    void setContrastTheme("white");
    void setTextScale(150);
    const last = setContrastTheme("yellow");
    await Promise.all([first, last]);
    const puts = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "PUT")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(puts).toHaveLength(2);
    expect(puts[0]).toMatchObject({ contrastTheme: "Dark", fontSize: 16 });
    expect(puts[1]).toMatchObject({ contrastTheme: "HighContrast", fontSize: 24 });
    // Only the fields of the request model go back.
    expect(puts[0]).not.toHaveProperty("userId");
  });
});

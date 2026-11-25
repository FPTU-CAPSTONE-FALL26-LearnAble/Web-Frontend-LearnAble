import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import {
  GUEST,
  activateDisplayPreferences,
  deactivateDisplayPreferences,
} from "@/lib/a11y/displayPreferences";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { AccessibilityCard } from "./AccessibilityCard";

const reply = (data: unknown) =>
  new Response(JSON.stringify({ success: true, message: null, data, errors: null }));

function renderCard(owner: string) {
  activateDisplayPreferences(owner);
  return render(
    <MemoryRouter>
      <header>
        <AccessibilityCard />
      </header>
      <main>
        <p>Page content</p>
        <LiveRegion />
      </main>
    </MemoryRouter>,
  );
}

describe("AccessibilityCard", () => {
  const root = document.documentElement;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    deactivateDisplayPreferences();
    vi.restoreAllMocks();
  });

  it("opens from a labelled button and closes with Escape, back on the button", async () => {
    const { container } = renderCard(GUEST);
    const toggle = screen.getByRole("button", { name: "Accessibility" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Accessibility: text size and colours" })).toBeVisible();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole("combobox", { name: "Text size" }));
    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    renderCard(GUEST);
    await userEvent.click(screen.getByRole("button", { name: "Accessibility" }));
    await userEvent.click(screen.getByText("Page content"));
    expect(screen.getByRole("button", { name: "Accessibility" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a guest's text size and theme in this browser, says so, and offers sign-in", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderCard(GUEST);
    await userEvent.click(screen.getByRole("button", { name: "Accessibility" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Text size" }), "150");
    expect(root.style.getPropertyValue("--text-scale")).toBe("1.5");
    expect(await screen.findByText("Text size: 150%")).toBeInTheDocument();

    const themes = screen.getByRole("group", { name: "Theme" });
    expect(themes).toHaveAccessibleDescription("Current theme: Light");
    await userEvent.click(screen.getByRole("radio", { name: "Yellow on black" }));
    expect(root).toHaveAttribute("data-contrast", "yellow");
    expect(themes).toHaveAccessibleDescription("Current theme: Yellow on black");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("learnable.textScale.guest")).toBe("150");
    expect(localStorage.getItem("learnable.contrastTheme.guest")).toBe("yellow");
    expect(screen.getByText(/Saved in this browser only/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/student/login");
  });

  it("saves a signed-in student's choices to the account", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => reply({ contrastTheme: "Default", fontSize: 16 }));
    renderCard("student-1");
    await userEvent.click(screen.getByRole("button", { name: "Accessibility" }));
    expect(screen.getByText(/Saved to your account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All accessibility settings" })).toHaveAttribute(
      "href",
      "/settings/accessibility",
    );

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    await vi.waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
      expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ contrastTheme: "Dark" });
    });
  });

  it("says in words when the account cannot be reached, and keeps the change", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    renderCard("student-1");
    await userEvent.click(screen.getByRole("button", { name: "Accessibility" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Text size" }), "200");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save to your account.");
    expect(root.style.getPropertyValue("--text-scale")).toBe("2");
  });
});

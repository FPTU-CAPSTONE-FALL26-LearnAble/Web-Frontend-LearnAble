import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { activateDisplayPreferences, deactivateDisplayPreferences } from "@/lib/a11y/displayPreferences";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { ContrastThemePicker } from "./ContrastThemePicker";

const reply = (data: unknown) =>
  new Response(JSON.stringify({ success: true, message: null, data, errors: null }));

function renderPicker() {
  return render(
    <main>
      <ContrastThemePicker />
      <LiveRegion />
    </main>,
  );
}

describe("ContrastThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    activateDisplayPreferences("student-1");
  });
  afterEach(() => {
    deactivateDisplayPreferences();
    vi.restoreAllMocks();
  });

  it("offers one named radio per Backend theme, applies the choice at once and saves it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => reply({ contrastTheme: "Default" }));
    const { container } = renderPicker();
    expect(screen.getByRole("group", { name: "Colour theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /^Light/ })).toBeChecked();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole("radio", { name: /^Yellow on black/ }));
    expect(screen.getByRole("radio", { name: /^Yellow on black/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-contrast", "yellow");
    expect(localStorage.getItem("learnable.contrastTheme.student-1")).toBe("yellow");
    expect(await screen.findByText("Colour theme: Yellow on black")).toBeInTheDocument();

    await vi.waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
      expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ contrastTheme: "HighContrast" });
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says in words when the theme cannot be saved, and keeps it", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    renderPicker();
    await userEvent.click(screen.getByRole("radio", { name: /^Dark/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your colour theme could not be saved to your account.",
    );
    expect(screen.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  });
});

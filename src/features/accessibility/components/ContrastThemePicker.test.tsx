import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { activateContrastTheme, deactivateContrastTheme } from "@/lib/a11y/contrastTheme";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { ContrastThemePicker } from "./ContrastThemePicker";

describe("ContrastThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    activateContrastTheme("student-1");
  });
  afterEach(deactivateContrastTheme);

  it("offers every theme as a named radio and applies the choice at once", async () => {
    const { container } = render(
      <main>
        <ContrastThemePicker />
        <LiveRegion />
      </main>,
    );
    const group = screen.getByRole("group", { name: "Colour theme" });
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /^Light/ })).toBeChecked();
    expect(group).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole("radio", { name: /^Yellow on black/ }));
    expect(screen.getByRole("radio", { name: /^Yellow on black/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-contrast", "yellow");
    expect(localStorage.getItem("learnable.contrastTheme.student-1")).toBe("yellow");
    expect(await screen.findByText("Colour theme: Yellow on black")).toBeInTheDocument();
  });
});

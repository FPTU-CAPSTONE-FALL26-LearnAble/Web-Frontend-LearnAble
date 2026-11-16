import { getContrastTheme, initContrastTheme, setContrastTheme } from "./contrastTheme";

describe("contrast theme", () => {
  const root = document.documentElement;
  beforeEach(() => {
    localStorage.clear();
    setContrastTheme("default");
    localStorage.clear();
  });

  it("starts on the default theme and marks nothing", () => {
    initContrastTheme();
    expect(getContrastTheme()).toBe("default");
    expect(root).not.toHaveAttribute("data-contrast");
    expect(root).not.toHaveClass("dark");
  });

  it("applies a chosen theme, keeps it on the device and restores it", () => {
    setContrastTheme("black");
    expect(root).toHaveAttribute("data-contrast", "black");
    expect(root).toHaveClass("dark");
    expect(localStorage.getItem("learnable.contrastTheme")).toBe("black");

    setContrastTheme("white");
    expect(root).toHaveAttribute("data-contrast", "white");
    expect(root).not.toHaveClass("dark");

    root.removeAttribute("data-contrast");
    initContrastTheme();
    expect(root).toHaveAttribute("data-contrast", "white");
  });

  it("ignores a stored value it does not know", () => {
    localStorage.setItem("learnable.contrastTheme", "neon");
    initContrastTheme();
    expect(getContrastTheme()).toBe("default");
  });
});

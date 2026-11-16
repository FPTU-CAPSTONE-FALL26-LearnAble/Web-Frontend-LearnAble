import {
  activateContrastTheme,
  deactivateContrastTheme,
  getContrastTheme,
  setContrastTheme,
} from "./contrastTheme";

describe("contrast theme", () => {
  const root = document.documentElement;
  beforeEach(() => {
    localStorage.clear();
    deactivateContrastTheme();
  });

  it("starts on the default theme and marks nothing", () => {
    activateContrastTheme("student-1");
    expect(getContrastTheme()).toBe("default");
    expect(root).not.toHaveAttribute("data-contrast");
    expect(root).not.toHaveClass("dark");
  });

  it("keeps each account's choice apart on a shared computer", () => {
    activateContrastTheme("student-1");
    setContrastTheme("black");
    expect(root).toHaveAttribute("data-contrast", "black");
    expect(root).toHaveClass("dark");
    expect(localStorage.getItem("learnable.contrastTheme.student-1")).toBe("black");

    // Another student signs in on the same machine.
    deactivateContrastTheme();
    activateContrastTheme("student-2");
    expect(getContrastTheme()).toBe("default");
    expect(root).not.toHaveAttribute("data-contrast");
    setContrastTheme("white");

    deactivateContrastTheme();
    activateContrastTheme("student-1");
    expect(root).toHaveAttribute("data-contrast", "black");
    expect(localStorage.getItem("learnable.contrastTheme.student-2")).toBe("white");
  });

  it("returns to the default outside the student area without forgetting the choice", () => {
    activateContrastTheme("student-1");
    setContrastTheme("yellow");
    deactivateContrastTheme();
    expect(root).not.toHaveAttribute("data-contrast");
    expect(root).not.toHaveClass("dark");
    expect(localStorage.getItem("learnable.contrastTheme.student-1")).toBe("yellow");
    // With no account showing, nothing is stored.
    setContrastTheme("black");
    expect(localStorage.length).toBe(1);
  });

  it("ignores a stored value it does not know", () => {
    localStorage.setItem("learnable.contrastTheme.student-1", "neon");
    activateContrastTheme("student-1");
    expect(getContrastTheme()).toBe("default");
  });
});

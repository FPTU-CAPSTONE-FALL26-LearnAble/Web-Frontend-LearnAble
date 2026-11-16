import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useArrowKeyNavigation } from "./useArrowKeyNavigation";

function Page({ dialog = false }: { dialog?: boolean }) {
  useArrowKeyNavigation("main");
  return (
    <>
      <button>Outside</button>
      <main id="main">
        <h1 tabIndex={-1}>Title</h1>
        <a href="/one">First link</a>
        <button>Second button</button>
        <button disabled>Disabled</button>
        <label>
          Name <input type="text" />
        </label>
        <label>
          Agree <input type="checkbox" />
        </label>
        <div role="menu" tabIndex={-1}>
          <button role="menuitem">Menu item</button>
        </div>
        <button>Last button</button>
      </main>
      {dialog ? <div role="dialog" aria-label="Open dialog" /> : null}
    </>
  );
}

describe("useArrowKeyNavigation", () => {
  it("moves down and up through the page's controls, skipping disabled ones", async () => {
    render(<Page />);
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "First link" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Second button" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    // A text field keeps its arrows for the caret.
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
  });

  it("stops at the ends and leaves components with their own arrow keys alone", async () => {
    render(<Page />);
    screen.getByRole("checkbox", { name: "Agree" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Menu item" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Menu item" })).toHaveFocus();

    screen.getByRole("button", { name: "Last button" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Last button" })).toHaveFocus();
    screen.getByRole("link", { name: "First link" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("link", { name: "First link" })).toHaveFocus();
  });

  it("continues from a focused heading and does nothing outside the page or under a dialog", async () => {
    const { rerender } = render(<Page />);
    screen.getByRole("heading", { name: "Title" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "First link" })).toHaveFocus();

    screen.getByRole("button", { name: "Outside" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();

    rerender(<Page dialog />);
    screen.getByRole("link", { name: "First link" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "First link" })).toHaveFocus();
  });
});

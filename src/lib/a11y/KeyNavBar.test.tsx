import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { KeyNavBar } from "@/lib/a11y/KeyNavBar";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

const actions = [
  { shortcut: "1", label: "Home", to: "/" },
  { shortcut: "2", label: "The challenge", to: "/challenges" },
  { shortcut: "Alt+S", label: "Sign in", to: "/student/login" },
];

function view(path = "/") {
  const page = (heading: string) => (
    <>
      <main id="main">
        <h1>{heading}</h1>
        <label htmlFor="name">Name</label>
        <input id="name" />
        <button type="button">First</button>
        <button type="button">Second</button>
      </main>
      <KeyNavBar actions={actions} />
    </>
  );
  const router = createMemoryRouter(
    [
      { path: "/", element: page("Home page") },
      { path: "/challenges", element: page("Challenge page") },
      { path: "/student/login", element: page("Sign-in page") },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

describe("KeyNavBar", () => {
  it("shows every destination as a named button with its key, and marks the current page", async () => {
    const { container } = view("/challenges");
    const bar = screen.getByRole("navigation", { name: "Keyboard keys" });
    const links = within(bar).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["1Home", "2The challenge", "Alt+SSign in"]);
    expect(within(bar).getByRole("link", { name: /The challenge/ })).toHaveAttribute("aria-current", "page");
    expect(within(bar).getByRole("link", { name: /Sign in/ })).toHaveAttribute("aria-keyshortcuts", "Alt+S");
    await expectNoAxeViolations(container);
  });

  it("opens a page with its number key", async () => {
    const user = userEvent.setup();
    const { router } = view();
    await user.keyboard("2");
    expect(router.state.location.pathname).toBe("/challenges");
  });

  it("ignores number keys while typing, but an Alt chord still works from a field", async () => {
    const user = userEvent.setup();
    const { router } = view();
    await user.click(screen.getByLabelText("Name"));
    await user.keyboard("2");
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByLabelText("Name")).toHaveValue("2");
    await user.keyboard("{Alt>}s{/Alt}");
    expect(router.state.location.pathname).toBe("/student/login");
  });

  it("moves between the page's controls with the arrow keys", async () => {
    const user = userEvent.setup();
    view();
    screen.getByRole("button", { name: "First" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });
});

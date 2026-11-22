import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRouteAnnouncer } from "./useRouteAnnouncer";
import { LiveRegion } from "./LiveRegion";

it("focuses the screen heading without repeating it in a live region", async () => {
  function Page() { useRouteAnnouncer("Settings — LearnAble", "Settings"); return <main><h1>Settings</h1></main>; }
  const { container } = render(<><LiveRegion /><Page /></>);
  expect(screen.getByRole("heading", { name: "Settings" })).toHaveFocus();
  expect(document.title).toBe("Settings — LearnAble");
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
});

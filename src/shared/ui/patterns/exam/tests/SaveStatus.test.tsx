import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { SaveStatus } from "../SaveStatus";

it("keeps ordinary autosaves readable on demand without creating live announcements", async () => {
  const { container, rerender } = render(<><LiveRegion /><SaveStatus state="saving" /></>);
  expect(screen.getByText("Saving")).toBeVisible();
  rerender(<><LiveRegion /><SaveStatus state="saved" /></>);
  expect(screen.getByText("Saved")).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
});

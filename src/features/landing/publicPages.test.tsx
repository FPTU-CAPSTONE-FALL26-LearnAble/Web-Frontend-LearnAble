import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { PublicLayout } from "@/features/landing/components/PublicLayout";
import { ChallengesRoute } from "@/features/landing/routes/ChallengesRoute";
import { HowItWorksRoute } from "@/features/landing/routes/HowItWorksRoute";
import { LandingRoute } from "@/features/landing/routes/LandingRoute";
import { PublicAccessibilityRoute } from "@/features/landing/routes/PublicAccessibilityRoute";
import { SolutionRoute } from "@/features/landing/routes/SolutionRoute";
import { challenges, solution } from "@/features/landing/content";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function view(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <PublicLayout />,
        children: [
          { path: "/", element: <LandingRoute /> },
          { path: "/challenges", element: <ChallengesRoute /> },
          { path: "/solution", element: <SolutionRoute /> },
          { path: "/how-it-works", element: <HowItWorksRoute /> },
          { path: "/accessibility", element: <PublicAccessibilityRoute /> },
        ],
      },
      { path: "/student/login", element: <h1>Sign-in page</h1> },
    ],
    { initialEntries: [path] },
  );
  const rendered = render(<RouterProvider router={router} />);
  return { router, ...rendered };
}

const pages = [
  ["/", "Study, practise and take exams on your own terms.", "Home — LearnAble"],
  ["/challenges", "Getting into university is only the first barrier.", "The challenge — LearnAble"],
  ["/solution", "One platform that answers each barrier.", "Our solution — LearnAble"],
  ["/how-it-works", "Every role works from the same information.", "How it works — LearnAble"],
  ["/accessibility", "Built to be used without sight, and with low vision.", "Accessibility — LearnAble"],
] as const;

describe("public site", () => {
  beforeAll(() => {
    // jsdom does not scroll; the layout resets the scroll on each new page.
    window.scrollTo = vi.fn();
  });
  beforeEach(() => localStorage.clear());

  it.each(pages)("%s is its own page with a focused heading, a tab title and no axe violations", async (path, heading, title) => {
    const { container } = view(path);
    const h1 = screen.getByRole("heading", { level: 1, name: heading });
    expect(h1).toHaveFocus();
    expect(document.title).toBe(title);
    await expectNoAxeViolations(container);
  });

  it("names every page in the navigation and marks the current one", () => {
    view("/solution");
    const nav = screen.getByRole("navigation", { name: "Site pages" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Home",
      "The challenge",
      "Our solution",
      "How it works",
      "Accessibility",
    ]);
    expect(within(nav).getByRole("link", { name: "Our solution" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("leads from the home page to each topic page and on to the next one", async () => {
    const user = userEvent.setup();
    const { router } = view("/");
    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("link", { name: /The challenge/ }));
    expect(router.state.location.pathname).toBe("/challenges");

    await user.click(screen.getByRole("link", { name: "Next: See how LearnAble responds" }));
    expect(router.state.location.pathname).toBe("/solution");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("pairs every barrier on the challenge page with an answer on the solution page", () => {
    expect(solution.items.map((item) => item.barrier)).toEqual(challenges.items.map((item) => item.title));
  });

  it("states no figures, since none of them could be sourced", () => {
    for (const [path] of pages) {
      const { unmount } = view(path);
      // The text-size choices (100%, 150% …) are controls, not claims.
      const copy = screen.getByRole("main").cloneNode(true) as HTMLElement;
      copy.querySelectorAll("select").forEach((select) => select.remove());
      expect(copy.textContent).not.toMatch(/\d+\s*(%|percent|students|universities)/i);
      unmount();
    }
  });

  it("lets a guest change the text size from the accessibility page and keeps it in this browser", async () => {
    const user = userEvent.setup();
    view("/accessibility");
    await user.selectOptions(within(screen.getByRole("main")).getByLabelText("Text size"), "150");
    expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe("1.5");
    expect(localStorage.getItem("learnable.textScale.guest")).toBe("150");
  });

  it("offers sign-in from every page", () => {
    view("/how-it-works");
    const signIn = screen.getAllByRole("link", { name: /Sign in/ })[0];
    expect(screen.getByRole("banner")).toContainElement(signIn);
    // The public site is for students: it opens the accessible student sign-in.
    expect(signIn).toHaveAttribute("href", "/student/login");
  });
});

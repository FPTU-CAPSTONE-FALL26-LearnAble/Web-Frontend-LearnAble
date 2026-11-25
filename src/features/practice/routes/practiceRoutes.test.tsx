import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { studentPracticeHandlers } from "@/mocks/studentPractice";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { PracticeAttemptRoute } from "./PracticeAttemptRoute";
import { PracticeListRoute } from "./PracticeListRoute";
import { PracticeResultRoute } from "./PracticeResultRoute";

const server = setupServer(...studentPracticeHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

const OPEN = "7b000000-0000-4000-8000-000000000001";
const RELEASED = "7b000000-0000-4000-8000-000000000003";

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/practice", element: <PracticeListRoute /> },
      { path: "/practice/:sessionId", element: <PracticeAttemptRoute /> },
      { path: "/practice/:sessionId/result", element: <PracticeResultRoute /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
      <LiveRegion />
    </QueryClientProvider>,
  );
  return router;
}

describe("student practice", () => {
  beforeEach(() => sessionStorage.clear());

  it("lists sessions open first, with what the student can do in each", async () => {
    renderAt("/practice");
    const list = await screen.findByRole("list", { name: "Practice sessions" });
    const cards = within(list).getAllByRole("article");
    expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual([
      "PRO192 · Object-oriented basics",
      "MAD101 · Sets and relations",
      "PRO192 · Warm-up quiz",
    ]);
    expect(within(cards[0]).getByText("Open now")).toBeInTheDocument();
    expect(within(cards[0]).getByRole("link", { name: "Start or continue" })).toHaveAttribute(
      "href",
      `/practice/${OPEN}`,
    );
    expect(within(cards[1]).getByText(/^Opens /)).toBeInTheDocument();
    expect(within(cards[2]).getByRole("link", { name: "View result" })).toHaveAttribute(
      "href",
      `/practice/${RELEASED}/result`,
    );
  });

  it("answers in the exam player, saves to the server and submits to the result", async () => {
    const router = renderAt(`/practice/${OPEN}`);
    // The attempt opens on the contents, as an exam does.
    const first = await screen.findByRole("button", { name: /Question 1/ }, { timeout: 3000 });
    await userEvent.click(first);
    await userEvent.click(await screen.findByRole("radio", { name: /new/ }));
    expect(await screen.findByText("Saved", {}, { timeout: 3000 })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open options" }));
    await userEvent.click(await screen.findByRole("button", { name: /Go to submission page/ }));
    const dialog = await screen.findByRole("dialog", { name: "Submit this practice attempt?" });
    expect(within(dialog).getByText(/You answered 1 of 4 questions/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit attempt" }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/practice/${OPEN}/result`), {
      timeout: 3000,
    });
    // Results of this session are not released yet: the page says so.
    expect(await screen.findByText("Results have not been released yet.", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("shows a released result with each question's review in words", async () => {
    renderAt(`/practice/${RELEASED}/result`);
    expect(await screen.findByText("2 of 4 points", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    const review = screen.getByRole("list", { name: "Question review" });
    const second = within(review).getByRole("article", { name: /Question 2/ });
    expect(within(second).getByText("0 of 1 points")).toBeInTheDocument();
    const staticOption = within(second).getByText("static").closest("li")!;
    expect(within(staticOption).getByText("Your choice")).toBeInTheDocument();
    expect(within(staticOption).queryByText("Correct answer")).not.toBeInTheDocument();
  });
});

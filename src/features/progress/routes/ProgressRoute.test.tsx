import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { studentPracticeHandlers } from "@/mocks/studentPractice";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { ProgressRoute } from "./ProgressRoute";

const server = setupServer(...studentPracticeHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderProgress() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <main>
          <ProgressRoute />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProgressRoute", () => {
  it("summarises released practice results in words", async () => {
    const { container } = renderProgress();
    const overview = await screen.findByRole("region", { name: "Overview" }, { timeout: 3000 });
    expect(within(overview).getByText("Attempts with results").nextElementSibling).toHaveTextContent("1");
    expect(within(overview).getByText("50%")).toBeInTheDocument();
    expect(within(overview).getByText("5 out of 10 on average")).toBeInTheDocument();
    expect(within(overview).getByText("1 of 1")).toBeInTheDocument();

    const byType = screen.getByRole("region", { name: "Accuracy by question type" });
    const rows = within(byType).getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      "Multiple choice100% · 1 of 1 points · 1 question",
      "Multiple response0% · 0 of 1 points · 1 question",
      "Essay100% · 1 of 1 points · 1 question",
      "Coding0% · 0 of 1 points · 1 question",
    ]);

    const history = screen.getByRole("region", { name: "Practice history" });
    const card = within(history).getByRole("article", { name: "PRO192 · Warm-up quiz" });
    expect(within(card).getByText("2 of 4 points (50%)")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Review answers" })).toHaveAttribute(
      "href",
      "/practice/7b000000-0000-4000-8000-000000000003/result",
    );
    await expectNoAxeViolations(container);
  });

  it("says when a released result could not be loaded", async () => {
    server.use(
      http.get("*/me/practice-sessions/:id/result", () =>
        HttpResponse.json({ success: false, message: "Unavailable", data: null, errors: null }, { status: 500 }),
      ),
    );
    renderProgress();
    expect(
      await screen.findByText("1 released result could not be loaded, so this summary is incomplete.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No practice results yet/)).toBeInTheDocument();
  });
});

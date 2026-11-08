import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LecturerSidebar } from "./LecturerSidebar";

vi.mock("@/api/notifications", () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));

const user = {
  id: "lecturer-1",
  fullName: "Lecturer One",
  email: "lecturer@fpt.edu.vn",
  role: "Lecturer",
};

function renderSidebar(activePath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[activePath]}>
        <LecturerSidebar
          activePath={activePath}
          user={user}
          campus="Hoa Lac"
          semester="Fall 2026"
          onSignOut={() => {}}
          onUnavailable={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LecturerSidebar question management", () => {
  it("opens automatically and marks the matching question child active", () => {
    renderSidebar("/lecturer/questions/practice");
    expect(
      screen.getByRole("button", { name: "Question Management" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: "Practice Questions" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("can collapse and expand the question group", async () => {
    const actor = userEvent.setup();
    renderSidebar("/lecturer/dashboard");
    const group = screen.getByRole("button", { name: "Question Management" });
    expect(group).toHaveAttribute("aria-expanded", "false");
    await actor.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Exam Questions" })).toBeVisible();
  });
});

import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { SESSION_EXPIRED_EVENT } from "@/api/client";
import { tokenStore } from "@/lib/auth/tokenStore";
import { RequireAuth } from "./RequireAuth";

describe("RequireAuth", () => {
  afterEach(() => tokenStore.clear());

  it("sends a student to the sign-in page when the session can no longer be renewed", async () => {
    tokenStore.set({ accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "2026-11-16T10:00:00Z" }, true);
    const router = createMemoryRouter(
      [
        { element: <RequireAuth />, children: [{ path: "/schedule", element: <h1>Schedule</h1> }] },
        { path: "/student/login", element: <h1>Student sign in</h1> },
      ],
      { initialEntries: ["/schedule"] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();

    act(() => {
      tokenStore.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });
    expect(await screen.findByRole("heading", { name: "Student sign in" })).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: "/schedule" });
  });
});

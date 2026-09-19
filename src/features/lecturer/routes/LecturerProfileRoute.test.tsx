import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";
import { LecturerProfileRoute } from "./LecturerProfileRoute";

describe("LecturerProfileRoute", () => {
  it("renders the signed-in lecturer with mock academic data", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    useAuthStore.setState({
      user: {
        id: "lecturer-1",
        fullName: "Lecturer One",
        email: "lecturer@fpt.edu.vn",
        role: "Lecturer",
      },
    });

    render(
      <MemoryRouter>
        <LecturerProfileRoute />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Lecturer One" })).toBeInTheDocument();
    expect(screen.getByText("LEC0001")).toBeInTheDocument();
    expect(screen.getAllByText("Software Engineering")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

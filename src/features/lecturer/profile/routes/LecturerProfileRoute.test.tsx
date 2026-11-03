import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useAuthStore } from "@/features/auth/store/authStore";
import { LecturerProfileRoute } from "./LecturerProfileRoute";

describe("LecturerProfileRoute", () => {
  it("renders only identity data from the authenticated session", () => {
    useAuthStore.setState({ user: { id: "lecturer-1", fullName: "Lecturer One", email: "lecturer@fpt.edu.vn", role: "Lecturer" } });
    render(<MemoryRouter><LecturerProfileRoute /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Lecturer One" })).toBeInTheDocument();
    expect(screen.getByText("lecturer@fpt.edu.vn")).toBeInTheDocument();
    expect(screen.queryByText("LEC0001")).not.toBeInTheDocument();
    expect(screen.getByText(/profile endpoint/i)).toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  createDepartment,
  getDepartments,
  getAdminUsers,
  setDepartmentActive,
  startSemester,
} from "@/api/admin";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { DepartmentsRoute } from "./DepartmentsRoute";
import { SemestersRoute } from "./SemestersRoute";
import { UsersRoute } from "./UsersRoute";

const page = <T,>(items: T[], totalCount = items.length, totalPages = 1) => ({
  items,
  pageNumber: 1,
  pageSize: 10,
  totalCount,
  totalPages,
  hasPreviousPage: false,
  hasNextPage: totalPages > 1,
});

vi.mock("@/api/admin", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/api/admin")>();
  return {
    ...actual,
    getDepartments: vi.fn(async () => ({
      items: [
        {
          departmentId: "d1",
          departmentCode: "SE",
          departmentName: "Software Engineering",
          description: "Builds software curricula",
          isActive: true,
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-02-10T00:00:00Z",
        },
        {
          departmentId: "d2",
          departmentCode: "AI",
          departmentName: "Artificial Intelligence",
          description: null,
          isActive: false,
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    })),
    createDepartment: vi.fn(async () => undefined),
    setDepartmentActive: vi.fn(async () => undefined),
    getAdminSemesters: vi.fn(async () =>
      page([
        {
          semesterId: "s1",
          semesterCode: "FA26",
          semesterName: "Fall 2026",
          academicYear: "2026-2027",
          startDate: "2026-09-07",
          endDate: "2026-12-20",
          status: "Planned",
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    startSemester: vi.fn(async () => undefined),
    getAdminUsers: vi.fn(async () =>
      page([
        {
          userId: "u1",
          userCode: "HE180100",
          email: "student@fpt.edu.vn",
          fullName: "Nguyen Minh Long",
          phone: null,
          dateOfBirth: null,
          gender: null,
          role: "Student",
          status: "Active",
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    createUser: vi.fn(async () => undefined),
  };
});

function view(element: ReactNode) {
  useAuthStore.setState({
    user: {
      id: "admin-test",
      fullName: "Admin One",
      email: "admin@fpt.edu.vn",
      role: "Admin",
    },
  });
  const router = createMemoryRouter([{ path: "/", element }], {
    initialEntries: ["/"],
  });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
beforeAll(() => {
  // Radix Select needs these pointer APIs, which jsdom does not implement.
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

describe("Admin workspaces", { timeout: 30000 }, () => {
  it("reads departments, filters, paginates and stays accessible", async () => {
    const user = userEvent.setup();
    const result = view(<DepartmentsRoute />);
    expect(await screen.findByText("Software Engineering")).toBeInTheDocument();
    expect(getDepartments).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1, PageSize: 10 }),
    );

    await user.type(screen.getByLabelText("Search departments"), "Software");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(getDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ SearchTerm: "Software" }),
      ),
    );

    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Inactive only" }));
    await waitFor(() =>
      expect(getDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ IsActive: false }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(getDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ PageNumber: 2 }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    await waitFor(() =>
      expect(getDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ SearchTerm: "", IsActive: undefined }),
      ),
    );
    await expectNoAxeViolations(result.container);
  });

  it("does not colour Inactive as a success status", async () => {
    view(<DepartmentsRoute />);
    expect(await screen.findByText("Artificial Intelligence")).toBeInTheDocument();
    const badge = screen.getByText("Inactive");
    expect(badge).toHaveClass("bg-muted");
    expect(badge).not.toHaveClass("bg-success");
  });

  it("validates a new department locally before calling the API", async () => {
    const user = userEvent.setup();
    view(<DepartmentsRoute />);
    await screen.findByText("Software Engineering");
    await user.click(screen.getByRole("button", { name: "New department" }));

    await user.click(screen.getByRole("button", { name: "Create department" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Department code is required.",
    );
    expect(createDepartment).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Department code"), "DS");
    await user.type(screen.getByLabelText("Department name"), "Data Science");
    await user.click(screen.getByRole("button", { name: "Create department" }));
    await waitFor(() =>
      expect(createDepartment).toHaveBeenCalledWith({
        departmentCode: "DS",
        departmentName: "Data Science",
        description: null,
      }),
    );
  });

  it("confirms before changing a department's active state", async () => {
    const user = userEvent.setup();
    view(<DepartmentsRoute />);
    await screen.findByText("Software Engineering");
    const row = screen.getByText("Software Engineering").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Deactivate" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Deactivate department?");
    expect(setDepartmentActive).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() =>
      expect(setDepartmentActive).toHaveBeenCalledWith("d1", false),
    );
  });

  it("only offers Start on a planned semester and confirms the transition", async () => {
    const user = userEvent.setup();
    view(<SemestersRoute />);
    expect(await screen.findByText("Fall 2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(startSemester).toHaveBeenCalledWith("s1"));
  });

  it("requires a valid email and an 8-character password for a new account", async () => {
    const user = userEvent.setup();
    view(<UsersRoute />);
    await screen.findByText("Nguyen Minh Long");
    expect(getAdminUsers).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1 }),
    );

    await user.click(screen.getByRole("button", { name: "New account" }));
    await user.type(screen.getByLabelText("Full name"), "Tran Thi Mai");
    await user.type(screen.getByLabelText("User code"), "HE180200");
    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Initial password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email must be a valid address.");
    expect(alert).toHaveTextContent("Password must be at least 8 characters.");
  });
});

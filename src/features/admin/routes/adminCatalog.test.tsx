import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  changeEnrollmentStatus,
  createTopic,
  createUniversity,
  getUniversities,
  universitySchema,
  updateUniversity,
  deleteStudentProfile,
  getAdminTopics,
  setUniversityActive,
  updateStudentProfile,
} from "@/api/admin";
import { ApiFailure } from "@/api/client";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { StudentProfilesRoute } from "./StudentProfilesRoute";
import { TopicsRoute } from "./TopicsRoute";
import { UniversitiesRoute } from "./UniversitiesRoute";

const page = <T,>(items: T[]) => ({
  items,
  pageNumber: 1,
  pageSize: 10,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

const student = {
  userId: "u1",
  universityId: "uni-fpt",
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
};
const university = {
  universityId: "uni-fpt",
  code: "FPTU",
  name: "FPT University",
  shortName: "FPTU",
  nameEn: null,
  address: null,
  phone: null,
  contactEmail: "contact@fpt.edu.vn",
  subdomain: "fpt",
  emailDomain: "fpt.edu.vn",
  logoUrl: null,
  status: "Active",
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
};

const subject = {
  subjectId: "sub1",
  universityId: "uni-fpt",
  departmentId: "d1",
  subjectCode: "SWE201",
  subjectNameEn: "Software Engineering",
  subjectNameVi: null,
  description: null,
  isActive: true,
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
};
vi.mock("@/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/admin")>();
  return {
    ...actual,
    getAdminSubjects: vi.fn(async () => page([subject])),
    getAdminUsers: vi.fn(async () => page([student])),
    getUniversities: vi.fn(async () => page([university])),
    getUniversityLookup: vi.fn(async () => page([university])),
    createUniversity: vi.fn(async () => undefined),
    updateUniversity: vi.fn(async () => undefined),
    setUniversityActive: vi.fn(async () => undefined),
    getMajors: vi.fn(async () =>
      page([
        {
          majorId: "m1",
          departmentId: "d1",
          majorCode: "SE",
          majorName: "Software Engineering",
          description: null,
          isActive: true,
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    getCurriculums: vi.fn(async () =>
      page([
        {
          curriculumId: "c1",
          majorId: "m1",
          curriculumCode: "SE-K18",
          curriculumName: "Software Engineering K18",
          version: "2024",
          intakeYear: 2024,
          effectiveFrom: null,
          effectiveTo: null,
          totalCredits: 145,
          status: "Active",
          approvedBy: null,
          approvedAt: null,
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    // Profiles carry no id of their own; the account's userId is the key.
    getStudentProfiles: vi.fn(async () =>
      page([
        {
          userId: "u1",
          userRole: "Student",
          majorId: "m1",
          curriculumId: "c1",
          intakeYear: 2024,
          currentSemester: 3,
          enrollmentStatus: "Studying",
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    updateStudentProfile: vi.fn(async () => undefined),
    changeEnrollmentStatus: vi.fn(async () => undefined),
    deleteStudentProfile: vi.fn(async () => undefined),
    getAdminTopics: vi.fn(async () =>
      page([
        {
          topicId: "t1",
          subjectId: "sub1",
          topicCode: "SWE201-01",
          topicName: "Architecture",
          description: "Layered and hexagonal architecture",
          displayOrder: 1,
          isActive: true,
          createdAt: "2026-01-06T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
        },
      ]),
    ),
    createTopic: vi.fn(async () => undefined),
    setTopicActive: vi.fn(async () => undefined),
  };
});

function view(element: ReactNode) {
  useAuthStore.setState({
    user: {
      id: "admin-test",
      fullName: "Admin One",
      email: "admin@fpt.edu.vn",
      role: "Admin",
      universityId: "uni-fpt",
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
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

describe("Admin catalog workspaces", { timeout: 30000 }, () => {
  it("filters topics by subject", async () => {
    const user = userEvent.setup();
    view(<TopicsRoute />);
    await screen.findByText("Architecture");

    await user.click(screen.getByLabelText("Subject"));
    await user.click(
      screen.getByRole("option", { name: "SWE201 · Software Engineering" }),
    );
    await waitFor(() =>
      expect(getAdminTopics).toHaveBeenLastCalledWith(
        expect.objectContaining({ SubjectId: "sub1" }),
      ),
    );

  });

  it("rejects a negative display order before calling the API", async () => {
    const user = userEvent.setup();
    view(<TopicsRoute />);
    await screen.findByText("Architecture");
    await user.click(screen.getByRole("button", { name: "New topic" }));

    await user.type(screen.getByLabelText("Topic code"), "SWE201-02");
    await user.type(screen.getByLabelText("Topic name"), "Testing");
    const order = screen.getByLabelText("Display order");
    await user.clear(order);
    await user.type(order, "-3");
    await user.click(screen.getByRole("button", { name: "Create topic" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Display order must be a whole number, 0 or higher.",
    );
    expect(createTopic).not.toHaveBeenCalled();
  });

  it("keys student profile writes by the account's userId", async () => {
    const user = userEvent.setup();
    view(<StudentProfilesRoute />);
    expect(
      await screen.findByText("HE180100 · Nguyen Minh Long"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/specialization/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const semester = screen.getByLabelText("Current semester");
    await user.clear(semester);
    await user.type(semester, "4");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateStudentProfile).toHaveBeenCalledWith("u1", {
        currentSemester: 4,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /Delete profile of HE180100/ }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete profile" }));
    await waitFor(() => expect(deleteStudentProfile).toHaveBeenCalledWith("u1"));
    expect(changeEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("lists universities for an admin and stays accessible", async () => {
    const result = view(<UniversitiesRoute />);
    expect(await screen.findByText("FPT University")).toBeInTheDocument();
    expect(screen.getByText("fpt.edu.vn")).toBeInTheDocument();
    await expectNoAxeViolations(result.container);
  });

  it("validates a new university before calling the API", async () => {
    const user = userEvent.setup();
    view(<UniversitiesRoute />);
    await screen.findByText("FPT University");
    await user.click(screen.getByRole("button", { name: "New university" }));
    await user.type(screen.getByLabelText("Contact email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create university" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("University code is required.");
    expect(alert).toHaveTextContent("University name is required.");
    expect(alert).toHaveTextContent("Contact email must be a valid address.");
    expect(createUniversity).not.toHaveBeenCalled();
  });

  it("shows the reason the API gave for a failed read", async () => {
    vi.mocked(getUniversities).mockRejectedValue(
      new ApiFailure({ kind: "server", status: 403 }, "You cannot view universities."),
    );
    view(<UniversitiesRoute />);
    expect(
      await screen.findByText("You cannot view universities."),
    ).toBeInTheDocument();
    vi.mocked(getUniversities).mockResolvedValue(page([university]));
  });

  it("reads a university in the shape the API returns", () => {
    expect(universitySchema.safeParse(university).success).toBe(true);
  });

  it("offers only the fields the API stores", async () => {
    const user = userEvent.setup();
    view(<UniversitiesRoute />);
    await screen.findByText("FPT University");
    await user.click(screen.getByRole("button", { name: "New university" }));
    await screen.findByLabelText("Logo URL");
    for (const label of ["Website", "Timezone", "Primary colour"]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
  });

  it("creates a university with the API request body", async () => {
    const user = userEvent.setup();
    view(<UniversitiesRoute />);
    await screen.findByText("FPT University");
    await user.click(screen.getByRole("button", { name: "New university" }));
    await user.type(screen.getByLabelText("University code"), " HUST ");
    await user.type(screen.getByLabelText("University name"), "Hanoi University");
    await user.type(screen.getByLabelText("Subdomain"), "hust");
    await user.click(screen.getByRole("button", { name: "Create university" }));

    await waitFor(() =>
      expect(createUniversity).toHaveBeenCalledWith({
        code: "HUST",
        name: "Hanoi University",
        shortName: null,
        nameEn: null,
        address: null,
        phone: null,
        contactEmail: null,
        subdomain: "hust",
        emailDomain: null,
        logoUrl: null,
      }),
    );
  });

  it("updates a university without its fixed identifiers", async () => {
    const user = userEvent.setup();
    view(<UniversitiesRoute />);
    await screen.findByText("FPT University");
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const name = await screen.findByLabelText("University name");
    expect(screen.getByLabelText("Subdomain")).toBeDisabled();
    await user.clear(name);
    await user.type(name, "FPT University Hanoi");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateUniversity).toHaveBeenCalledWith("uni-fpt", {
        name: "FPT University Hanoi",
        shortName: "FPTU",
        nameEn: null,
        address: null,
        phone: null,
        contactEmail: "contact@fpt.edu.vn",
        logoUrl: null,
      }),
    );
  });

  it("confirms before deactivating a university", async () => {
    const user = userEvent.setup();
    view(<UniversitiesRoute />);
    await screen.findByText("FPT University");
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(setUniversityActive).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() =>
      expect(setUniversityActive).toHaveBeenCalledWith("uni-fpt", false),
    );
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  cancelCourseSection,
  createCourseSection,
  createTopic,
  getAdminTopics,
  getCourseSections,
  openCourseSection,
  updateCourseSection,
} from "@/api/admin";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { CourseSectionsRoute } from "./CourseSectionsRoute";
import { SyllabiRoute } from "./SyllabiRoute";
import { TopicsRoute } from "./TopicsRoute";

const page = <T,>(items: T[]) => ({
  items,
  pageNumber: 1,
  pageSize: 10,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

const subject = {
  subjectId: "sub1",
  departmentId: "d1",
  subjectCode: "SWE201",
  subjectNameEn: "Software Engineering",
  subjectNameVi: null,
  description: null,
  isActive: true,
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
};
const semester = {
  semesterId: "sem1",
  semesterCode: "FA26",
  semesterName: "Fall 2026",
  academicYear: "2026-2027",
  startDate: "2026-09-07",
  endDate: "2026-12-20",
  status: "Ongoing",
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
};
const lecturer = {
  userId: "u9",
  userCode: "LE0001",
  email: "lecturer@fpt.edu.vn",
  fullName: "Tran Van Minh",
  phone: null,
  dateOfBirth: null,
  gender: null,
  role: "Lecturer",
  status: "Active",
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
};
const syllabus = {
  syllabusId: "sy1",
  subjectId: "sub1",
  createdBy: "u9",
  authorRole: "Lecturer",
  syllabusCode: "SWE201-SYL",
  syllabusName: "Software Engineering teaching plan",
  version: "1.0",
  isActive: true,
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

vi.mock("@/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/admin")>();
  return {
    ...actual,
    getAdminSubjects: vi.fn(async () => page([subject])),
    getAdminSemesters: vi.fn(async () => page([semester])),
    getAdminUsers: vi.fn(async () => page([lecturer])),
    getSyllabi: vi.fn(async () => page([syllabus])),
    createSyllabus: vi.fn(async () => undefined),
    setSyllabusActive: vi.fn(async () => undefined),
    getAdminTopics: vi.fn(async () =>
      page([
        {
          topicId: "t1",
          subjectId: "sub1",
          syllabusId: "sy1",
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
    getCourseSections: vi.fn(async () =>
      page([
        {
          sectionId: "cs1",
          subjectId: "sub1",
          semesterId: "sem1",
          lecturerId: null,
          lecturerRole: null,
          sectionCode: "SE1701",
          capacity: 30,
          status: "Closed",
          createdAt: "2026-01-06T00:00:00Z",
        },
      ]),
    ),
    createCourseSection: vi.fn(async () => undefined),
    updateCourseSection: vi.fn(async () => undefined),
    openCourseSection: vi.fn(async () => undefined),
    cancelCourseSection: vi.fn(async () => undefined),
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
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

describe("Admin catalog workspaces", { timeout: 30000 }, () => {
  it("resolves syllabus foreign keys to readable labels", async () => {
    const result = view(<SyllabiRoute />);
    expect(
      await screen.findByText("Software Engineering teaching plan"),
    ).toBeInTheDocument();
    // Subject and author render as labels, not raw UUIDs.
    expect(screen.getByText("SWE201 · Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("LE0001 · Tran Van Minh")).toBeInTheDocument();
    expect(screen.queryByText("sub1")).not.toBeInTheDocument();
    await expectNoAxeViolations(result.container);
  });

  it("filters topics by subject and syllabus", async () => {
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

    await user.click(screen.getByLabelText("Syllabus"));
    await user.click(screen.getByRole("option", { name: "SWE201-SYL · 1.0" }));
    await waitFor(() =>
      expect(getAdminTopics).toHaveBeenLastCalledWith(
        expect.objectContaining({ SyllabusId: "sy1" }),
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

  it("offers only the transitions valid for a closed section", async () => {
    const user = userEvent.setup();
    view(<CourseSectionsRoute />);
    await screen.findByText("SE1701");

    // Closed: can reopen or cancel, but "Close" is meaningless.
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel$/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Open" }));
    await waitFor(() => expect(openCourseSection).toHaveBeenCalledWith("cs1"));
    expect(cancelCourseSection).not.toHaveBeenCalled();
  });

  it("shows an unassigned lecturer honestly and sends null when left unset", async () => {
    const user = userEvent.setup();
    view(<CourseSectionsRoute />);
    await screen.findByText("SE1701");
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(getCourseSections).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1 }),
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateCourseSection).toHaveBeenCalledWith("cs1", {
        lecturerId: null,
        capacity: 30,
      }),
    );
  });

  it("requires a subject, a semester and a section code to create", async () => {
    const user = userEvent.setup();
    view(<CourseSectionsRoute />);
    await screen.findByText("SE1701");
    await user.click(screen.getByRole("button", { name: "New course section" }));
    await user.click(screen.getByRole("button", { name: "Create section" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Subject is required.");
    expect(alert).toHaveTextContent("Semester is required.");
    expect(alert).toHaveTextContent("Section code is required.");
    expect(createCourseSection).not.toHaveBeenCalled();
  });
});

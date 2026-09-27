import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import {
  pageSchema,
  queryString,
  type Page,
  type ReadFilters,
} from "@/api/catalog";

/**
 * Admin workspace contract — mirrors the deployed LearnAble OpenAPI document
 * (Departments, Majors, Specializations, Subjects, Semesters, Curriculums,
 * Users, StudentProfiles, LecturerProfiles).
 *
 * Reads keep the `catalog.ts` conventions: paged envelope, null → "Not
 * available". Writes are real backend calls — no local simulation — so a
 * rejected write must surface as ApiFailure rather than a success toast.
 */

const unavailable = "Not available";
const text = (value: string | null | undefined) => value ?? unavailable;

/** Server enums. Keep in sync with `components.schemas` of the OpenAPI document. */
export const courseSectionStatuses = ["Open", "Closed", "Cancelled"] as const;
export const userRoles = ["Student", "Lecturer", "Examiner", "Admin"] as const;
export const userStatuses = ["Active", "Inactive"] as const;
export const semesterStatuses = ["Planned", "Ongoing", "Closed"] as const;
export const curriculumStatuses = ["Draft", "Active", "Archived"] as const;
export const enrollmentStatuses = [
  "Studying",
  "Reserved",
  "Graduated",
  "DroppedOut",
] as const;
export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

/* ------------------------------------------------------------------ schemas */

export const departmentSchema = z
  .object({
    departmentId: z.string(),
    departmentCode: z.string().nullable(),
    departmentName: z.string().nullable(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    departmentCode: text(row.departmentCode),
    departmentName: text(row.departmentName),
  }));

export const majorSchema = z
  .object({
    majorId: z.string(),
    departmentId: z.string(),
    majorCode: z.string().nullable(),
    majorName: z.string().nullable(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    majorCode: text(row.majorCode),
    majorName: text(row.majorName),
  }));

export const specializationSchema = z
  .object({
    specializationId: z.string(),
    majorId: z.string(),
    specializationCode: z.string().nullable(),
    specializationName: z.string().nullable(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    specializationCode: text(row.specializationCode),
    specializationName: text(row.specializationName),
  }));

export const adminSubjectSchema = z
  .object({
    subjectId: z.string(),
    departmentId: z.string().nullable(),
    subjectCode: z.string().nullable(),
    subjectNameEn: z.string().nullable(),
    subjectNameVi: z.string().nullable(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    subjectCode: text(row.subjectCode),
    subjectNameEn: text(row.subjectNameEn),
  }));

export const adminSemesterSchema = z
  .object({
    semesterId: z.string(),
    semesterCode: z.string().nullable(),
    semesterName: z.string().nullable(),
    academicYear: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    semesterCode: text(row.semesterCode),
    semesterName: text(row.semesterName),
    academicYear: text(row.academicYear),
    status: text(row.status),
  }));

export const curriculumSchema = z
  .object({
    curriculumId: z.string(),
    majorId: z.string(),
    curriculumCode: z.string().nullable(),
    curriculumName: z.string().nullable(),
    version: z.string().nullable(),
    intakeYear: z.number(),
    effectiveFrom: z.string().nullable(),
    effectiveTo: z.string().nullable(),
    totalCredits: z.number().nullable(),
    status: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    curriculumCode: text(row.curriculumCode),
    curriculumName: text(row.curriculumName),
    version: text(row.version),
    status: text(row.status),
  }));

export const adminUserSchema = z
  .object({
    userId: z.string(),
    userCode: z.string().nullable(),
    email: z.string().nullable(),
    fullName: z.string().nullable(),
    phone: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    gender: z.string().nullable(),
    role: z.string().nullable(),
    status: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    userCode: text(row.userCode),
    email: text(row.email),
    fullName: text(row.fullName),
    role: text(row.role),
    status: text(row.status),
  }));

export const studentProfileSchema = z
  .object({
    studentProfileId: z.string(),
    userId: z.string(),
    userRole: z.string().nullable(),
    majorId: z.string(),
    specializationId: z.string().nullable(),
    curriculumId: z.string(),
    intakeYear: z.number(),
    currentSemester: z.number(),
    enrollmentStatus: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    enrollmentStatus: text(row.enrollmentStatus),
  }));

export const lecturerProfileSchema = z
  .object({
    lecturerProfileId: z.string(),
    userId: z.string(),
    userRole: z.string().nullable(),
    departmentId: z.string().nullable(),
    academicRank: z.string().nullable(),
    officeRoom: z.string().nullable(),
    hireDate: z.string().nullable(),
    bio: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    academicRank: text(row.academicRank),
  }));

export const courseSectionSchema = z
  .object({
    sectionId: z.string(),
    subjectId: z.string(),
    semesterId: z.string(),
    // Paired with `lecturerRole` exactly as profiles pair `userId`/`userRole`,
    // so this is the lecturer's user id, not a lecturer-profile id.
    lecturerId: z.string().nullable(),
    lecturerRole: z.string().nullable(),
    sectionCode: z.string().nullable(),
    capacity: z.number().nullable(),
    status: z.string().nullable(),
    createdAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    sectionCode: text(row.sectionCode),
    status: text(row.status),
  }));

export const syllabusSchema = z
  .object({
    syllabusId: z.string(),
    subjectId: z.string(),
    createdBy: z.string().nullable(),
    authorRole: z.string().nullable(),
    syllabusCode: z.string().nullable(),
    syllabusName: z.string().nullable(),
    version: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    syllabusCode: text(row.syllabusCode),
    syllabusName: text(row.syllabusName),
    version: text(row.version),
  }));

/** Fuller than `catalog.ts`'s `topicSchema`, which the lecturer selectors use. */
export const adminTopicSchema = z
  .object({
    topicId: z.string(),
    subjectId: z.string(),
    syllabusId: z.string().nullable(),
    topicCode: z.string().nullable(),
    topicName: z.string().nullable(),
    description: z.string().nullable(),
    displayOrder: z.number(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    topicCode: text(row.topicCode),
    topicName: text(row.topicName),
  }));

export type CourseSection = z.output<typeof courseSectionSchema>;
export type Syllabus = z.output<typeof syllabusSchema>;
export type AdminTopic = z.output<typeof adminTopicSchema>;
export type Department = z.output<typeof departmentSchema>;
export type Major = z.output<typeof majorSchema>;
export type Specialization = z.output<typeof specializationSchema>;
export type AdminSubject = z.output<typeof adminSubjectSchema>;
export type AdminSemester = z.output<typeof adminSemesterSchema>;
export type Curriculum = z.output<typeof curriculumSchema>;
export type AdminUser = z.output<typeof adminUserSchema>;
export type StudentProfile = z.output<typeof studentProfileSchema>;
export type LecturerProfile = z.output<typeof lecturerProfileSchema>;

/* ------------------------------------------------------------- transport */

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: data.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

/** A `200 { success: false }` body is a failure, not an empty result. */
function unwrap<T>(response: {
  success: boolean;
  message?: string | null;
  data?: T | null;
}): T {
  if (!response.success || response.data === null || response.data === undefined) {
    throw new ApiFailure({ kind: "server", status: 200 });
  }
  return response.data;
}

async function readPage<T>(
  resource: string,
  item: z.ZodTypeAny,
  filters: ReadFilters,
): Promise<Page<T>> {
  const response = await request(
    `/${resource}${queryString(filters)}`,
    envelope(pageSchema(item)),
  );
  return unwrap(response) as Page<T>;
}

async function readOne<T>(
  resource: string,
  id: string,
  item: z.ZodTypeAny,
): Promise<T> {
  const response = await request(`/${resource}/${id}`, envelope(item));
  return unwrap(response) as T;
}

/**
 * Writes accept whatever envelope the endpoint returns (`ObjectApiResponse`
 * carries a null payload on success), so only `success` is asserted.
 */
async function write(
  resource: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<void> {
  const response = await request(
    `/${resource}`,
    z.object({
      success: z.boolean(),
      message: z.string().nullable().optional(),
      errors: z.array(z.string()).nullable().optional(),
    }),
    body === undefined ? { method } : { method, json: body },
  );
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200 });
}

/* ---------------------------------------------------------- request bodies */

export type CreateDepartmentBody = {
  departmentCode: string;
  departmentName: string;
  description?: string | null;
};
export type UpdateDepartmentBody = {
  departmentName: string;
  description?: string | null;
};
export type CreateMajorBody = {
  departmentId: string;
  majorCode: string;
  majorName: string;
  description?: string | null;
};
export type UpdateMajorBody = {
  majorName: string;
  description?: string | null;
};
export type CreateSpecializationBody = {
  majorId: string;
  specializationCode: string;
  specializationName: string;
  description?: string | null;
};
export type UpdateSpecializationBody = {
  specializationName: string;
  description?: string | null;
};
export type CreateSubjectBody = {
  departmentId?: string | null;
  subjectCode: string;
  subjectNameEn: string;
  subjectNameVi?: string | null;
  description?: string | null;
};
export type UpdateSubjectBody = {
  subjectNameEn: string;
  subjectNameVi?: string | null;
  description?: string | null;
};
export type CreateSemesterBody = {
  semesterCode: string;
  semesterName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
};
export type UpdateSemesterBody = {
  semesterName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
};
export type CreateCurriculumBody = {
  majorId: string;
  curriculumCode: string;
  curriculumName: string;
  version: string;
  intakeYear: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  totalCredits?: number | null;
};
export type UpdateCurriculumBody = {
  curriculumName: string;
  version: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  totalCredits?: number | null;
};
export type CreateCourseSectionBody = {
  subjectId: string;
  semesterId: string;
  lecturerId?: string | null;
  sectionCode: string;
  capacity?: number | null;
};
/** The API accepts only the assignment and the capacity after creation. */
export type UpdateCourseSectionBody = {
  lecturerId?: string | null;
  capacity?: number | null;
};
export type CreateSyllabusBody = {
  subjectId: string;
  syllabusCode: string;
  syllabusName: string;
  version: string;
};
export type UpdateSyllabusBody = {
  syllabusName: string;
  version: string;
};
export type CreateTopicBody = {
  subjectId: string;
  syllabusId?: string | null;
  topicCode: string;
  topicName: string;
  description?: string | null;
  displayOrder: number;
};
export type UpdateTopicBody = {
  topicName: string;
  description?: string | null;
  displayOrder: number;
};
export type CreateUserBody = {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email: string;
  userCode: string;
  password: string;
  role: UserRole;
};
export type UpdateUserBody = {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
};
export type CreateStudentProfileBody = {
  userId: string;
  majorId: string;
  specializationId?: string | null;
  curriculumId: string;
  intakeYear: number;
  currentSemester: number;
};
export type UpdateStudentProfileBody = {
  specializationId?: string | null;
  currentSemester: number;
};
export type CreateLecturerProfileBody = {
  userId: string;
  departmentId?: string | null;
  academicRank?: string | null;
  officeRoom?: string | null;
  hireDate?: string | null;
  bio?: string | null;
};
export type UpdateLecturerProfileBody = {
  departmentId?: string | null;
  academicRank?: string | null;
  officeRoom?: string | null;
  hireDate?: string | null;
  bio?: string | null;
};

/* -------------------------------------------------------------- Departments */

export const getDepartments = (filters: ReadFilters = {}) =>
  readPage<Department>("Departments", departmentSchema, {
    PageNumber: 1,
    PageSize: 100,
    SortBy: "departmentCode",
    ...filters,
  });
export const getDepartment = (id: string) =>
  readOne<Department>("Departments", id, departmentSchema);
export const createDepartment = (body: CreateDepartmentBody) =>
  write("Departments", "POST", body);
export const updateDepartment = (id: string, body: UpdateDepartmentBody) =>
  write(`Departments/${id}`, "PUT", body);
export const setDepartmentActive = (id: string, active: boolean) =>
  write(`Departments/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* ------------------------------------------------------------------- Majors */

export const getMajors = (filters: ReadFilters = {}) =>
  readPage<Major>("Majors", majorSchema, {
    PageNumber: 1,
    PageSize: 100,
    SortBy: "majorCode",
    ...filters,
  });
export const getMajor = (id: string) => readOne<Major>("Majors", id, majorSchema);
export const createMajor = (body: CreateMajorBody) =>
  write("Majors", "POST", body);
export const updateMajor = (id: string, body: UpdateMajorBody) =>
  write(`Majors/${id}`, "PUT", body);
export const setMajorActive = (id: string, active: boolean) =>
  write(`Majors/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* --------------------------------------------------------- Specializations */

export const getSpecializations = (filters: ReadFilters = {}) =>
  readPage<Specialization>("Specializations", specializationSchema, {
    PageNumber: 1,
    PageSize: 100,
    SortBy: "specializationCode",
    ...filters,
  });
export const getSpecialization = (id: string) =>
  readOne<Specialization>("Specializations", id, specializationSchema);
export const createSpecialization = (body: CreateSpecializationBody) =>
  write("Specializations", "POST", body);
export const updateSpecialization = (
  id: string,
  body: UpdateSpecializationBody,
) => write(`Specializations/${id}`, "PUT", body);
export const setSpecializationActive = (id: string, active: boolean) =>
  write(`Specializations/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* ----------------------------------------------------------------- Subjects */

export const getAdminSubjects = (filters: ReadFilters = {}) =>
  readPage<AdminSubject>("Subjects", adminSubjectSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "subjectCode",
    ...filters,
  });
export const createSubject = (body: CreateSubjectBody) =>
  write("Subjects", "POST", body);
export const updateSubject = (id: string, body: UpdateSubjectBody) =>
  write(`Subjects/${id}`, "PUT", body);
export const setSubjectActive = (id: string, active: boolean) =>
  write(`Subjects/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* ---------------------------------------------------------------- Semesters */

export const getAdminSemesters = (filters: ReadFilters = {}) =>
  readPage<AdminSemester>("Semesters", adminSemesterSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "-startDate",
    ...filters,
  });
export const createSemester = (body: CreateSemesterBody) =>
  write("Semesters", "POST", body);
export const updateSemester = (id: string, body: UpdateSemesterBody) =>
  write(`Semesters/${id}`, "PUT", body);
export const startSemester = (id: string) =>
  write(`Semesters/${id}/start`, "PATCH");
export const closeSemester = (id: string) =>
  write(`Semesters/${id}/close`, "PATCH");

/* -------------------------------------------------------------- Curriculums */

export const getCurriculums = (filters: ReadFilters = {}) =>
  readPage<Curriculum>("Curriculums", curriculumSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "-intakeYear",
    ...filters,
  });
export const createCurriculum = (body: CreateCurriculumBody) =>
  write("Curriculums", "POST", body);
export const updateCurriculum = (id: string, body: UpdateCurriculumBody) =>
  write(`Curriculums/${id}`, "PUT", body);
export const approveCurriculum = (id: string) =>
  write(`Curriculums/${id}/approve`, "PATCH");
export const archiveCurriculum = (id: string) =>
  write(`Curriculums/${id}/archive`, "PATCH");

/* ----------------------------------------------------------- CourseSections */

export const getCourseSections = (filters: ReadFilters = {}) =>
  readPage<CourseSection>("CourseSections", courseSectionSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "sectionCode",
    ...filters,
  });
export const createCourseSection = (body: CreateCourseSectionBody) =>
  write("CourseSections", "POST", body);
export const updateCourseSection = (
  id: string,
  body: UpdateCourseSectionBody,
) => write(`CourseSections/${id}`, "PUT", body);
export const openCourseSection = (id: string) =>
  write(`CourseSections/${id}/open`, "PATCH");
export const closeCourseSection = (id: string) =>
  write(`CourseSections/${id}/close`, "PATCH");
export const cancelCourseSection = (id: string) =>
  write(`CourseSections/${id}/cancel`, "PATCH");

/* ------------------------------------------------------------------ Syllabi */

export const getSyllabi = (filters: ReadFilters = {}) =>
  readPage<Syllabus>("Syllabi", syllabusSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "syllabusCode",
    ...filters,
  });
export const createSyllabus = (body: CreateSyllabusBody) =>
  write("Syllabi", "POST", body);
export const updateSyllabus = (id: string, body: UpdateSyllabusBody) =>
  write(`Syllabi/${id}`, "PUT", body);
export const setSyllabusActive = (id: string, active: boolean) =>
  write(`Syllabi/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* ------------------------------------------------------------------- Topics */

export const getAdminTopics = (filters: ReadFilters = {}) =>
  readPage<AdminTopic>("Topics", adminTopicSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "displayOrder",
    ...filters,
  });
export const createTopic = (body: CreateTopicBody) =>
  write("Topics", "POST", body);
export const updateTopic = (id: string, body: UpdateTopicBody) =>
  write(`Topics/${id}`, "PUT", body);
export const setTopicActive = (id: string, active: boolean) =>
  write(`Topics/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

/* -------------------------------------------------------------------- Users */

export const getAdminUsers = (filters: ReadFilters = {}) =>
  readPage<AdminUser>("Users", adminUserSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "fullName",
    ...filters,
  });
export const getAdminUser = (id: string) =>
  readOne<AdminUser>("Users", id, adminUserSchema);
export const createUser = (body: CreateUserBody) => write("Users", "POST", body);
export const updateUser = (id: string, body: UpdateUserBody) =>
  write(`Users/${id}`, "PUT", body);
/** The document exposes deactivate only — there is no matching activate. */
export const deactivateUser = (id: string) =>
  write(`Users/${id}/deactivate`, "PATCH");

/* --------------------------------------------------------- StudentProfiles */

export const getStudentProfiles = (filters: ReadFilters = {}) =>
  readPage<StudentProfile>("StudentProfiles", studentProfileSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "-createdAt",
    ...filters,
  });
export const createStudentProfile = (body: CreateStudentProfileBody) =>
  write("StudentProfiles", "POST", body);
export const updateStudentProfile = (
  id: string,
  body: UpdateStudentProfileBody,
) => write(`StudentProfiles/${id}`, "PUT", body);
export const changeEnrollmentStatus = (id: string, status: EnrollmentStatus) =>
  write(`StudentProfiles/${id}/enrollment-status`, "PATCH", { status });
export const deleteStudentProfile = (id: string) =>
  write(`StudentProfiles/${id}`, "DELETE");

/* -------------------------------------------------------- LecturerProfiles */

export const getLecturerProfiles = (filters: ReadFilters = {}) =>
  readPage<LecturerProfile>("LecturerProfiles", lecturerProfileSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "-createdAt",
    ...filters,
  });
export const createLecturerProfile = (body: CreateLecturerProfileBody) =>
  write("LecturerProfiles", "POST", body);
export const updateLecturerProfile = (
  id: string,
  body: UpdateLecturerProfileBody,
) => write(`LecturerProfiles/${id}`, "PUT", body);
export const deleteLecturerProfile = (id: string) =>
  write(`LecturerProfiles/${id}`, "DELETE");

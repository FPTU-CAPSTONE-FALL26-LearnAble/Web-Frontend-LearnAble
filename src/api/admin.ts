import { z } from "zod";
import { ApiFailure, envelopeFailure, request } from "@/api/client";
import {
  pageSchema,
  queryString,
  type Page,
  type ReadFilters,
} from "@/api/catalog";
import { fetchAllPages } from "@/api/pagination";

/**
 * Admin workspace contract — mirrors the deployed LearnAble OpenAPI document
 * (Universities, Departments, Majors, Subjects, Topics, Semesters,
 * Curriculums, Users, StudentProfiles, LecturerProfiles).
 *
 * The API is multi-tenant: Departments, Subjects, Semesters and Users belong
 * to a university, and their create bodies carry `universityId`. An admin
 * writes into their own university.
 *
 * Reads keep the `catalog.ts` conventions: paged envelope, null → "Not
 * available". Writes are real backend calls — no local simulation — so a
 * rejected write must surface as ApiFailure rather than a success toast.
 */

const unavailable = "Not available";
const text = (value: string | null | undefined) => value ?? unavailable;

/** Server enums. Keep in sync with `components.schemas` of the OpenAPI document. */
export const universityStatuses = ["Active", "Inactive"] as const;
export const userRoles = [
  "Student",
  "Lecturer",
  "Examiner",
  "Staff",
  "Admin",
] as const;
export const staffManagedUserRoles = [
  "Student",
  "Lecturer",
  "Examiner",
] as const;
export const userStatuses = ["Active", "Inactive"] as const;
export const examScoringPolicies = ["AllOrNothing"] as const;
export const cameraUnavailablePolicies = ["Block", "AllowWithFlag", "Allow"] as const;
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
    universityId: z.string(),
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

export const adminSubjectSchema = z
  .object({
    subjectId: z.string(),
    universityId: z.string(),
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
    universityId: z.string(),
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
    revision: z.string().nullable().optional(),
    userId: z.string(),
    universityId: z.string(),
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
    academicRevision: z.string().nullable().optional(),
    userId: z.string(),
    userRole: z.string().nullable(),
    majorId: z.string(),
    curriculumId: z.string(),
    intakeYear: z.number(),
    enrollmentStatus: z.string().nullable(),
    fullName: z.string().nullable().optional(),
    studentCode: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    enrollmentStatus: text(row.enrollmentStatus),
  }));
/*
 * Profiles share their primary key with the user account: neither response
 * carries a profile id, so `/StudentProfiles/{id}` and `/LecturerProfiles/{id}`
 * take the `userId`. The response also carries the student's accessibility
 * preferences, which the admin surface does not edit.
 */

export const lecturerProfileSchema = z
  .object({
    userId: z.string(),
    userRole: z.string().nullable(),
    departmentId: z.string().nullable(),
    academicRank: z.string().nullable(),
    officeRoom: z.string().nullable(),
    hireDate: z.string().nullable(),
    bio: z.string().nullable(),
    fullName: z.string().nullable().optional(),
    lecturerCode: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    academicRank: text(row.academicRank),
  }));

/** Fuller than `catalog.ts`'s `topicSchema`, which the lecturer selectors use. */
export const adminTopicSchema = z
  .object({
    topicId: z.string(),
    subjectId: z.string(),
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

export const universitySchema = z
  .object({
    universityId: z.string(),
    code: z.string().nullable(),
    name: z.string().nullable(),
    shortName: z.string().nullable(),
    nameEn: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    contactEmail: z.string().nullable(),
    subdomain: z.string().nullable(),
    emailDomain: z.string().nullable(),
    logoUrl: z.string().nullable(),
    status: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((row) => ({
    ...row,
    code: text(row.code),
    name: text(row.name),
    status: text(row.status),
  }));

/** Anonymous `/Universities/lookup` — the light shape the selects need. */
export const universityLookupSchema = z
  .object({
    universityId: z.string(),
    code: z.string().nullable(),
    name: z.string().nullable(),
    shortName: z.string().nullable().optional(),
  })
  .transform((row) => ({
    ...row,
    code: text(row.code),
    name: text(row.name),
  }));

export type University = z.output<typeof universitySchema>;
export type UniversityLookup = z.output<typeof universityLookupSchema>;
export type AdminTopic = z.output<typeof adminTopicSchema>;
export type Department = z.output<typeof departmentSchema>;
export type Major = z.output<typeof majorSchema>;
export type AdminSubject = z.output<typeof adminSubjectSchema>;
export type AdminSemester = z.output<typeof adminSemesterSchema>;
export type Curriculum = z.output<typeof curriculumSchema>;
export type AdminUser = z.output<typeof adminUserSchema>;
export type StudentProfile = z.output<typeof studentProfileSchema>;
export type LecturerProfile = z.output<typeof lecturerProfileSchema>;

export const examRoomSchema = z.object({
  examRoomId: z.string(),
  universityId: z.string(),
  roomCode: z.string().nullable(),
  name: z.string().nullable(),
  building: z.string().nullable(),
  floor: z.number().nullable(),
  isActive: z.boolean(),
});

export const roomSeatSchema = z.object({
  seatId: z.string(),
  examRoomId: z.string(),
  seatCode: z.string().nullable(),
  rowNumber: z.number(),
  columnNumber: z.number(),
  isAvailable: z.boolean(),
  hasComputer: z.boolean(),
  hasCamera: z.boolean(),
  notes: z.string().nullable(),
});

export type ExamRoom = z.output<typeof examRoomSchema>;
export type RoomSeat = z.output<typeof roomSeatSchema>;

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
  errors?: string[] | null;
  data?: T | null;
}): T {
  if (
    !response.success ||
    response.data === null ||
    response.data === undefined
  ) {
    throw envelopeFailure(response);
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
  headers?: Record<string, string>,
): Promise<void> {
  const response = await request(
    `/${resource}`,
    z.object({
      success: z.boolean(),
      message: z.string().nullable().optional(),
      errors: z.array(z.string()).nullable().optional(),
    }),
    {
      method,
      ...(headers ? { headers } : {}),
      ...(body === undefined ? {} : { json: body }),
    },
  );
  if (!response.success) throw envelopeFailure(response);
}

const compactId = (value: string) => value.replaceAll("-", "");

/**
 * Optimistic-concurrency tag in the Backend's `"{id}-{revision}"` format, the
 * same one the invigilation and notification endpoints use. The header is
 * optional in the OpenAPI document, so it is only sent when a revision is known.
 */
const ifMatch = (id: string, revision?: string | null) =>
  revision
    ? { "If-Match": `"${compactId(id)}-${compactId(revision)}"` }
    : undefined;

/** Writes whose documented response contains the created resource. */
async function writeOne<T>(
  resource: string,
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
  item: z.ZodTypeAny,
): Promise<T> {
  const response = await request(`/${resource}`, envelope(item), {
    method,
    json: body,
  });
  return unwrap(response) as T;
}

/* ---------------------------------------------------------- request bodies */

export type CreateUniversityBody = {
  code: string;
  name: string;
  shortName?: string | null;
  nameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  subdomain?: string | null;
  emailDomain?: string | null;
  logoUrl?: string | null;
};
/** Code, subdomain and email domain are fixed once the tenant exists. */
export type UpdateUniversityBody = Omit<
  CreateUniversityBody,
  "code" | "subdomain" | "emailDomain"
>;
export type CreateDepartmentBody = {
  universityId: string;
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
export type CreateSubjectBody = {
  universityId: string;
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
  universityId: string;
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
};
export type UpdateCurriculumBody = {
  curriculumName: string;
  version: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};
export type ExamRoomBody = {
  universityId: string;
  roomCode: string;
  name: string;
  building: string;
  floor?: number | null;
  isActive: boolean;
};
export type RoomSeatBody = {
  seatCode: string;
  rowNumber: number;
  columnNumber: number;
  isAvailable: boolean;
  hasComputer: boolean;
  hasCamera: boolean;
  notes?: string | null;
};
export type CreateTopicBody = {
  subjectId: string;
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
  universityId: string;
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
  curriculumId: string;
  intakeYear: number;
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

/* ------------------------------------------------------------- Universities */

export const getUniversities = (filters: ReadFilters = {}) =>
  readPage<University>("Universities", universitySchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "code",
    ...filters,
  });
/** Anonymous lookup used by the university selects. */
export const getUniversityLookup = (filters: ReadFilters = {}) =>
  readPage<UniversityLookup>("Universities/lookup", universityLookupSchema, {
    PageNumber: 1,
    PageSize: 100,
    ...filters,
  });
export const createUniversity = (body: CreateUniversityBody) =>
  write("Universities", "POST", body);
export const updateUniversity = (id: string, body: UpdateUniversityBody) =>
  write(`Universities/${id}`, "PUT", body);
export const setUniversityActive = (id: string, active: boolean) =>
  write(`Universities/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

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
export const getMajor = (id: string) =>
  readOne<Major>("Majors", id, majorSchema);
export const createMajor = (body: CreateMajorBody) =>
  write("Majors", "POST", body);
export const updateMajor = (id: string, body: UpdateMajorBody) =>
  write(`Majors/${id}`, "PUT", body);
export const setMajorActive = (id: string, active: boolean) =>
  write(`Majors/${id}/${active ? "activate" : "deactivate"}`, "PATCH");

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

export type CurriculumSubjectSet = {
  subjectIds: string[];
  revision: string | null;
};

/**
 * The OpenAPI document does not describe this response, so accept a bare list
 * or an object holding one. A shape that cannot be read is an error, never an
 * empty set: saving from a falsely empty list would replace every assignment.
 */
export function readCurriculumSubjects(raw: unknown): CurriculumSubjectSet {
  if (raw === null || raw === undefined) return { subjectIds: [], revision: null };
  const holder = Array.isArray(raw) || typeof raw !== "object" ? null : (raw as Record<string, unknown>);
  const list = Array.isArray(raw)
    ? raw
    : holder && [holder.subjectIds, holder.subjects, holder.items].find(Array.isArray);
  if (!Array.isArray(list)) throw new ApiFailure({ kind: "parse" });
  const subjectIds = list.flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    const id = (item as { subjectId?: unknown } | null)?.subjectId;
    return typeof id === "string" ? [id] : [];
  });
  if (subjectIds.length !== list.length) throw new ApiFailure({ kind: "parse" });
  return {
    subjectIds: [...new Set(subjectIds)],
    revision: typeof holder?.revision === "string" ? holder.revision : null,
  };
}

export const getCurriculumSubjects = async (id: string) => {
  const response = await request(`/Curriculums/${id}/subjects`, envelope(z.unknown()));
  if (!response.success) throw envelopeFailure(response);
  return readCurriculumSubjects(response.data);
};
/** Replaces the whole set atomically; send every subject that should remain. */
export const setCurriculumSubjects = (
  id: string,
  subjectIds: string[],
  revision?: string | null,
) => write(`Curriculums/${id}/subjects`, "PUT", { subjectIds }, ifMatch(id, revision));

/* ----------------------------------------------------- Default exam policy */

export const universityExamPolicySchema = z.object({
  defaultDurationMinutes: z.number(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  scoringPolicy: z.enum(examScoringPolicies),
  cameraRequired: z.boolean(),
  cameraUnavailablePolicy: z.enum(cameraUnavailablePolicies),
  revision: z.string().nullable().optional(),
});
export type UniversityExamPolicy = z.output<typeof universityExamPolicySchema>;
export type UniversityExamPolicyBody = Omit<UniversityExamPolicy, "revision">;

/** `null` means the university has not saved a policy yet. */
export const getUniversityExamPolicy = async (
  universityId: string,
): Promise<UniversityExamPolicy | null> => {
  const response = await request(
    `/Universities/${universityId}/default-exam-policy`,
    envelope(universityExamPolicySchema),
  );
  if (!response.success) throw envelopeFailure(response);
  return response.data ?? null;
};
export const updateUniversityExamPolicy = (
  universityId: string,
  body: UniversityExamPolicyBody,
  revision?: string | null,
) =>
  write(
    `Universities/${universityId}/default-exam-policy`,
    "PUT",
    body,
    ifMatch(universityId, revision),
  );

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
/** Every Student account with its name and student code, which the student profile does not carry. */
export const getAllStudentUsers = () =>
  fetchAllPages((PageNumber, PageSize) => getAdminUsers({ Role: "Student", PageNumber, PageSize }));
/** Every lecturer profile the school imported. Examiners pick invigilators from this list. */
export const getAllLecturerProfiles = () =>
  fetchAllPages((PageNumber, PageSize) => getLecturerProfiles({ PageNumber, PageSize }));
export const getAdminUser = (id: string) =>
  readOne<AdminUser>("Users", id, adminUserSchema);
export const createUser = (body: CreateUserBody) =>
  writeOne<AdminUser>("Users", "POST", body, adminUserSchema);
export const updateUser = (id: string, body: UpdateUserBody) =>
  write(`Users/${id}`, "PUT", body);
export const deactivateUser = (id: string) =>
  write(`Users/${id}/deactivate`, "PATCH");
export const activateUser = (id: string, revision?: string | null) =>
  write(`Users/${id}/activate`, "PATCH", undefined, ifMatch(id, revision));
/** The temporary password is only sent; the Backend never echoes it back. */
export const resetUserPassword = (
  id: string,
  body: { temporaryPassword: string; reason: string },
  revision?: string | null,
) => write(`Users/${id}/reset-password`, "POST", body, ifMatch(id, revision));
export const changeUserRole = (
  id: string,
  body: { role: UserRole; reason: string },
  revision?: string | null,
) => write(`Users/${id}/role`, "PATCH", body, ifMatch(id, revision));

/* --------------------------------------------------------- StudentProfiles */

export const getStudentProfiles = (filters: ReadFilters = {}) =>
  readPage<StudentProfile>("StudentProfiles", studentProfileSchema, {
    PageNumber: 1,
    PageSize: 10,
    SortBy: "-createdAt",
    ...filters,
  });

export const getAllStudentProfiles = () =>
  fetchAllPages((PageNumber, PageSize) => getStudentProfiles({ PageNumber, PageSize }));
export const createStudentProfile = (body: CreateStudentProfileBody) =>
  write("StudentProfiles", "POST", body);
/** Profile endpoints are keyed by the account's `userId`. */
export const changeEnrollmentStatus = (
  userId: string,
  status: EnrollmentStatus,
) => write(`StudentProfiles/${userId}/enrollment-status`, "PATCH", { status });
export const deleteStudentProfile = (userId: string) =>
  write(`StudentProfiles/${userId}`, "DELETE");

export type UpdateStudentAcademicBody = {
  majorId: string;
  curriculumId: string;
  intakeYear: number;
};
/** Changes the academic record only; enrollment status keeps its own endpoint. */
export const updateStudentAcademic = (
  userId: string,
  body: UpdateStudentAcademicBody,
  academicRevision?: string | null,
) => write(`StudentProfiles/${userId}`, "PUT", body, ifMatch(userId, academicRevision));

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
  userId: string,
  body: UpdateLecturerProfileBody,
) => write(`LecturerProfiles/${userId}`, "PUT", body);
export const deleteLecturerProfile = (userId: string) =>
  write(`LecturerProfiles/${userId}`, "DELETE");

/* ------------------------------------------------------------- Exam rooms */

export type ExamRoomFilters = {
  Page?: number;
  PageSize?: number;
  From?: string;
  To?: string;
  RoomId?: string;
  ExamSubjectId?: string;
};

export const getExamRooms = (filters: ExamRoomFilters = {}) =>
  readPage<ExamRoom>("examrooms", examRoomSchema, {
    Page: 1,
    PageSize: 10,
    ...filters,
  });
export const getExamRoom = (id: string) =>
  readOne<ExamRoom>("examrooms", id, examRoomSchema);
export const createExamRoom = (body: ExamRoomBody) =>
  write("examrooms", "POST", body);
export const updateExamRoom = (id: string, body: ExamRoomBody) =>
  write(`examrooms/${id}`, "PUT", body);
export const deleteExamRoom = (id: string) =>
  write(`examrooms/${id}`, "DELETE");
export async function getRoomSeats(roomId: string): Promise<RoomSeat[]> {
  const response = await request(
    `/examrooms/${roomId}/seats`,
    envelope(z.array(roomSeatSchema)),
  );
  return unwrap(response) as RoomSeat[];
}
export const createRoomSeat = (roomId: string, body: RoomSeatBody) =>
  write(`examrooms/${roomId}/seats`, "POST", body);
export const updateRoomSeat = (
  roomId: string,
  seatId: string,
  body: RoomSeatBody,
) => write(`examrooms/${roomId}/seats/${seatId}`, "PUT", body);
export const deleteRoomSeat = (roomId: string, seatId: string) =>
  write(`examrooms/${roomId}/seats/${seatId}`, "DELETE");

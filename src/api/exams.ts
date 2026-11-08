import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import { pageSchema, queryString, type ReadFilters } from "@/api/catalog";

const nullableString = z.string().nullable().optional();

function envelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    success: z.boolean(),
    message: nullableString,
    data: schema.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function unwrap<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit & { json?: unknown },
): Promise<z.output<T>> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) {
    throw new ApiFailure({ kind: "server", status: 200 });
  }
  return response.data;
}

async function command(path: string, init: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(z.unknown()), init);
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200 });
  return response.data;
}

const examPaperStatusSchema = z.enum(["Draft", "Published", "Archived"]);
const examScheduleStatusSchema = z.enum([
  "Draft",
  "Published",
  "Open",
  "Closed",
  "Cancelled",
]);
const attendanceStatusSchema = z.enum([
  "NotCheckedIn",
  "Present",
  "Absent",
  "CheckedOut",
]);
const attemptProgressSchema = z.enum([
  "Unknown",
  "NotStarted",
  "InProgress",
  "Submitted",
]);

export const examQuestionSchema = z.object({
  questionId: z.string(),
  content: z.string().nullable().optional(),
  questionType: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  displayOrder: z.number().nullable().optional(),
});

export const examPaperSchema = z.object({
  examPaperId: z.string(),
  examSubjectId: z.string(),
  paperCode: z.string().nullable(),
  name: z.string().nullable(),
  version: z.number(),
  status: examPaperStatusSchema,
  publishedAt: nullableString,
  createdAt: z.string(),
  totalScore: z.number(),
  questions: z.array(examQuestionSchema).nullable().transform((value) => value ?? []),
  eTag: z.string().nullable().optional(),
});
export type ExamPaper = z.infer<typeof examPaperSchema>;

export const examSubjectSchema = z.object({
  examSubjectId: z.string(),
  subjectId: z.string(),
  examTypeId: z.string(),
  semesterId: z.string(),
  createdBy: z.string(),
  name: z.string().nullable(),
  instructions: nullableString,
  durationMinutes: z.number(),
  passScore: z.number(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  scoringPolicy: z.string(),
  cameraRequired: z.boolean(),
  cameraUnavailablePolicy: z.string(),
  recordingRetentionDays: z.number().optional(),
  maxAttempts: z.number().optional(),
  status: z.enum(["Draft", "Ready", "Archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  eTag: z.string().nullable().optional(),
});
export type ExamSubject = z.infer<typeof examSubjectSchema>;

export const examTypeSchema = z.object({
  examTypeId: z.string(),
  code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: nullableString,
  isActive: z.boolean().optional(),
});
export type ExamType = z.infer<typeof examTypeSchema>;

export const examRoomSchema = z.object({
  examRoomId: z.string(),
  universityId: z.string(),
  roomCode: z.string().nullable(),
  name: z.string().nullable(),
  building: nullableString,
  floor: z.number().nullable().optional(),
  capacity: z.number().optional(),
  isActive: z.boolean(),
});
export type ExamRoom = z.infer<typeof examRoomSchema>;

export const examShiftSchema = z.object({
  examShiftId: z.string(),
  examRoomId: z.string(),
  name: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(["Planned", "Cancelled", "Completed"]),
  room: examRoomSchema.nullable().optional(),
});
export type ExamShift = z.infer<typeof examShiftSchema>;

export const availableExamQuestionSchema = z.object({
  questionId: z.string(),
  content: z.string().nullable().optional(),
  questionType: z.string(),
  difficulty: z.string(),
  defaultScore: z.number(),
  eligible: z.boolean(),
  reasons: z.array(z.string()).nullable().transform((value) => value ?? []),
  examTypeId: z.string(),
});
export type AvailableExamQuestion = z.infer<typeof availableExamQuestionSchema>;

export const examScheduleSchema = z.object({
  examScheduleId: z.string(),
  examSubjectId: z.string(),
  examName: z.string().nullable(),
  examShiftId: z.string(),
  examRoomId: z.string(),
  roomName: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  entryOpensAt: z.string(),
  entryClosesAt: z.string(),
  openedAt: nullableString,
  openedBy: nullableString,
  closedAt: nullableString,
  status: examScheduleStatusSchema,
  examPaperId: nullableString,
  invigilationSlotId: nullableString,
});
export type ExamSchedule = z.infer<typeof examScheduleSchema>;

const bulkScheduleStudentSchema = z.object({
  studentId: z.string(),
  studentName: nullableString,
  seatId: z.string(),
  seatCode: nullableString,
  rowNumber: z.number(),
  columnNumber: z.number(),
  extraTimeMinutes: z.number(),
  accommodationNotes: nullableString,
});

const bulkScheduleInvigilatorSchema = z.object({
  lecturerId: z.string(),
  lecturerName: nullableString,
  isChief: z.boolean(),
});

const bulkScheduleRoomPlanSchema = z.object({
  roomId: z.string(),
  roomCode: nullableString,
  roomName: nullableString,
  capacity: z.number(),
  students: z.array(bulkScheduleStudentSchema).nullable().transform((value) => value ?? []),
  invigilators: z.array(bulkScheduleInvigilatorSchema).nullable().transform((value) => value ?? []),
});

const bulkScheduleIssueSchema = z.object({
  code: nullableString,
  resourceType: nullableString,
  resourceId: nullableString,
  conflictingScheduleId: nullableString,
  message: nullableString,
});

export const bulkExamSchedulePlanSchema = z.object({
  requestId: z.string(),
  isValid: z.boolean(),
  planHash: nullableString,
  rooms: z.array(bulkScheduleRoomPlanSchema).nullable().transform((value) => value ?? []),
  unusedRoomIds: z.array(z.string()).nullable().transform((value) => value ?? []),
  unusedLecturerIds: z.array(z.string()).nullable().transform((value) => value ?? []),
  issues: z.array(bulkScheduleIssueSchema).nullable().transform((value) => value ?? []),
});
export type BulkExamSchedulePlan = z.infer<typeof bulkExamSchedulePlanSchema>;

export type BulkExamScheduleInput = {
  requestId: string;
  examSubjectId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  entryOpensAt: string;
  entryClosesAt: string;
  roomIds: string[];
  students: Array<{ studentId: string; extraTimeMinutes: number; accommodationNotes?: string | null }>;
  lecturerIds: string[];
  invigilationSlotId: string;
  invigilatorsPerRoom: number;
};

const bulkExamScheduleCreatedSchema = z.object({
  requestId: z.string(),
  planHash: nullableString,
  createdAt: z.string(),
  schedules: z.array(z.object({
    roomId: z.string(),
    examShiftId: z.string(),
    examScheduleId: z.string(),
    studentCount: z.number(),
    invigilatorCount: z.number(),
  })).nullable().transform((value) => value ?? []),
});
export type BulkExamScheduleCreated = z.infer<typeof bulkExamScheduleCreatedSchema>;

export const myExamScheduleSchema = z.object({
  schedule: examScheduleSchema,
  seatCode: nullableString,
  invigilatorRole: z.enum(["Chief", "Assistant"]).nullable().optional(),
});
export type MyExamSchedule = z.infer<typeof myExamScheduleSchema>;

export const examStudentSchema = z.object({
  enrollmentId: z.string(),
  studentId: z.string(),
  studentCode: z.string().nullable(),
  studentName: z.string().nullable(),
  seatId: nullableString,
  seatCode: nullableString,
  attendanceStatus: attendanceStatusSchema,
  checkedInAt: nullableString,
  checkedInBy: nullableString,
  checkedOutAt: nullableString,
  checkedOutBy: nullableString,
  attemptProgress: attemptProgressSchema,
  attemptId: nullableString,
});
export type ExamStudent = z.infer<typeof examStudentSchema>;

export const seatMapItemSchema = z.object({
  seatId: z.string(),
  seatCode: z.string().nullable(),
  rowNumber: z.number(),
  columnNumber: z.number(),
  isAvailable: z.boolean(),
  hasComputer: z.boolean(),
  hasCamera: z.boolean(),
  student: examStudentSchema.nullable(),
});

export const seatMapSchema = z.object({
  examScheduleId: z.string(),
  examShiftId: z.string(),
  examRoomId: z.string(),
  roomName: z.string().nullable(),
  scheduleStatus: examScheduleStatusSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  seats: z.array(seatMapItemSchema).nullable().transform((value) => value ?? []),
});
export type SeatMap = z.infer<typeof seatMapSchema>;

export const getExamSubjects = (filters: ReadFilters = {}) =>
  unwrap(
    `/examsubjects${queryString({ PageNumber: 1, PageSize: 100, ...filters })}`,
    pageSchema(examSubjectSchema),
  );

export const getExamPapers = (examSubjectId: string) =>
  unwrap(`/examsubjects/${examSubjectId}/papers`, z.array(examPaperSchema));

export const getExamSubject = (examSubjectId: string) =>
  unwrap(`/examsubjects/${examSubjectId}`, examSubjectSchema);

export const updateExamSubject = (examSubjectId: string, input: CreateExamSubjectInput) =>
  unwrap(`/examsubjects/${examSubjectId}`, examSubjectSchema, { method: "PUT", json: input });

export const archiveExamSubject = (examSubjectId: string) =>
  unwrap(`/examsubjects/${examSubjectId}/archive`, examSubjectSchema, { method: "PATCH" });

export type CreateExamSubjectInput = {
  subjectId: string;
  examTypeId: string;
  semesterId: string;
  name: string;
  instructions: string;
  durationMinutes: number;
  passScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  scoringPolicy: "AllOrNothing";
  cameraRequired: boolean;
  cameraUnavailablePolicy: "Block" | "AllowWithFlag" | "Allow";
};

export const createExamSubject = (input: CreateExamSubjectInput) =>
  unwrap("/examsubjects", examSubjectSchema, { method: "POST", json: input });

export const createExamPaper = (
  examSubjectId: string,
  input: { paperCode: string; name: string },
) => unwrap(`/examsubjects/${examSubjectId}/papers`, examPaperSchema, {
  method: "POST",
  json: input,
});

export const getExamPaper = (paperId: string) =>
  unwrap(`/exampapers/${paperId}`, examPaperSchema);

export const updateExamPaper = (paperId: string, input: { paperCode: string; name: string }, eTag?: string | null) =>
  unwrap(`/exampapers/${paperId}`, examPaperSchema, { method: "PUT", headers: eTag ? { "If-Match": eTag } : undefined, json: input });

export const deleteExamPaper = (paperId: string, eTag?: string | null) =>
  command(`/exampapers/${paperId}`, { method: "DELETE", headers: eTag ? { "If-Match": eTag } : undefined });

export const archiveExamPaper = (paperId: string, eTag?: string | null) =>
  unwrap(`/exampapers/${paperId}/archive`, examPaperSchema, { method: "PATCH", headers: eTag ? { "If-Match": eTag } : undefined });

export const createExamPaperVersion = (paperId: string, eTag?: string | null) =>
  unwrap(`/exampapers/${paperId}/versions`, examPaperSchema, { method: "POST", headers: eTag ? { "If-Match": eTag } : undefined });

export const getAvailableExamQuestions = (
  paperId: string,
  filters: ReadFilters = {},
) => unwrap(
  `/exampapers/${paperId}/available-questions${queryString({ PageNumber: 1, PageSize: 100, EligibleOnly: true, ...filters })}`,
  pageSchema(availableExamQuestionSchema),
);

export const setExamPaperQuestions = (
  paperId: string,
  questions: Array<{ questionId: string; maxScore?: number | null }>,
  eTag?: string | null,
) => unwrap(`/exampapers/${paperId}/questions`, examPaperSchema, {
  method: "PUT",
  headers: eTag ? { "If-Match": eTag } : undefined,
  json: { questions },
});

export const getExamPaperPreview = (paperId: string) =>
  unwrap(`/exampapers/${paperId}/preview?simulateShuffle=true`, z.object({
    examPaperId: z.string(),
    version: z.number(),
    durationMinutes: z.number(),
    totalScore: z.number(),
    instructions: nullableString,
    questions: z.array(examQuestionSchema).nullable().transform((value) => value ?? []),
    message: nullableString,
  }));

export async function getExamPaperBank() {
  const subjects = await getExamSubjects();
  const paperGroups = await Promise.all(
    subjects.items.map(async (subject) => ({
      subject,
      papers: await getExamPapers(subject.examSubjectId),
    })),
  );
  return paperGroups.flatMap(({ subject, papers }) =>
    papers.map((paper) => ({ ...paper, examSubject: subject })),
  );
}

export const getExamTypes = () =>
  unwrap("/examtypes?includeInactive=false", z.array(examTypeSchema));

export const getExamRooms = (filters: ReadFilters = {}) =>
  unwrap(
    `/examrooms${queryString({ Page: 1, PageSize: 100, ...filters })}`,
    pageSchema(examRoomSchema),
  );

export const getExamShifts = (filters: ReadFilters = {}) =>
  unwrap(
    `/examshifts${queryString({ Page: 1, PageSize: 100, ...filters })}`,
    pageSchema(examShiftSchema),
  );

export const createExamShift = (input: {
  examRoomId: string;
  name: string;
  startsAt: string;
  endsAt: string;
}) => unwrap("/examshifts", examShiftSchema, { method: "POST", json: input });

export const getExamShift = (shiftId: string) => unwrap(`/examshifts/${shiftId}`, examShiftSchema);
export const updateExamShift = (shiftId: string, input: { examRoomId: string; name: string; startsAt: string; endsAt: string }) =>
  unwrap(`/examshifts/${shiftId}`, examShiftSchema, { method: "PUT", json: input });
export const cancelExamShift = (shiftId: string) =>
  unwrap(`/examshifts/${shiftId}/cancel`, examShiftSchema, { method: "PATCH" });
export const deleteExamShift = (shiftId: string) =>
  command(`/examshifts/${shiftId}`, { method: "DELETE" });

export const createExamSchedule = (input: {
  examSubjectId: string;
  examShiftId: string;
  entryOpensAt: string;
  entryClosesAt: string;
}) => unwrap("/examschedules", examScheduleSchema, { method: "POST", json: input });

export const previewBulkExamSchedules = (input: BulkExamScheduleInput) =>
  unwrap("/examschedules/bulk/preview", bulkExamSchedulePlanSchema, { method: "POST", json: input });

export const createBulkExamSchedules = (input: BulkExamScheduleInput & { expectedPlanHash: string }) =>
  unwrap("/examschedules/bulk", bulkExamScheduleCreatedSchema, { method: "POST", json: input });

export const getExamSchedule = (scheduleId: string) => unwrap(`/examschedules/${scheduleId}`, examScheduleSchema);
export const updateExamSchedule = (scheduleId: string, input: { examSubjectId: string; examShiftId: string; entryOpensAt: string; entryClosesAt: string }) =>
  unwrap(`/examschedules/${scheduleId}`, examScheduleSchema, { method: "PUT", json: input });
export const cancelExamSchedule = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/cancel`, examScheduleSchema, { method: "PATCH" });
export const deleteExamSchedule = (scheduleId: string) =>
  command(`/examschedules/${scheduleId}`, { method: "DELETE" });

export const addExamEnrollments = (
  scheduleId: string,
  students: Array<{ studentId: string; extraTimeMinutes: number; accommodationNotes?: string | null }>,
) => unwrap(`/examschedules/${scheduleId}/enrollments`, z.array(z.object({
  enrollmentId: z.string(),
  examScheduleId: z.string(),
  studentId: z.string(),
  studentName: nullableString,
  extraTimeMinutes: z.number(),
  accommodationNotes: nullableString,
  registeredAt: z.string(),
  status: z.string(),
})), { method: "POST", json: { students } });

export const setExamInvigilators = (
  scheduleId: string,
  invigilators: Array<{ lecturerId: string; assignmentRole: "Chief" | "Assistant" }>,
) => unwrap(`/examschedules/${scheduleId}/invigilators`, z.array(z.object({
  assignmentId: z.string(),
  examScheduleId: z.string(),
  lecturerId: z.string(),
  lecturerName: nullableString,
  assignmentRole: z.enum(["Chief", "Assistant"]),
  assignedAt: z.string(),
  status: z.string(),
})), { method: "PUT", json: { invigilators } });

export const getExamEnrollments = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/enrollments`, z.array(z.object({
    enrollmentId: z.string(), examScheduleId: z.string(), studentId: z.string(), studentName: nullableString,
    extraTimeMinutes: z.number(), accommodationNotes: nullableString, registeredAt: z.string(), status: z.string(),
  })));

export const updateExamEnrollment = (scheduleId: string, enrollmentId: string, input: { extraTimeMinutes: number; accommodationNotes?: string | null }) =>
  unwrap(`/examschedules/${scheduleId}/enrollments/${enrollmentId}`, z.object({
    enrollmentId: z.string(), examScheduleId: z.string(), studentId: z.string(), studentName: nullableString,
    extraTimeMinutes: z.number(), accommodationNotes: nullableString, registeredAt: z.string(), status: z.string(),
  }), { method: "PUT", json: input });

export const cancelExamEnrollment = (scheduleId: string, enrollmentId: string) =>
  command(`/examschedules/${scheduleId}/enrollments/${enrollmentId}/cancel`, { method: "PATCH" });

export const getExamInvigilators = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/invigilators`, z.array(z.object({
    assignmentId: z.string(), examScheduleId: z.string(), lecturerId: z.string(), lecturerName: nullableString,
    assignmentRole: z.enum(["Chief", "Assistant"]), assignedAt: z.string(), status: z.string(),
  })));

export const checkExamScheduleConflicts = (input: {
  examShiftId: string;
  studentIds: string[];
  lecturerIds: string[];
  excludeScheduleId?: string | null;
}) => unwrap("/examschedules/check-conflicts", z.array(z.object({
  type: z.string(),
  resourceId: z.string(),
  examScheduleId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
})), { method: "POST", json: input });

export const getExamSchedules = (filters: ReadFilters = {}) =>
  unwrap(
    `/examschedules${queryString({ Page: 1, PageSize: 100, ...filters })}`,
    pageSchema(examScheduleSchema),
  );

export const getMyExamSchedules = (filters: ReadFilters = {}) =>
  unwrap(
    `/me/exam-schedules${queryString({ Page: 1, PageSize: 100, ...filters })}`,
    pageSchema(myExamScheduleSchema),
  );

export const getExamStudents = (scheduleId: string, filters: ReadFilters = {}) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/students${queryString({ PageNumber: 1, PageSize: 200, ...filters })}`,
    pageSchema(examStudentSchema),
  );

export const getExamSeatMap = (scheduleId: string) =>
  unwrap(`/lecturer/exam-schedules/${scheduleId}/seat-map`, seatMapSchema);

const attendanceSchema = examStudentSchema.pick({
  enrollmentId: true,
  studentId: true,
  seatId: true,
  seatCode: true,
  attendanceStatus: true,
  checkedInAt: true,
  checkedInBy: true,
  checkedOutAt: true,
  checkedOutBy: true,
});

export const checkInStudent = (scheduleId: string, enrollmentId: string) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/enrollments/${enrollmentId}/check-in`,
    attendanceSchema,
    { method: "PUT" },
  );

export const undoCheckInStudent = (scheduleId: string, enrollmentId: string) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/enrollments/${enrollmentId}/check-in`,
    attendanceSchema,
    { method: "DELETE" },
  );

export const checkOutStudent = (scheduleId: string, enrollmentId: string) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/enrollments/${enrollmentId}/check-out`,
    attendanceSchema,
    { method: "PUT" },
  );

export const openExamSchedule = (scheduleId: string, examPaperId: string) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/open`,
    z.object({
      examScheduleId: z.string(),
      status: examScheduleStatusSchema,
      openedAt: z.string(),
      openedBy: z.string(),
      examPaperId: nullableString,
    }),
    { method: "POST", json: { examPaperId } },
  );

export const getScheduleValidation = (scheduleId: string) =>
  unwrap(
    `/examschedules/${scheduleId}/validation`,
    z.object({ isValid: z.boolean(), errors: z.array(z.string()).nullable().transform((v) => v ?? []) }),
  );

export const autoAssignSeats = (scheduleId: string) =>
  unwrap(
    `/examschedules/${scheduleId}/seating/auto-assign`,
    z.array(z.object({
      examSeatAssignmentId: z.string().optional(),
      enrollmentId: z.string(),
      seatId: z.string(),
      seatCode: nullableString,
    }).passthrough()),
    { method: "POST" },
  );

export const getExamSeating = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/seating`, z.array(z.object({
    studentExamSheetId: z.string(), enrollmentId: z.string(), studentId: z.string(), seatId: z.string(),
    seatCode: nullableString, rowNumber: z.number(), columnNumber: z.number(), attendanceStatus: z.string(),
  })));

export const publishExamSchedule = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/publish`, examScheduleSchema, { method: "PATCH" });

export const publishExamPaper = (paperId: string, eTag?: string | null) =>
  unwrap(`/exampapers/${paperId}/publish`, examPaperSchema, {
    method: "PATCH",
    headers: eTag ? { "If-Match": eTag } : undefined,
  });

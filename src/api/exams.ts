import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import { pageSchema, queryString, type ReadFilters } from "@/api/catalog";
import { fetchAllPages } from "@/api/pagination";

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
  /** True when papers of this exam must be sealed into a locked package before they can be scheduled. */
  requiresSealing: z.boolean().optional(),
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
  absentAt: nullableString,
  absentBy: nullableString,
  /** True when the Backend marked the student absent at the end of the exam, not a lecturer. */
  absenceRecordedAutomatically: z.boolean().optional(),
  attendanceRevision: z.number().optional(),
  eTag: nullableString,
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

export const updateExamSubject = (examSubjectId: string, input: CreateExamSubjectInput, eTag?: string | null) =>
  unwrap(`/examsubjects/${examSubjectId}`, examSubjectSchema, { method: "PUT", headers: eTag ? { "If-Match": eTag } : undefined, json: input });

export const archiveExamSubject = (examSubjectId: string) =>
  unwrap(`/examsubjects/${examSubjectId}/archive`, examSubjectSchema, { method: "PATCH" });

export const examCameraPolicySchema = z.object({
  examSubjectId: z.string(),
  cameraRequired: z.boolean(),
  cameraUnavailablePolicy: z.enum(["Block", "AllowWithFlag", "Allow"]),
  eTag: z.string().nullable().optional(),
});
export type ExamCameraPolicy = z.infer<typeof examCameraPolicySchema>;

export const getExamCameraPolicy = (examSubjectId: string) =>
  unwrap(`/examsubjects/${examSubjectId}/camera-policy`, examCameraPolicySchema);

export const updateExamCameraPolicy = (
  examSubjectId: string,
  input: Pick<ExamCameraPolicy, "cameraRequired" | "cameraUnavailablePolicy">,
  eTag?: string | null,
) =>
  unwrap(`/examsubjects/${examSubjectId}/camera-policy`, examCameraPolicySchema, {
    method: "PUT",
    headers: eTag ? { "If-Match": eTag } : undefined,
    json: input,
  });

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

const previewAudioSchema = z.object({ url: nullableString, expiresAt: nullableString }).nullable().optional();

const previewOptionSchema = z.object({
  optionId: z.string(),
  label: nullableString,
  content: nullableString,
  isCorrect: z.boolean().optional(),
  audio: previewAudioSchema,
});

/**
 * One question of the preview. The Backend wraps the question text and type in `snapshot` and
 * gives the paper-specific order, score and answer options beside it; this flattens them for the screen.
 */
const previewQuestionSchema = z.object({
  examQuestionId: z.string().optional(),
  displayOrder: z.number().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  snapshot: z.object({
    questionId: z.string().optional(),
    content: nullableString,
    questionType: nullableString,
    difficulty: nullableString,
    referenceAnswer: nullableString,
    gradingCriteria: nullableString,
  }).nullable().optional(),
  audio: previewAudioSchema,
  options: z.array(previewOptionSchema).nullable().optional(),
}).transform((question) => ({
  questionId: question.snapshot?.questionId ?? question.examQuestionId ?? "",
  displayOrder: question.displayOrder ?? null,
  maxScore: question.maxScore ?? null,
  content: question.snapshot?.content ?? null,
  questionType: question.snapshot?.questionType ?? null,
  difficulty: question.snapshot?.difficulty ?? null,
  referenceAnswer: question.snapshot?.referenceAnswer ?? null,
  gradingCriteria: question.snapshot?.gradingCriteria ?? null,
  audioUrl: question.audio?.url ?? null,
  options: (question.options ?? []).map((option) => ({
    optionId: option.optionId,
    label: option.label ?? null,
    content: option.content ?? null,
    isCorrect: option.isCorrect ?? false,
    audioUrl: option.audio?.url ?? null,
  })),
}));

export const examPaperPreviewSchema = z.object({
  examPaperId: z.string(),
  version: z.number(),
  durationMinutes: z.number(),
  totalScore: z.number(),
  instructions: nullableString,
  questions: z.array(previewQuestionSchema).nullable().transform((value) => value ?? []),
  message: nullableString,
});
export type ExamPaperPreview = z.infer<typeof examPaperPreviewSchema>;

export const getExamPaperPreview = (paperId: string) =>
  unwrap(`/exampapers/${paperId}/preview?simulateShuffle=true`, examPaperPreviewSchema);

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
  fetchAllPages((PageNumber, PageSize) =>
    unwrap(
      `/lecturer/exam-schedules/${scheduleId}/students${queryString({ ...filters, PageNumber, PageSize })}`,
      pageSchema(examStudentSchema),
    ),
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
  absentAt: true,
  absentBy: true,
  absenceRecordedAutomatically: true,
  attendanceRevision: true,
  eTag: true,
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

/** Marks a student who did not check in as absent. The ETag is the one the student was last read with. */
export const markStudentAbsent = (
  scheduleId: string,
  enrollmentId: string,
  eTag?: string | null,
  operationId: string = crypto.randomUUID(),
  note?: string,
) =>
  unwrap(`/lecturer/exam-schedules/${scheduleId}/enrollments/${enrollmentId}/absence`, attendanceSchema, {
    method: "PUT",
    headers: eTag ? { "If-Match": eTag } : undefined,
    json: { operationId, ...(note ? { note } : {}) },
  });

/** Takes an absence back, for example after a wrong tap, while the exam is still running. */
export const undoStudentAbsence = (
  scheduleId: string,
  enrollmentId: string,
  eTag?: string | null,
  operationId: string = crypto.randomUUID(),
) =>
  unwrap(`/lecturer/exam-schedules/${scheduleId}/enrollments/${enrollmentId}/absence/undo`, attendanceSchema, {
    method: "POST",
    headers: eTag ? { "If-Match": eTag } : undefined,
    json: { operationId },
  });

/** Opens the exam room. Without a paper id the Backend uses the package attached to the shift. */
export const openExamSchedule = (scheduleId: string, examPaperId?: string) =>
  unwrap(
    `/lecturer/exam-schedules/${scheduleId}/open`,
    z.object({
      examScheduleId: z.string(),
      status: examScheduleStatusSchema,
      openedAt: z.string(),
      openedBy: z.string(),
      examPaperId: nullableString,
    }),
    { method: "POST", json: examPaperId ? { examPaperId } : {} },
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

/** A paper sealed into a locked, read-only package. */
export const sealedPaperSchema = z.object({
  versionId: z.string(),
  paperId: z.string(),
  examSubjectId: z.string(),
  subjectId: z.string(),
  examTypeId: z.string(),
  name: nullableString,
  versionNumber: z.number(),
  questionCount: z.number(),
  totalScore: z.number(),
  status: nullableString,
  sealedAt: z.string(),
  publishedToPoolAt: nullableString,
  eTag: nullableString,
  semesterId: z.string(),
  durationMinutes: z.number(),
  passScore: z.number(),
  cameraRequired: z.boolean(),
  scoringPolicy: nullableString,
});
export type SealedPaper = z.infer<typeof sealedPaperSchema>;

const ifMatch = (eTag?: string | null) => (eTag ? { "If-Match": eTag } : undefined);

/** Locks a paper into a read-only package. The paper must be the version the caller last read. */
export const sealExamPaper = (paperId: string, eTag?: string | null) =>
  unwrap(`/lecturer/exam-papers/${paperId}/seal`, sealedPaperSchema, { method: "POST", headers: ifMatch(eTag) });

/** Packages the signed-in lecturer sealed. */
export const getMySealedPapers = () =>
  unwrap("/lecturer/exam-papers/versions", z.array(sealedPaperSchema));

/** Hands a sealed package over to the examiners. */
export const handoverSealedPaper = (paperId: string, versionId: string, eTag?: string | null) =>
  unwrap(`/lecturer/exam-papers/${paperId}/versions/${versionId}/handover`, sealedPaperSchema, { method: "POST", headers: ifMatch(eTag) });

/** Takes a handed-over package back from the examiners. */
export const withdrawSealedPaper = (paperId: string, versionId: string, eTag?: string | null) =>
  unwrap(`/lecturer/exam-papers/${paperId}/versions/${versionId}/withdraw`, sealedPaperSchema, { method: "POST", headers: ifMatch(eTag) });

/** Packages handed over to examiners. */
export const getSealedExamPapers = () => unwrap("/sealed-exam-papers", z.array(sealedPaperSchema));

export const shiftPaperSelectionSchema = z.object({
  selectionId: z.string(),
  shiftId: z.string(),
  versionId: z.string(),
  operationId: z.string(),
  selectedAt: z.string(),
  releasedAt: nullableString,
  consumedAt: nullableString,
});
export type ShiftPaperSelection = z.infer<typeof shiftPaperSelectionSchema>;

export const sharedExamShiftSchema = z.object({
  shiftId: z.string(),
  name: nullableString,
  startsAt: z.string(),
  endsAt: z.string(),
  publishedAt: nullableString,
  openedAt: nullableString,
  status: nullableString,
  eTag: nullableString,
  scheduleIds: z.array(z.string()).nullable().transform((value) => value ?? []),
  examSubjectId: z.string(),
});
export type SharedExamShift = z.infer<typeof sharedExamShiftSchema>;

export type SharedExamShiftInput = {
  examSubjectId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  entryOpensAt: string;
  entryClosesAt: string;
  roomIds: string[];
};

/** Creates one shared shift and a schedule for every room. The exam must be sealed. */
export const createSharedExamShift = (input: SharedExamShiftInput) =>
  unwrap("/exam-shifts", sharedExamShiftSchema, { method: "POST", json: input });

/** What each chosen room can offer for this shift, before anything is created. The Backend also checks the rooms and times. */
export const previewSharedExamShift = (input: SharedExamShiftInput) =>
  unwrap("/exam-shifts/preview", z.array(z.object({
    roomId: z.string(),
    name: nullableString,
    availableComputerSeats: z.number(),
    availableCameraSeats: z.number(),
  })), { method: "POST", json: input });

/** Changes the rooms or times of a shift. Only before it is published and before anyone is added. */
export const updateSharedExamShift = (shiftId: string, input: SharedExamShiftInput, shiftETag?: string | null) =>
  unwrap(`/exam-shifts/${shiftId}`, sharedExamShiftSchema, { method: "PUT", headers: ifMatch(shiftETag), json: input });

/** Cancels a shift that has not been opened. Its package goes back to the pool. */
export const cancelSharedExamShift = (shiftId: string, shiftETag?: string | null) =>
  unwrap(`/exam-shifts/${shiftId}/cancel`, sharedExamShiftSchema, { method: "POST", headers: ifMatch(shiftETag) });

/** Ends the exam in one room. Only its chief, only after the shift ended and with no attempt still running. */
export const closeExamSchedule = (scheduleId: string) =>
  unwrap(`/lecturer/exam-schedules/${scheduleId}/close`, z.object({ examScheduleId: z.string(), status: examScheduleStatusSchema, closedAt: z.string() }), { method: "POST" });

const sealedQuestionSchema = z.object({
  examQuestionId: z.string(),
  questionId: z.string(),
  displayOrder: z.number(),
  maxScore: z.number(),
  snapshot: z.object({
    content: nullableString,
    questionType: z.string(),
    options: z.array(z.object({ optionId: z.string(), content: nullableString, isCorrect: z.boolean(), originalDisplayOrder: z.number() })).nullable().transform((value) => value ?? []),
  }),
});

/** The questions of a sealed package exactly as they were locked. */
export const getSealedPaperPreview = (paperId: string, versionId: string) =>
  unwrap(`/lecturer/exam-papers/${paperId}/versions/${versionId}/preview`, z.object({
    versionId: z.string(),
    paperId: z.string(),
    durationMinutes: z.number(),
    passScore: z.number(),
    questions: z.array(sealedQuestionSchema).nullable().transform((value) => value ?? []),
  }));

/** A ten-minute link to the locked audio of a question, or of one of its options. */
export const getSealedPaperAudio = (paperId: string, versionId: string, examQuestionId: string, optionId?: string) =>
  unwrap(
    `/lecturer/exam-papers/${paperId}/versions/${versionId}/questions/${examQuestionId}/audio${optionId ? `?optionId=${optionId}` : ""}`,
    z.object({ url: nullableString, expiresAt: z.string() }),
  );

export const getSharedExamShift = (shiftId: string) => unwrap(`/exam-shifts/${shiftId}`, sharedExamShiftSchema);

/** The package attached to a shift, or null while none is attached. */
export async function getShiftPaperSelection(shiftId: string): Promise<ShiftPaperSelection | null> {
  try {
    const selection = await unwrap(`/exam-shifts/${shiftId}/paper-selection`, shiftPaperSelectionSchema);
    return selection.releasedAt ? null : selection;
  } catch (error) {
    if (error instanceof ApiFailure && error.detail.kind === "not_found") return null;
    throw error;
  }
}

/**
 * Asks the Backend to attach a package from the handed-over pool to a shift. The request carries no
 * package id: the Backend picks, checks the package is intact, and answers with the one it chose.
 * operationId makes a retry safe, so keep the same one when repeating a request that may have landed.
 */
export const selectShiftPaper = (shiftId: string, shiftETag?: string | null, operationId: string = crypto.randomUUID()) =>
  unwrap(`/exam-shifts/${shiftId}/paper-selection`, shiftPaperSelectionSchema, {
    method: "POST",
    headers: ifMatch(shiftETag),
    json: { operationId },
  });

/** Publishes a shared shift once it has its package, people and rooms. */
export const publishSharedExamShift = (shiftId: string, shiftETag?: string | null) =>
  unwrap(`/exam-shifts/${shiftId}/publish`, sharedExamShiftSchema, { method: "POST", headers: ifMatch(shiftETag) });

/** Opens every room of a shared shift. For a shared shift only the examiner opens the exam, not the lecturers. */
export const openSharedExamShift = (shiftId: string, shiftETag?: string | null) =>
  unwrap(`/exam-shifts/${shiftId}/open`, sharedExamShiftSchema, { method: "POST", headers: ifMatch(shiftETag) });

export const releaseShiftPaper = (shiftId: string, shiftETag?: string | null) =>
  unwrap(`/exam-shifts/${shiftId}/paper-selection/release`, sharedExamShiftSchema, { method: "POST", headers: ifMatch(shiftETag) });

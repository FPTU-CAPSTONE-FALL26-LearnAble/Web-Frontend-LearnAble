import { z } from "zod";
import { ApiFailure, request, requestBlob } from "@/api/client";

const nullableString = z.string().nullable().optional();
const nullableDate = z.string().nullable().optional();

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
    throw new ApiFailure({ kind: "server", status: 200 }, response.message ?? undefined);
  }
  return schema.parse(response.data);
}

function queryString(filters: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

const pageFields = {
  pageNumber: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
};

export const monitoringStudentSchema = z.object({
  enrollmentId: z.string(),
  studentId: z.string(),
  studentCode: nullableString,
  studentName: nullableString,
  seatCode: nullableString,
  attendanceStatus: nullableString,
  attemptId: z.string().nullable().optional(),
  attemptStatus: nullableString,
  connectionStatus: nullableString,
  lastSeenAt: nullableDate,
  cameraStatus: nullableString,
  cameraReportedAt: nullableDate,
  lastVerifiedVideoAt: nullableDate,
  answeredQuestionCount: z.number(),
  totalQuestionCount: z.number(),
});

export const examMonitoringSchema = z.object({
  serverTime: z.string(),
  students: z.array(monitoringStudentSchema).nullable().transform((value) => value ?? []),
});

export const getExamMonitoring = (scheduleId: string) =>
  unwrap(`/examschedules/${scheduleId}/monitoring`, examMonitoringSchema);

export const integritySummarySchema = z.object({
  attemptId: z.string(),
  studentId: z.string(),
  userCode: nullableString,
  studentName: nullableString,
  scheduleId: z.string(),
  examShiftId: z.string(),
  roomName: nullableString,
  attemptStatus: nullableString,
  status: nullableString,
  revision: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedBy: z.string().nullable().optional(),
  resolvedAt: nullableDate,
  sources: z.array(z.string()).nullable().transform((value) => value ?? []),
  reportCount: z.number(),
  latestReason: nullableString,
  lastFlaggedAt: nullableDate,
  ongoingIncidentCount: z.number(),
});

const integritySummaryPageSchema = z.object({
  items: z.array(integritySummarySchema).nullable().transform((value) => value ?? []),
  ...pageFields,
});

export type IntegrityFilters = {
  Status?: string;
  Source?: string;
  IncidentStatus?: string;
  StudentKeyword?: string;
  ScheduleId?: string;
  Page?: number;
  PageSize?: number;
  Sort?: string;
};

export const getIntegrityReviews = (filters: IntegrityFilters = {}) =>
  unwrap(`/integrity-reviews${queryString(filters)}`, integritySummaryPageSchema);

/** The integrity queue already narrowed to one exam schedule. */
export const getScheduleIntegrityReviews = (scheduleId: string, filters: Omit<IntegrityFilters, "ScheduleId"> = {}) =>
  unwrap(`/examschedules/${scheduleId}/integrity-reviews${queryString(filters)}`, integritySummaryPageSchema);

const integrityEventSchema = z.object({
  eventId: z.string(),
  actorId: z.string().nullable().optional(),
  operationId: z.string(),
  eventType: nullableString,
  reportKind: nullableString,
  reason: nullableString,
  attemptOffsetMs: z.number().nullable().optional(),
  createdAt: z.string(),
  source: nullableString,
  reasonCode: nullableString,
  actorName: nullableString,
  actorRole: nullableString,
});

const signalIncidentSchema = z.object({
  incidentId: z.string(),
  lastSeenAt: z.string(),
  detectedAt: z.string(),
  recoveredAt: nullableDate,
  endedAt: nullableDate,
  status: nullableString,
  durationMs: z.number(),
  integrityEventId: z.string().nullable().optional(),
  fromOffsetMs: z.number(),
  toOffsetMs: z.number(),
});

export const integrityReviewSchema = z.object({
  attemptId: z.string(),
  scheduleId: z.string(),
  status: nullableString,
  revision: z.string(),
  createdAt: nullableDate,
  updatedAt: nullableDate,
  resolvedAt: nullableDate,
  resolvedBy: z.string().nullable().optional(),
  decisionReason: nullableString,
  events: z.object({
    items: z.array(integrityEventSchema).nullable().transform((value) => value ?? []),
    ...pageFields,
  }),
  signalIncidents: z.array(signalIncidentSchema).nullable().transform((value) => value ?? []),
});

export const getAttemptIntegrity = (attemptId: string, page = 1, pageSize = 100) =>
  unwrap(`/exam-attempts/${attemptId}/integrity${queryString({ Page: page, PageSize: pageSize })}`, integrityReviewSchema);

export const resolveAttemptIntegrity = (
  attemptId: string,
  revision: string,
  input: { decision: string; reason: string },
) => unwrap(`/exam-attempts/${attemptId}/integrity/resolve`, integrityReviewSchema, {
  method: "POST",
  headers: { "If-Match": revision },
  json: { operationId: crypto.randomUUID(), ...input },
});

const activityEventSchema = z.object({
  activityId: z.string(),
  sessionId: z.string(),
  clientEventId: z.string(),
  sequenceNumber: z.number(),
  eventType: nullableString,
  occurredAt: z.string(),
  receivedAt: z.string(),
  clientElapsedMs: z.number(),
  attemptOffsetMs: z.number().nullable().optional(),
  timeBasis: nullableString,
  metadata: z.unknown().optional(),
  video: z.unknown().nullable().optional(),
});

const activityPageSchema = z.object({
  events: z.object({
    items: z.array(activityEventSchema).nullable().transform((value) => value ?? []),
    ...pageFields,
  }),
  asOfReceivedAt: z.string(),
});

export const getAttemptActivities = (attemptId: string, page = 1, pageSize = 100) =>
  unwrap(`/exam-attempts/${attemptId}/activities${queryString({ Page: page, PageSize: pageSize })}`, activityPageSchema);

const reportMetadataSchema = z.object({
  reportId: z.string(),
  examSubjectId: z.string(),
  examName: nullableString,
  subjectName: nullableString,
  semesterName: nullableString,
  passScore: z.number(),
  generatedAt: z.string(),
  releaseStatus: nullableString,
  scheduleCount: z.number(),
  releasedScheduleCount: z.number(),
  filters: nullableString,
  displayTimeZone: nullableString,
});

const reportSummarySchema = z.object({
  registered: z.number(), distinctStudents: z.number(), present: z.number(), absent: z.number(),
  notCheckedIn: z.number(), unknownAttendance: z.number(), notStarted: z.number(), active: z.number(),
  submitted: z.number(), cancelled: z.number(), gradingComplete: z.number(), needsManual: z.number(),
  ungraded: z.number(), unreviewedResults: z.number(), unconfirmedMarking: z.number(), eligibleScores: z.number(),
  passed: z.number(), failed: z.number(), participationRate: z.number().nullable(), passRate: z.number().nullable(),
  averageScore: z.number().nullable(), medianScore: z.number().nullable(), minimumScore: z.number().nullable(),
  maximumScore: z.number().nullable(), flaggedAttempts: z.number(), reportCount: z.number(), pendingReviews: z.number(),
  dismissedReviews: z.number(), invalidatedAttempts: z.number(), manualReports: z.number(), systemReports: z.number(),
});

export const examReportOverviewSchema = z.object({
  metadata: reportMetadataSchema,
  summary: reportSummarySchema,
  histogram: z.array(z.object({ label: nullableString, lowerBound: z.number(), upperBound: z.number(), includesUpperBound: z.boolean(), count: z.number() })).nullable().transform((value) => value ?? []),
  rooms: z.array(z.unknown()).nullable().transform((value) => value ?? []),
  shifts: z.array(z.unknown()).nullable().transform((value) => value ?? []),
});

const reportStudentSchema = z.object({
  enrollmentId: z.string(), studentId: z.string(), studentCode: nullableString, studentName: nullableString,
  scheduleId: z.string(), shiftId: z.string(), shiftName: nullableString, roomId: z.string(), roomName: nullableString,
  seatCode: nullableString, attendanceStatus: nullableString, participationStatus: nullableString,
  attemptId: z.string().nullable().optional(), attemptStatus: nullableString, gradingStatus: nullableString,
  totalScore: z.number().nullable().optional(), maxScore: z.number().nullable().optional(), normalizedScore: z.number().nullable().optional(),
  scoreEligible: z.boolean(), passed: z.boolean().nullable().optional(), integrityStatus: nullableString,
  reportCount: z.number(),
});

const reportStudentsSchema = z.object({
  metadata: reportMetadataSchema,
  students: z.object({ items: z.array(reportStudentSchema).nullable().transform((value) => value ?? []), ...pageFields }),
});

const reportIncidentSchema = z.object({
  eventId: z.string(), attemptId: z.string(), studentCode: nullableString, studentName: nullableString,
  shiftName: nullableString, roomName: nullableString, source: nullableString, actorName: nullableString,
  actorRole: nullableString, reasonCode: nullableString, reason: nullableString, reportKind: nullableString,
  createdAt: z.string(), attemptOffsetMs: z.number().nullable().optional(), signalStatus: nullableString,
  durationSeconds: z.number().nullable().optional(), integrityStatus: nullableString, decisionReason: nullableString,
});

const reportIncidentsSchema = z.object({
  metadata: reportMetadataSchema,
  incidents: z.object({ items: z.array(reportIncidentSchema).nullable().transform((value) => value ?? []), ...pageFields }),
});

export type ExamReportFilters = { StudentKeyword?: string; Page?: number; PageSize?: number };

export const getExamReportOverview = (examSubjectId: string, filters: ExamReportFilters = {}) =>
  unwrap(`/exam-subjects/${examSubjectId}/report${queryString(filters)}`, examReportOverviewSchema);

export const getExamReportStudents = (examSubjectId: string, filters: ExamReportFilters = {}) =>
  unwrap(`/exam-subjects/${examSubjectId}/report/students${queryString(filters)}`, reportStudentsSchema);

export const getExamReportIncidents = (examSubjectId: string, filters: ExamReportFilters = {}) =>
  unwrap(`/exam-subjects/${examSubjectId}/report/incidents${queryString(filters)}`, reportIncidentsSchema);

export const downloadExamReport = (examSubjectId: string, section: "students" | "incidents" = "students") =>
  requestBlob(`/exam-subjects/${examSubjectId}/report/export${queryString({ format: "xlsx", section })}`);


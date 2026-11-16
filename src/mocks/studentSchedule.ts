import { HttpResponse, delay, http } from "msw";

/**
 * Offline stand-in for the student side of the deployed exam schedule and
 * inbox APIs (FFCB-106, FFCB-279), used only when `VITE_USE_MSW=true`:
 *
 *   GET   /me/exam-schedules               paged `MyExamScheduleResponseModel`
 *   GET   /me/exam-schedules/{id}/result   the released result of a finished exam
 *   GET   /me/notifications                paged inbox
 *   GET   /me/notifications/unread-count
 *   PATCH /me/notifications/{id}/read
 *   PATCH /me/notifications/read-all
 *
 * Dates are relative to "now" so the page always has upcoming and past exams.
 */

const ok = <T,>(data: T) =>
  HttpResponse.json({ success: true, message: null, data, errors: null });

const page = <T,>(items: T[]) => ({
  items,
  pageNumber: 1,
  pageSize: Math.max(items.length, 1),
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** `days` from today at `hour`:00 local time. */
const at = (days: number, hour: number, minutes = 0) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minutes, 0, 0);
  return date.toISOString();
};

const schedule = (
  id: string,
  examName: string,
  roomName: string,
  days: number,
  hour: number,
  status: "Published" | "Open" | "Closed" | "Cancelled",
  seatCode: string | null,
) => ({
  schedule: {
    examScheduleId: id,
    examSubjectId: "5a000000-0000-4000-8000-000000000001",
    examName,
    examShiftId: "5b000000-0000-4000-8000-000000000001",
    examRoomId: "5c000000-0000-4000-8000-000000000001",
    roomName,
    startsAt: at(days, hour),
    endsAt: at(days, hour + 1, 30),
    entryOpensAt: at(days, hour - 1, 30),
    entryClosesAt: at(days, hour, 15),
    openedAt: status === "Closed" ? at(days, hour) : null,
    openedBy: null,
    closedAt: status === "Closed" ? at(days, hour + 1, 30) : null,
    status,
    invigilationSlotId: null,
  },
  seatCode,
  invigilatorRole: null,
});

const schedules = [
  schedule("5d000000-0000-4000-8000-000000000001", "PRO192 — Final Exam", "FPTU-EXAM-902", 3, 8, "Published", "A-12"),
  schedule("5d000000-0000-4000-8000-000000000002", "MAD101 — Final Exam", "FPTU-EXAM-305", 6, 13, "Published", null),
  schedule("5d000000-0000-4000-8000-000000000003", "SWE201 — Practical Exam", "FPTU-EXAM-110", 9, 10, "Cancelled", "C-04"),
  schedule("5d000000-0000-4000-8000-000000000004", "CSD201 — Midterm Exam", "FPTU-EXAM-902", -12, 8, "Closed", "B-07"),
  // Finished, but its result has not been released to students yet.
  schedule("5d000000-0000-4000-8000-000000000005", "DBI202 — Midterm Exam", "FPTU-EXAM-305", -4, 13, "Closed", "D-02"),
];

const results: Record<string, object> = {
  "5d000000-0000-4000-8000-000000000004": {
    attemptId: "5f000000-0000-4000-8000-000000000001",
    attemptStatus: "Submitted",
    autoScore: 6.5,
    manualScore: 1.5,
    totalScore: 8,
    maxScore: 10,
    gradingStatus: "Complete",
    submittedAt: at(-12, 9, 20),
    releasedAt: at(-9, 10),
  },
};

const notification = (
  id: string,
  title: string,
  content: string,
  notificationType: string,
  scheduleId: string | null,
  daysAgo: number,
  read: boolean,
) => ({
  notificationId: id,
  title,
  content,
  notificationType,
  actionUrl: scheduleId ? `/exam-schedules/${scheduleId}` : null,
  relatedEntityType: scheduleId ? "ExamSchedule" : null,
  relatedEntityId: scheduleId,
  publishedAt: at(-daysAgo, 9),
  expiresAt: null,
  receivedAt: at(-daysAgo, 9),
  readAt: read ? at(-daysAgo, 12) : null,
});

let notifications = [
  notification(
    "5e000000-0000-4000-8000-000000000001",
    "Exam schedule published: PRO192 — Final Exam",
    "Your exam has been scheduled in room FPTU-EXAM-902, seat A-12. Open your exam schedule for the date and check-in time.",
    "ExamSchedulePublished",
    "5d000000-0000-4000-8000-000000000001",
    0,
    false,
  ),
  notification(
    "5e000000-0000-4000-8000-000000000002",
    "Exam schedule published: MAD101 — Final Exam",
    "Your exam has been scheduled in room FPTU-EXAM-305. A seat will be assigned before the exam.",
    "ExamSchedulePublished",
    "5d000000-0000-4000-8000-000000000002",
    1,
    false,
  ),
  notification(
    "5e000000-0000-4000-8000-000000000003",
    "Planned maintenance",
    "LearnAble will be unavailable on Sunday from 01:00 to 03:00.",
    "SystemMaintenance",
    null,
    5,
    true,
  ),
];

export const studentScheduleHandlers = [
  http.get("*/me/exam-schedules", async () => {
    await delay(250);
    return ok(page(schedules));
  }),
  http.get("*/me/exam-schedules/:scheduleId/result", async ({ params }) => {
    await delay(200);
    const result = results[String(params.scheduleId)];
    return result
      ? ok(result)
      : HttpResponse.json(
          { success: false, message: "The result has not been released.", data: null, errors: null },
          { status: 404 },
        );
  }),
  http.get("*/me/notifications/unread-count", async () => {
    await delay(100);
    return ok({ unreadCount: notifications.filter((item) => !item.readAt).length });
  }),
  http.get("*/me/notifications", async ({ request }) => {
    await delay(250);
    const unreadOnly = new URL(request.url).searchParams.get("UnreadOnly") === "true";
    return ok(page(notifications.filter((item) => !unreadOnly || !item.readAt)));
  }),
  http.patch("*/me/notifications/read-all", async () => {
    await delay(150);
    const updatedCount = notifications.filter((item) => !item.readAt).length;
    const readAt = new Date().toISOString();
    notifications = notifications.map((item) => (item.readAt ? item : { ...item, readAt }));
    return ok({ updatedCount });
  }),
  http.patch("*/me/notifications/:id/read", async ({ params }) => {
    await delay(150);
    const found = notifications.find((item) => item.notificationId === params.id);
    if (!found) {
      return HttpResponse.json(
        { success: false, message: "Notification not found.", data: null, errors: null },
        { status: 404 },
      );
    }
    const updatedCount = found.readAt ? 0 : 1;
    notifications = notifications.map((item) =>
      item === found ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
    );
    return ok({ updatedCount });
  }),
];

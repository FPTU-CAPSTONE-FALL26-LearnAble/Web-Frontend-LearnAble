import { getResponse } from "msw";
import { z } from "zod";
import { pageSchema } from "@/api/catalog";
import { myExamScheduleSchema } from "@/api/exams";
import { inboxNotificationSchema } from "@/api/notifications";
import { groupSchedules } from "@/features/schedule/scheduleView";
import { studentScheduleHandlers } from "./studentSchedule";

const call = async (path: string, method = "GET") => {
  const response = await getResponse(
    studentScheduleHandlers,
    new Request(`http://localhost/api/v1${path}`, { method }),
  );
  if (!response) throw new Error(`No mock handler for ${method} ${path}`);
  return { status: response.status, ...((await response.json()) as { success: boolean; data: unknown }) };
};
const unreadCount = async () =>
  z.object({ unreadCount: z.number() }).parse((await call("/me/notifications/unread-count")).data).unreadCount;

/** The mocks must satisfy the same schemas the API modules parse the real Backend with. */
describe("student schedule mocks", () => {
  it("serves exam schedules that match the API contract, with upcoming and past exams", async () => {
    const page = pageSchema(myExamScheduleSchema).parse((await call("/me/exam-schedules")).data);
    const groups = groupSchedules(page.items);
    expect(groups.upcoming.length).toBeGreaterThan(0);
    expect(groups.past.length).toBeGreaterThan(0);
  });

  it("serves a released result for one finished exam and 404 for the others", async () => {
    const released = await call("/me/exam-schedules/5d000000-0000-4000-8000-000000000004/result");
    expect(released.data).toMatchObject({ totalScore: 8, maxScore: 10, gradingStatus: "Complete" });
    expect((await call("/me/exam-schedules/5d000000-0000-4000-8000-000000000005/result")).status).toBe(404);
  });

  it("serves an inbox that matches the API contract and tracks the read state", async () => {
    const inbox = pageSchema(inboxNotificationSchema).parse((await call("/me/notifications")).data);
    const unread = inbox.items.filter((item) => !item.readAt);
    expect(inbox.items.some((item) => item.notificationType === "ExamSchedulePublished")).toBe(true);
    expect(await unreadCount()).toBe(unread.length);

    await call(`/me/notifications/${unread[0].notificationId}/read`, "PATCH");
    expect(await unreadCount()).toBe(unread.length - 1);

    const unreadOnly = pageSchema(inboxNotificationSchema).parse(
      (await call("/me/notifications?UnreadOnly=true")).data,
    );
    expect(unreadOnly.items).toHaveLength(unread.length - 1);

    await call("/me/notifications/read-all", "PATCH");
    expect(await unreadCount()).toBe(0);
  });
});

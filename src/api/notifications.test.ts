import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, request: client.request };
});

import { createManagedNotification, getNotificationRecipientCandidates, getUnreadNotificationCount, publishManagedNotification, updateManagedNotification } from "./notifications";

describe("notification API", () => {
  beforeEach(() => client.request.mockReset());

  it("reads the personal unread count", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { unreadCount: 3 } });
    await expect(getUnreadNotificationCount()).resolves.toEqual({ unreadCount: 3 });
    expect(client.request).toHaveBeenCalledWith("/me/notifications/unread-count", expect.anything(), undefined);
  });

  it("creates a role notification draft with the Backend contract", async () => {
    const input = { title: "Exam update", content: "Room changed", notificationType: "GeneralAnnouncement" as const, actionUrl: "/examiner/schedule", expiresAt: null, audience: { type: "Roles" as const, userIds: [], roles: ["Lecturer"] } };
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { notificationId: "11111111-1111-1111-1111-111111111111", universityId: null, createdBy: null, title: input.title, content: input.content, notificationType: input.notificationType, actionUrl: input.actionUrl, relatedEntityType: null, relatedEntityId: null, audience: input.audience, status: "Draft", publishedAt: null, expiresAt: null, createdAt: "2026-11-07T00:00:00Z", updatedAt: "2026-11-07T00:00:00Z", revision: "22222222-2222-2222-2222-222222222222" } });
    await createManagedNotification(input);
    expect(client.request).toHaveBeenCalledWith("/notifications", expect.anything(), { method: "POST", json: input });
  });

  it("publishes with the notification ETag", async () => {
    const notification = { notificationId: "11111111-1111-1111-1111-111111111111", universityId: null, createdBy: null, title: "Exam update", content: "Room changed", notificationType: "GeneralAnnouncement", actionUrl: null, relatedEntityType: null, relatedEntityId: null, audience: { type: "University", userIds: [], roles: [] }, status: "Published", publishedAt: "2026-11-07T00:00:00Z", expiresAt: null, createdAt: "2026-11-07T00:00:00Z", updatedAt: "2026-11-07T00:00:00Z", revision: "22222222-2222-2222-2222-222222222222" };
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { notification, recipientCount: 12 } });
    await publishManagedNotification(notification.notificationId, notification.revision);
    expect(client.request).toHaveBeenCalledWith(`/notifications/${notification.notificationId}/publish`, expect.anything(), { method: "POST", headers: { "If-Match": '"11111111111111111111111111111111-22222222222222222222222222222222"' } });
  });

  it("updates a draft with the notification ETag", async () => {
    const input = { title: "Updated", content: "New message", notificationType: "SystemMaintenance" as const, actionUrl: null, expiresAt: null, audience: { type: "University" as const, userIds: [], roles: [] } };
    const id = "11111111-1111-1111-1111-111111111111";
    const revision = "22222222-2222-2222-2222-222222222222";
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { notificationId: id, universityId: null, createdBy: null, ...input, relatedEntityType: null, relatedEntityId: null, status: "Draft", publishedAt: null, createdAt: "2026-11-07T00:00:00Z", updatedAt: "2026-11-07T00:00:00Z", revision } });
    await updateManagedNotification(id, revision, input);
    expect(client.request).toHaveBeenCalledWith(`/notifications/${id}`, expect.anything(), { method: "PUT", headers: { "If-Match": '"11111111111111111111111111111111-22222222222222222222222222222222"' }, json: input });
  });

  it("queries recipient candidates with server-side search and role", async () => {
    client.request.mockResolvedValue({ success: true, message: null, errors: null, data: { items: [], totalCount: 0, pageNumber: 1, pageSize: 100, totalPages: 0, hasNextPage: false, hasPreviousPage: false } });
    await getNotificationRecipientCandidates("LEC0001", "Lecturer");
    expect(client.request).toHaveBeenCalledWith("/notifications/recipient-candidates?Page=1&PageSize=100&Search=LEC0001&Role=Lecturer", expect.anything(), undefined);
  });
});

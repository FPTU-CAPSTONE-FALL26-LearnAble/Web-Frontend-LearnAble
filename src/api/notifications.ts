import { z } from "zod";
import { ApiFailure, request } from "@/api/client";
import { pageSchema, queryString } from "@/api/catalog";

const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({ success: z.boolean(), message: z.string().nullable().optional(), data: schema.nullable(), errors: z.array(z.string()).nullable().optional() });
async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
  return response.data;
}
async function command(path: string, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(z.unknown()), init);
  if (!response.success) throw new ApiFailure({ kind: "server", status: 200, message: response.message ?? undefined, errors: response.errors ?? undefined });
}
export const inboxNotificationSchema = z.object({ notificationId: z.string(), title: z.string(), content: z.string(), notificationType: z.string(), actionUrl: z.string().nullable(), relatedEntityType: z.string().nullable(), relatedEntityId: z.string().nullable(), publishedAt: z.string(), expiresAt: z.string().nullable(), receivedAt: z.string(), readAt: z.string().nullable() });
export const managedNotificationSchema = z.object({
  notificationId: z.string(), universityId: z.string().nullable(), createdBy: z.string().nullable(), title: z.string(), content: z.string(),
  notificationType: z.string(), actionUrl: z.string().nullable(), relatedEntityType: z.string().nullable(), relatedEntityId: z.string().nullable(),
  audience: z.object({ type: z.string(), userIds: z.array(z.string()), roles: z.array(z.string()) }), status: z.string(),
  publishedAt: z.string().nullable(), expiresAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(), revision: z.string(),
});
export const notificationRecipientSchema = z.object({ userId: z.string(), userCode: z.string(), name: z.string(), email: z.string(), role: z.string(), receivedAt: z.string().nullable(), readAt: z.string().nullable() });
export type ManagedNotification = z.infer<typeof managedNotificationSchema>;
export type NotificationWriteInput = {
  title: string;
  content: string;
  notificationType: "GeneralAnnouncement" | "SystemMaintenance";
  actionUrl: string | null;
  expiresAt: string | null;
  audience: { type: "Users" | "Roles" | "University"; userIds: string[]; roles: string[] };
};
const notificationTag = (id: string, revision: string) => `"${id.replaceAll("-", "")}-${revision.replaceAll("-", "")}"`;
export const getMyNotifications = () => unwrap(`/me/notifications${queryString({ Page: 1, PageSize: 50 })}`, pageSchema(inboxNotificationSchema));
export const getUnreadNotificationCount = () => unwrap("/me/notifications/unread-count", z.object({ unreadCount: z.number() }));
export const markNotificationRead = (id: string) => unwrap(`/me/notifications/${id}/read`, z.object({ updatedCount: z.number() }), { method: "PATCH" });
export const markAllNotificationsRead = () => unwrap("/me/notifications/read-all", z.object({ updatedCount: z.number() }), { method: "PATCH" });
export const getManagedNotifications = () => unwrap(`/notifications${queryString({ Page: 1, PageSize: 100 })}`, pageSchema(managedNotificationSchema));
export const getManagedNotification = (id: string) => unwrap(`/notifications/${id}`, managedNotificationSchema);
export const createManagedNotification = (input: NotificationWriteInput) => unwrap("/notifications", managedNotificationSchema, { method: "POST", json: input });
export const updateManagedNotification = (id: string, revision: string, input: NotificationWriteInput) => unwrap(`/notifications/${id}`, managedNotificationSchema, { method: "PUT", headers: { "If-Match": notificationTag(id, revision) }, json: input });
export const getNotificationRecipientCandidates = (search = "", role?: string) => unwrap(`/notifications/recipient-candidates${queryString({ Page: 1, PageSize: 100, Search: search || undefined, Role: role || undefined })}`, pageSchema(notificationRecipientSchema));
export const publishManagedNotification = (id: string, revision: string) => unwrap(`/notifications/${id}/publish`, z.object({ notification: managedNotificationSchema, recipientCount: z.number() }), { method: "POST", headers: { "If-Match": notificationTag(id, revision) } });
export const getNotificationRecipients = (id: string, preview: boolean) => unwrap(`/notifications/${id}/recipients${preview ? "/preview" : ""}${queryString({ Page: 1, PageSize: 200 })}`, pageSchema(notificationRecipientSchema));
export const archiveManagedNotification = (id: string, revision: string) => unwrap(`/notifications/${id}/archive`, managedNotificationSchema, { method: "PATCH", headers: { "If-Match": notificationTag(id, revision) } });
export const deleteManagedNotification = (id: string, revision: string) => command(`/notifications/${id}`, { method: "DELETE", headers: { "If-Match": notificationTag(id, revision) } });

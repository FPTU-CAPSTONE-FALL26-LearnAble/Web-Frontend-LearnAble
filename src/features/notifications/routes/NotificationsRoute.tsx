/* eslint-disable shadcn/no-restyle -- Read/unread cards need the existing semantic border treatment. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useLocation } from "react-router";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notifications";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { z } from "zod";
import type { inboxNotificationSchema } from "@/api/notifications";

type InboxItem = z.infer<typeof inboxNotificationSchema>;

/**
 * Where "Open" leads. A published exam schedule always opens the schedule page of the role
 * reading it, whatever link the Backend attached, because that link is not role-aware.
 */
export function notificationTarget(item: InboxItem, pathname: string): string | null {
  const isSchedule = item.notificationType === "ExamSchedulePublished" || /ExamSchedule/i.test(item.relatedEntityType ?? "");
  if (isSchedule && pathname.startsWith("/lecturer")) return "/lecturer/exams";
  // The Backend links a published schedule to /exam-schedules/{id}, a path this app does not have.
  const scheduleId = item.actionUrl?.match(/^\/exam-schedules\/([0-9a-f-]{36})$/i)?.[1];
  if (scheduleId && pathname.startsWith("/examiner")) return `/examiner/schedule/${scheduleId}`;
  return item.actionUrl;
}

export function NotificationsRoute() {
  const client = useQueryClient();
  const { pathname } = useLocation();
  const notifications = useQuery({ queryKey: ["my-notifications"], queryFn: getMyNotifications });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["my-notifications"] }),
      client.invalidateQueries({ queryKey: ["my-notifications", "unread-count"] }),
    ]);
  };
  const read = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const unread = notifications.data?.items.filter((item) => !item.readAt).length ?? 0;
  return <main className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><h1 className="text-3xl font-semibold tracking-tight text-primary">Notifications</h1><p className="mt-2 text-muted-foreground">Schedule publications, assignments, and account updates.</p></div><Button variant="outline" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck />Mark all as read</Button></header>{notifications.isPending ? <p role="status" className="rounded-xl border border-border p-6">Loading notifications…</p> : notifications.error ? <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive">Notifications could not be loaded. <Button className="ml-3" variant="outline" onClick={() => notifications.refetch()}>Try again</Button></div> : notifications.data?.items.length ? <section className="space-y-3">{notifications.data.items.map((item) => <Card key={item.notificationId} className={item.readAt ? "shadow-none" : "border-primary shadow-none"}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><Bell className="mt-1 size-5 shrink-0 text-primary" /><div className="min-w-0"><h2 className="font-semibold">{item.title}</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.receivedAt).toLocaleString()}</p></div></div><div className="flex shrink-0 gap-2">{notificationTarget(item, pathname) ? <Button variant="outline" asChild><Link to={notificationTarget(item, pathname)!} onClick={() => { if (!item.readAt) read.mutate(item.notificationId); }}>Open</Link></Button> : null}{!item.readAt ? <Button variant="ghost" disabled={read.isPending} onClick={() => read.mutate(item.notificationId)}>Mark read</Button> : null}</div></CardContent></Card>)}</section> : <Card className="shadow-none"><CardContent className="py-14 text-center"><Bell className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-xl font-semibold">No notifications</h2><p className="mt-2 text-muted-foreground">New schedule and assignment updates will appear here.</p></CardContent></Card>}</main>;
}

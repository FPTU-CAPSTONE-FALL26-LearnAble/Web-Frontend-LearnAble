import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CalendarDays, Check, CheckCheck, ChevronRight, Info, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { z } from "zod";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, type inboxNotificationSchema } from "@/api/notifications";
import { cn } from "@/shared/ui/cn";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";

type InboxItem = z.infer<typeof inboxNotificationSchema>;

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const notificationMeta = (item: InboxItem) => {
  if (item.notificationType === "ExamSchedulePublished" || /ExamSchedule/i.test(item.relatedEntityType ?? "")) return { label: "Exam schedule", icon: CalendarDays };
  if (/assignment/i.test(item.notificationType) || /assignment/i.test(item.relatedEntityType ?? "")) return { label: "Assignment", icon: BellRing };
  return { label: "General update", icon: Info };
};

/** A schedule notification opens the schedule page of the role reading it. */
export function notificationTarget(item: InboxItem, pathname: string): string | null {
  const isSchedule = item.notificationType === "ExamSchedulePublished" || /ExamSchedule/i.test(item.relatedEntityType ?? "");
  if (isSchedule && pathname.startsWith("/lecturer")) return "/lecturer/exams";
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
  const items = notifications.data?.items ?? [];
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary" aria-hidden><BellRing className="size-5" /></span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-primary">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">Schedule publications, assignments, and account updates.</p>
          </div>
        </div>
        <Button variant="outline" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}>
          <CheckCheck aria-hidden />{readAll.isPending ? "Updating…" : "Mark all as read"}
        </Button>
      </header>

      {!notifications.isPending && !notifications.error && items.length ? (
        <section aria-label="Inbox summary" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3"><p className="font-semibold">Inbox</p>{unread ? <Badge>{unread} unread</Badge> : <Badge variant="outline"><Check aria-hidden />All read</Badge>}</div>
          <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "notification" : "notifications"}</p>
        </section>
      ) : null}

      {notifications.isPending ? (
        <section aria-label="Loading notifications" role="status" className="overflow-hidden rounded-2xl border border-border">
          <span className="sr-only">Loading notifications…</span>
          {[0, 1, 2].map((row) => <div key={row} aria-hidden className="h-28 animate-pulse border-b border-border bg-muted/50 last:border-b-0 motion-reduce:animate-none" />)}
        </section>
      ) : notifications.error ? (
        <section role="alert" className="flex flex-col items-start gap-4 rounded-2xl border border-destructive/40 p-6">
          <div><h2 className="font-semibold text-destructive">Notifications could not be loaded</h2><p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p></div>
          <Button variant="outline" onClick={() => notifications.refetch()}><RefreshCw aria-hidden />Try again</Button>
        </section>
      ) : items.length ? (
        <section aria-label="Notification list" className="overflow-hidden rounded-2xl border border-border bg-card">
          <ol className="divide-y divide-border">
            {items.map((item) => {
              const target = notificationTarget(item, pathname);
              const meta = notificationMeta(item);
              const Icon = meta.icon;
              const isUnread = !item.readAt;
              return (
                <li key={item.notificationId} className={cn("relative", isUnread && "bg-accent/35")}>
                  {isUnread ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" /> : null}
                  <article className="grid gap-4 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:px-6">
                    <span className={cn("grid size-11 place-items-center rounded-xl", isUnread ? "bg-secondary text-primary" : "bg-muted text-muted-foreground")} aria-hidden><Icon className="size-5" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className={cn("text-base", isUnread ? "font-bold text-foreground" : "font-semibold")}>{item.title}</h2>{isUnread ? <Badge variant="secondary">New</Badge> : null}</div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.content}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{meta.label}</span><span aria-hidden>•</span><time dateTime={item.receivedAt}>{dateTime.format(new Date(item.receivedAt))}</time></div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {!isUnread ? <span className="hidden items-center gap-1 text-xs font-medium text-muted-foreground lg:flex"><Check className="size-3.5" aria-hidden />Read</span> : null}
                      {isUnread ? <Button variant="ghost" disabled={read.isPending} onClick={() => read.mutate(item.notificationId)}>Mark read</Button> : null}
                      {target ? <Button variant="outline" asChild><Link to={target} onClick={() => { if (isUnread) read.mutate(item.notificationId); }}>Open<ChevronRight aria-hidden /></Link></Button> : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Bell className="size-6" aria-hidden /></span>
          <h2 className="mt-5 text-xl font-semibold">No notifications</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">New schedule and assignment updates will appear here.</p>
        </section>
      )}
    </main>
  );
}

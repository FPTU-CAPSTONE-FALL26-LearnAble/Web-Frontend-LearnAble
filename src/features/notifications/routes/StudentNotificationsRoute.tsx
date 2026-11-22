import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCheck, Mail, MailOpen } from "lucide-react";
import { Link } from "react-router";
import type { z } from "zod";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type inboxNotificationSchema,
} from "@/api/notifications";
import { isStudentPath } from "@/features/auth/roleRouting";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { Button } from "@/shared/ui/primitives/button";

type InboxItem = z.infer<typeof inboxNotificationSchema>;

const t = vi.notifications;
const receivedFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const isScheduleNotification = (item: InboxItem) =>
  item.notificationType === "ExamSchedulePublished" ||
  /ExamSchedule/i.test(item.relatedEntityType ?? "");

/**
 * Where a student's notification leads. The Backend links a published schedule
 * to `/exam-schedules/{id}`, a path this app does not have, so it always opens
 * the student's schedule page. Any other link is followed only when it is a
 * page a student can open.
 */
export function studentNotificationTarget(item: InboxItem): string | null {
  if (isScheduleNotification(item)) return "/schedule";
  return item.actionUrl && isStudentPath(item.actionUrl) ? item.actionUrl : null;
}

/** FFCB-279 — the student's inbox; a published exam schedule arrives here. */
export function StudentNotificationsRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["my-notifications"], queryFn: getMyNotifications });
  // The prefix also covers the unread count shown in the navigation.
  const refresh = () => client.invalidateQueries({ queryKey: ["my-notifications"] });
  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      announce(t.markedRead);
      return refresh();
    },
  });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      announce(t.markedAllRead);
      return refresh();
    },
  });

  const items = query.data?.items ?? [];
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 tabIndex={-1} className="text-2xl font-bold">
            {t.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{t.intro}</p>
        </div>
        <Button
          variant="secondary"
          disabled={!unread || readAll.isPending}
          onClick={() => readAll.mutate()}
        >
          <CheckCheck aria-hidden />
          {t.markAllRead}
        </Button>
      </header>

      {read.isError || readAll.isError ? (
        <p role="alert" className="rounded-xl border-2 border-destructive p-4 font-semibold text-destructive">
          {t.actionError}
        </p>
      ) : null}

      {query.isPending ? <p role="status">{t.loading}</p> : null}

      {query.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-destructive p-6"
        >
          <p className="font-semibold text-destructive">{t.loadError}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            {vi.common.retry}
          </Button>
        </div>
      ) : null}

      {query.data && !items.length ? (
        <div className="rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold">{t.empty}</h2>
          <p className="mt-2 text-muted-foreground">{t.emptyHint}</p>
        </div>
      ) : null}

      {items.length ? (
        <>
          <p>{t.unreadSummary(unread)}</p>
          <ul aria-label={t.listLabel} className="flex flex-col gap-4">
            {items.map((item) => {
              const target = studentNotificationTarget(item);
              const isSchedule = isScheduleNotification(item);
              const headingId = `notification-${item.notificationId}`;
              const StateIcon = item.readAt ? MailOpen : Mail;
              return (
                <li key={item.notificationId}>
                  <article
                    aria-labelledby={headingId}
                    className={
                      item.readAt
                        ? "rounded-xl border border-border bg-card p-6"
                        : "rounded-xl border-2 border-foreground bg-card p-6"
                    }
                  >
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <StateIcon aria-hidden className="size-5 shrink-0" />
                        {item.readAt ? t.read : t.unread}
                      </span>
                      {isSchedule ? (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays aria-hidden className="size-5 shrink-0" />
                          {t.typeSchedule}
                        </span>
                      ) : null}
                    </p>
                    <h2 id={headingId} className="mt-2 text-xl font-semibold">
                      {item.title}
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <time dateTime={item.receivedAt}>
                        {t.received(receivedFormat.format(new Date(item.receivedAt)))}
                      </time>
                    </p>
                    {target || !item.readAt ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {target ? (
                          <Button asChild variant="secondary">
                            <Link
                              to={target}
                              aria-label={
                                isSchedule ? t.viewScheduleFor(item.title) : t.openFor(item.title)
                              }
                              onClick={() => {
                                if (!item.readAt) read.mutate(item.notificationId);
                              }}
                            >
                              {isSchedule ? t.viewSchedule : t.open}
                            </Link>
                          </Button>
                        ) : null}
                        {!item.readAt ? (
                          <Button
                            variant="ghost"
                            disabled={read.isPending}
                            aria-label={t.markReadFor(item.title)}
                            onClick={() => read.mutate(item.notificationId)}
                          >
                            {t.markRead}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

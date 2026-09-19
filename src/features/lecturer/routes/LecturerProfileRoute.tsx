import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  FileQuestion,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { lecturerProfileFixture as profile } from "../data/profileFixture";
import { notConnected, PageHeading, StatusBadge } from "../components/Workbench";

const activityIcons = {
  question: FileQuestion,
  material: BookOpenText,
  exam: CalendarClock,
};

export function LecturerProfileRoute() {
  useRouteAnnouncer("Lecturer profile", "Lecturer profile");
  const user = useAuthStore((state) => state.user)!;
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeading
        title="My profile"
        description="Your lecturer identity, academic responsibilities and contact information."
      >
        <Button className="text-white" onClick={() => notConnected("Edit profile")}>
          <Pencil aria-hidden />
          Edit profile
        </Button>
      </PageHeading>

      <Card className="overflow-hidden border-[var(--color-border-subtle)] p-0 shadow-none ring-0">
        <div className="h-3 bg-[var(--color-action)]" />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="size-24 border-4 border-white shadow-[var(--shadow-control)]">
            <AvatarFallback className="bg-[var(--color-selected-bg)] text-2xl font-extrabold text-[var(--color-action)]">
              {initials || "LO"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
                {user.fullName}
              </h1>
              <StatusBadge value={profile.employmentStatus} />
            </div>
            <p className="mt-1 text-base font-bold text-[var(--color-action)]">
              {profile.title}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><BriefcaseBusiness aria-hidden className="size-4" />{profile.department}</span>
              <span className="flex items-center gap-1.5"><GraduationCap aria-hidden className="size-4" />{profile.faculty}</span>
              <span className="flex items-center gap-1.5"><MapPin aria-hidden className="size-4" />{profile.campus}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-action)] bg-[var(--color-selected-bg)] px-5 py-4 text-center sm:text-left">
            <p className="text-xs font-bold uppercase text-muted-foreground">Lecturer ID</p>
            <p className="mt-1 text-xl font-extrabold tracking-wide text-[var(--color-action)]">{profile.lecturerCode}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <Card className="gap-0 border-[var(--color-border-subtle)] p-0 shadow-none ring-0">
            <div className="border-b border-[var(--color-border-subtle)] p-5">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><UserRound aria-hidden className="size-5 text-[var(--color-action)]" />Contact & employment</h2>
            </div>
            <dl className="grid sm:grid-cols-2">
              {[
                [Mail, "Institutional email", profile.email],
                [Phone, "Phone", profile.phone],
                [Building2, "Office", profile.office],
                [CalendarClock, "Consultation hours", profile.consultationHours],
                [ShieldCheck, "Employment status", profile.employmentStatus],
                [BriefcaseBusiness, "Joined FPT University", profile.joinedDate],
              ].map(([Icon, label, value], index) => {
                const DetailIcon = Icon as typeof Mail;
                return (
                  <div key={String(label)} className={`flex gap-3 p-5 ${index < 4 ? "border-b border-[var(--color-border-subtle)]" : ""} ${index % 2 === 0 ? "sm:border-r sm:border-[var(--color-border-subtle)]" : ""}`}>
                    <DetailIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--color-secondary)]" />
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase text-muted-foreground">{String(label)}</dt>
                      <dd className="mt-1 break-words text-sm font-bold">{String(value)}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Card>

          <Card className="gap-0 border-[var(--color-border-subtle)] p-0 shadow-none ring-0">
            <div className="border-b border-[var(--color-border-subtle)] p-5">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><BookOpenText aria-hidden className="size-5 text-[var(--color-action)]" />Current teaching assignments</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fall 2026 · Mock schedule</p>
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {profile.courses.map((course) => (
                <article key={course.code} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[var(--color-action)] text-white">{course.code}</Badge>
                      <h3 className="font-extrabold">{course.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Groups {course.groups}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><CalendarClock aria-hidden className="size-4 text-[var(--color-secondary)]" />{course.schedule}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-[var(--color-success)]">
                    <Users aria-hidden className="size-5" />
                    <strong className="text-xl tabular-nums">{course.students}</strong>
                    <span className="text-xs font-bold">students</span>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="gap-0 border-[var(--color-border-subtle)] p-0 shadow-none ring-0">
            <div className="border-b border-[var(--color-border-subtle)] p-5">
              <h2 className="text-lg font-extrabold">Areas of expertise</h2>
            </div>
            <div className="flex flex-wrap gap-2 p-5">
              {profile.expertise.map((item) => <Badge key={item} variant="outline" className="min-h-8 border-[var(--color-secondary)] bg-white px-3 text-[var(--color-secondary)]">{item}</Badge>)}
            </div>
          </Card>

          <Card className="gap-0 border-[var(--color-border-subtle)] p-0 shadow-none ring-0">
            <div className="border-b border-[var(--color-border-subtle)] p-5">
              <h2 className="text-lg font-extrabold">Recent activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">Illustrative profile activity</p>
            </div>
            <ol className="divide-y divide-[var(--color-border-subtle)]">
              {profile.activity.map((item) => {
                const ActivityIcon = activityIcons[item.type];
                return (
                  <li key={item.title} className="flex gap-3 p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-selected-bg)] text-[var(--color-action)]"><ActivityIcon aria-hidden className="size-4" /></span>
                    <div>
                      <p className="text-sm font-bold leading-snug">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                      <time className="mt-2 block text-xs font-semibold text-[var(--color-secondary)]">{item.time}</time>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

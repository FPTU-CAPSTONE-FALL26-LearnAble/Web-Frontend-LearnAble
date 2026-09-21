import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import {
  CheckCheck,
  FileDown,
  MapPin,
  RefreshCw,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Dialog, DialogContent } from "@/shared/ui/primitives/dialog";
import { ExamOverview } from "../components/ExamOverview";
import {
  Breadcrumb,
  notConnected,
  PageHeading,
  ScrollRegion,
  StatusBadge,
} from "../components/Workbench";
import { examShifts, seatsForExam, type ExamSeat } from "../data/examFixture";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";

type Filter =
  | "All"
  | "Present"
  | "Not checked in"
  | "Started"
  | "Submitted"
  | "Incident"
  | "Cheating";
const matches = (seat: ExamSeat, filter: Filter) =>
  filter === "All" ||
  (filter === "Present"
    ? seat.status !== "Not checked in"
    : seat.status === filter);
const statusTone = (status: ExamSeat["status"]) =>
  status === "Present"
    ? "success"
    : status === "Not checked in"
      ? "neutral"
      : status === "Started" || status === "Submitted"
        ? "info"
        : status === "Incident"
          ? "warning"
          : "danger";
const seatTone = (status: ExamSeat["status"]) =>
  status === "Present"
    ? "border-[var(--color-success)] bg-white"
    : status === "Not checked in"
      ? "border-[var(--color-border)] bg-[var(--color-neutral-status-bg)]"
      : status === "Started"
        ? "border-[var(--color-secondary)] bg-[var(--color-info-bg)]"
        : status === "Submitted"
          ? "border-[var(--color-success)] bg-[var(--color-success-bg)]"
        : status === "Incident"
          ? "border-[var(--color-warning)] bg-[var(--color-warning-bg)]"
          : "border-[var(--color-error)] bg-[var(--color-danger-bg)]";
const filterStyle = (value: Filter, selected: boolean): CSSProperties | undefined => {
  if (value === "All") return undefined;
  const tone = statusTone(value);
  const color = {
    success: "var(--color-success)",
    neutral: "var(--color-border)",
    info: "var(--color-secondary)",
    warning: "var(--color-warning)",
    danger: "var(--color-error)",
  }[tone];
  return {
    borderColor: color,
    background: selected
      ? color
      : tone === "neutral"
        ? "var(--color-neutral-status-bg)"
        : `var(--color-${tone}-bg)`,
    color: selected
      ? tone === "warning"
        ? "var(--color-text)"
        : "var(--color-secondary-text)"
      : "var(--color-text)",
  };
};
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();
export function AttendanceRoute() {
  useRouteAnnouncer(
    "Student Attendance & Seating Map",
    "Student Attendance & Seating Map",
  );
  const { examId } = useParams();
  const exam = examShifts.find((value) => value.id === examId);
  const [filter, setFilter] = useState<Filter>("All");
  const [listFilter, setListFilter] = useState<"All" | "Not checked in">("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(1);
  const [photoSeat, setPhotoSeat] = useState<ExamSeat | null>(null);
  if (!exam)
    return (
      <div className="space-y-4">
        <PageHeading
          title="Exam shift not found"
          description="This exam is not in the available schedule."
        />
        <Button asChild variant="outline">
          <Link to="/lecturer/exams">Back to exam schedule</Link>
        </Button>
      </div>
    );
  const seats = seatsForExam(exam);
  const present = seats.filter((seat) => seat.status !== "Not checked in").length;
  const visible = seats.filter((seat) => matches(seat, filter));
  const list = seats.filter(
    (seat) =>
      matches(seat, listFilter) &&
      `${seat.name} ${seat.studentId} ${seat.citizenId} ${seat.number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          parent="Exam Schedule"
          path="/lecturer/exams"
          current={`${exam.time} · ${exam.room}`}
        />
        <Button
          variant="outline"
          onClick={() => notConnected("Refresh live seating map")}
        >
          <RefreshCw aria-hidden />
          Refresh map
        </Button>
      </div>
      <PageHeading title="Student Attendance & Seating Map" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <ExamOverview exam={exam} attendance />
          <Card className="border-[var(--color-border-subtle)] shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Seat status filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(
                [
                  "All",
                  "Present",
                  "Not checked in",
                  "Started",
                  "Submitted",
                  "Incident",
                  "Cheating",
                ] as Filter[]
              ).map((value) => (
                <Button
                  key={value}
                  variant={value === "All" && value === filter ? "primary" : "outline"}
                  style={filterStyle(value, value === filter)}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value} ({seats.filter((seat) => matches(seat, value)).length}
                  )
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card className="lecturer-major-card min-w-0 border shadow-none">
            <CardHeader>
              <CardTitle className="rounded-xl bg-foreground p-4 text-base text-background">
                INVIGILATOR DESK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollRegion
                label="Seating map"
                className="overflow-x-auto pb-2"
              >
                <div className="grid min-w-[560px] grid-cols-4 gap-3">
                  {visible.map((seat) => (
                    <Button
                      key={seat.number}
                      variant="outline"
                      aria-pressed={selected === seat.number}
                      aria-label={`Seat ${seat.number}, ${seat.name}, ${seat.status}`}
                      onClick={() => setSelected(seat.number)}
                      className={`flex h-auto min-h-36 min-w-0 flex-col items-stretch gap-3 whitespace-normal p-3 text-left ${seatTone(seat.status)} ${selected === seat.number ? "ring-2 ring-secondary" : ""}`}
                    >
                      <span className="flex items-center justify-between gap-1 text-xs font-bold">
                        <span className="flex items-center gap-1">
                          <MapPin aria-hidden className="size-4" />
                          Seat {seat.seatLocation}
                        </span>
                      </span>
                      <span
                        className="truncate text-xs font-bold"
                        title={seat.name}
                      >
                        {seat.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {seat.studentId}
                      </span>
                      <StatusBadge value={seat.status} tone={statusTone(seat.status)} />
                      <span className="text-[11px] text-muted-foreground">
                        {seat.checkIn}
                      </span>
                    </Button>
                  ))}
                </div>
              </ScrollRegion>
            </CardContent>
          </Card>
        </div>
        <aside
          aria-label="Student attendance list"
          className="min-w-0 xl:sticky xl:top-6"
        >
          <Card className="lecturer-major-card border-secondary shadow-none">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
                <span className="flex items-center gap-2">
                  <Users aria-hidden className="size-5" />
                  Student attendance
                </span>
                <StatusBadge value={`${present}/${seats.length} present`} />
              </CardTitle>
              <div className="relative">
                <Search
                  aria-hidden
                  className="absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Input
                  aria-label="Search attendance students"
                  placeholder="Search name, student ID or seat"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["All", "Not checked in"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={listFilter === value ? "primary" : "outline"}
                    aria-pressed={listFilter === value}
                    onClick={() => setListFilter(value)}
                  >
                    {value} (
                    {seats.filter((seat) => matches(seat, value)).length})
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollRegion
                label="Student list"
                className="max-h-[640px] space-y-3 overflow-y-auto p-1"
              >
                {list.map((seat) => (
                  <article
                    key={seat.number}
                    className={`rounded-xl border p-4 ${selected === seat.number ? "border-secondary ring-1 ring-secondary" : "border-[var(--color-border-subtle)]"}`}
                  >
                    <div className="flex items-stretch gap-4">
                      <button
                        type="button"
                        aria-label={`View ${seat.name} student photo`}
                        className="group/photo relative min-h-36 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                        onClick={() => setPhotoSeat(seat)}
                      >
                        <Avatar className="size-full rounded-xl after:rounded-xl">
                          <AvatarFallback
                            role="img"
                            aria-label={`${seat.name} student avatar`}
                            className="rounded-xl bg-[var(--color-info-bg)] text-2xl font-extrabold text-[var(--color-secondary)]"
                          >
                            {initials(seat.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute inset-x-0 bottom-0 bg-[var(--color-text)]/80 px-2 py-1.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100">
                          View photo
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold" title={seat.name}>{seat.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Seat {seat.seatLocation} · {seat.studentId}
                            </p>
                          </div>
                          <StatusBadge value={seat.status} tone={statusTone(seat.status)} />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">
                          CCCD: {seat.citizenId}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="border-[var(--color-success)] bg-[var(--color-success)] text-[var(--color-error-text)] hover:bg-[var(--color-success)] hover:opacity-90"
                            onClick={() =>
                              notConnected(`Mark ${seat.name} present`)
                            }
                          >
                            Present
                          </Button>
                          <Button
                            variant="outline"
                            className="border-[var(--color-error)] bg-[var(--color-error)] text-[var(--color-error-text)] hover:bg-[var(--color-error)] hover:opacity-90"
                            onClick={() => notConnected(`Mark ${seat.name} absent`)}
                          >
                            Absent
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {list.length === 0 && (
                  <p
                    role="status"
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No students match this search.
                  </p>
                )}
              </ScrollRegion>
              <Dialog
                open={photoSeat !== null}
                onOpenChange={(open) => {
                  if (!open) setPhotoSeat(null);
                }}
              >
                {photoSeat && (
                  <DialogContent
                    title={photoSeat.name}
                    description={`Student photo · ${photoSeat.studentId} · Seat ${photoSeat.seatLocation}`}
                    className="w-[min(92vw,440px)]"
                  >
                    <Avatar className="mx-auto h-[min(58vh,440px)] w-full max-w-80 rounded-xl border border-[var(--color-border)] after:rounded-xl">
                      <AvatarFallback className="rounded-xl bg-[var(--color-info-bg)] text-6xl font-extrabold text-[var(--color-secondary)]">
                        {initials(photoSeat.name)}
                      </AvatarFallback>
                    </Avatar>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="font-bold">CCCD</dt>
                      <dd>{photoSeat.citizenId}</dd>
                      <dt className="font-bold">Seat</dt>
                      <dd>{photoSeat.seatLocation}</dd>
                    </dl>
                  </DialogContent>
                )}
              </Dialog>
              <div className="mt-5 grid gap-3 border-t border-[var(--color-border-subtle)] pt-4">
                <Button
                  onClick={() => notConnected("Mark all students present")}
                >
                  <CheckCheck aria-hidden />
                  Mark all present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => notConnected("Export attendance report")}
                >
                  <FileDown aria-hidden />
                  Export attendance report
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] bg-background py-4">
        <p className="text-sm font-bold">
          {present}/{seats.length} students checked in
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => notConnected("Report incident")}
          >
            <TriangleAlert aria-hidden />
            Report incident
          </Button>
          <Button
            variant="outline"
            onClick={() => notConnected("Report exam absences")}
          >
            Report absences
          </Button>
          <Button onClick={() => notConnected("Finish attendance")}>
            Finish
          </Button>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, RefreshCw, UnlockKeyhole } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Breadcrumb, PageHeading, ScrollRegion, StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { checkInStudent, checkOutStudent, getExamPapers, getExamSchedule, getExamSeatMap, getExamStudents, openExamSchedule, undoCheckInStudent, type ExamStudent } from "@/api/exams";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { toast } from "@/shared/ui/primitives/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";

function seatStatus(student: ExamStudent | null) {
  if (!student) return "Available";
  if (student.attemptProgress === "Submitted") return "Submitted";
  if (student.attemptProgress === "InProgress") return "Started";
  return student.attendanceStatus === "NotCheckedIn" ? "Not checked in" : student.attendanceStatus.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function AttendanceRoute() {
  useRouteAnnouncer("Student Attendance & Seating Map", "Student Attendance & Seating Map");
  const { examId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [examPaperId, setExamPaperId] = useState("");
  const scheduleId = examId ?? "";
  const enabled = Boolean(examId);
  const seatMap = useQuery({ queryKey: ["lecturer", "seat-map", scheduleId], queryFn: () => getExamSeatMap(scheduleId), enabled });
  const students = useQuery({ queryKey: ["lecturer", "exam-students", scheduleId], queryFn: () => getExamStudents(scheduleId), enabled });
  const schedule = useQuery({ queryKey: ["lecturer", "exam-schedule", scheduleId], queryFn: () => getExamSchedule(scheduleId), enabled });
  const papers = useQuery({ queryKey: ["lecturer", "exam-papers", schedule.data?.examSubjectId], queryFn: () => getExamPapers(schedule.data!.examSubjectId), enabled: Boolean(schedule.data?.examSubjectId) });
  const publishedPapers = (papers.data ?? []).filter((paper) => paper.status === "Published" && paper.questions.length > 0);
  useExpiredSession(seatMap.error || students.error || schedule.error || papers.error);
  const refresh = async () => { await Promise.all([seatMap.refetch(), students.refetch()]); };
  const attendance = useMutation({
    mutationFn: ({ action, enrollmentId }: { action: "in" | "undo" | "out"; enrollmentId: string }) => action === "in" ? checkInStudent(scheduleId, enrollmentId) : action === "out" ? checkOutStudent(scheduleId, enrollmentId) : undoCheckInStudent(scheduleId, enrollmentId),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["lecturer", "exam-students", scheduleId] }), queryClient.invalidateQueries({ queryKey: ["lecturer", "seat-map", scheduleId] })]); },
    onError: () => toast({ title: "Attendance wasn’t updated", description: "Check the student’s current status and try again." }),
  });
  const openSchedule = useMutation({
    mutationFn: () => openExamSchedule(scheduleId, examPaperId),
    onSuccess: async () => { toast({ title: "Exam schedule opened", description: "Eligible candidates can now enter the exam." }); await refresh(); },
    onError: () => toast({ title: "Unable to open exam", description: "Confirm the published paper and schedule window, then try again." }),
  });
  if (!examId) return <p role="alert">No exam schedule was selected.</p>;
  if (seatMap.isPending || students.isPending || schedule.isPending) return <p role="status" className="p-6">Loading live attendance data…</p>;
  if (seatMap.error || students.error || schedule.error || papers.error) return <div role="alert" className="rounded-xl border border-destructive p-6 text-destructive"><p className="font-bold">Unable to load attendance data.</p><Button className="mt-3" variant="outline" onClick={() => void refresh()}>Retry</Button></div>;
  if (!seatMap.data) return <p role="status">No seat map is available for this schedule.</p>;
  const rows = (students.data?.items ?? []).filter((student) => `${student.studentCode ?? ""} ${student.studentName ?? ""} ${student.seatCode ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const present = (students.data?.items ?? []).filter((student) => student.attendanceStatus !== "NotCheckedIn" && student.attendanceStatus !== "Absent").length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Breadcrumb parent="Exam Schedule" path="/lecturer/exams" current={`${new Date(seatMap.data.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} · ${seatMap.data.roomName ?? "Exam room"}`} currentClassName="font-semibold text-primary" /><Button variant="outline" onClick={() => void refresh()}><RefreshCw aria-hidden />Refresh map</Button></div>
      <PageHeading title="Student Attendance & Seating Map" description="Review the live roster, seat assignments, and attendance status." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <Card className="border-border shadow-none"><CardHeader><CardTitle className="text-primary">Seating map · {seatMap.data.roomName ?? "Exam room"}</CardTitle></CardHeader><CardContent><ScrollRegion label="Live seating map" className="overflow-x-auto pb-2"><div className="grid min-w-[560px] grid-cols-4 gap-3">
          {seatMap.data.seats.map((seat) => { const state = seatStatus(seat.student); return <div key={seat.seatId} className={`min-h-32 rounded-xl border p-3 ${seat.student?.attendanceStatus === "Present" ? "border-success-border" : "border-border"}`}><p className="flex items-center gap-1 text-xs font-bold"><MapPin className="size-4" />Seat {seat.seatCode ?? `${seat.rowNumber}-${seat.columnNumber}`}</p><p className="mt-3 truncate text-sm font-bold">{seat.student?.studentName ?? "Available"}</p><p className="mt-1 text-xs text-muted-foreground">{seat.student?.studentCode ?? "No candidate"}</p><div className="mt-3"><StatusBadge value={state} tone={state === "Present" || state === "Submitted" ? "success" : state === "Started" ? "info" : "neutral"} /></div></div>; })}
          {seatMap.data.seats.length === 0 ? <p className="col-span-4 py-10 text-center text-muted-foreground">No seats have been configured for this room.</p> : null}
        </div></ScrollRegion></CardContent></Card>
        <Card className="border-border shadow-none"><CardHeader><CardTitle className="flex items-center justify-between gap-2 text-primary"><span>Student attendance</span><StatusBadge value={`${present}/${students.data?.totalCount ?? 0} present`} /></CardTitle><Input aria-label="Search attendance students" placeholder="Search name, student ID or seat" value={search} onChange={(event) => setSearch(event.target.value)} /></CardHeader><CardContent><ScrollRegion label="Live student list" className="max-h-[640px] space-y-3 overflow-y-auto">
          {rows.map((student) => <article key={student.enrollmentId} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{student.studentName ?? "Unnamed student"}</h3><p className="text-xs text-muted-foreground">{student.studentCode ?? "No student code"} · Seat {student.seatCode ?? "Unassigned"}</p></div><StatusBadge value={seatStatus(student)} /></div><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={attendance.isPending || student.attendanceStatus === "Present"} onClick={() => attendance.mutate({ action: "in", enrollmentId: student.enrollmentId })}>Present</Button><Button variant="outline" disabled={attendance.isPending || student.attendanceStatus === "NotCheckedIn"} onClick={() => attendance.mutate({ action: "undo", enrollmentId: student.enrollmentId })}>Undo check-in</Button>{student.attemptProgress === "Submitted" ? <Button variant="outline" disabled={attendance.isPending || student.attendanceStatus === "CheckedOut"} onClick={() => attendance.mutate({ action: "out", enrollmentId: student.enrollmentId })}>Check out</Button> : null}</div></article>)}
          {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">No students match this search.</p> : null}
        </ScrollRegion></CardContent></Card>
      </div>
      <footer className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-end justify-between gap-3 border-t border-border bg-background px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="pb-3 text-sm font-bold">{present}/{students.data?.totalCount ?? 0} students checked in</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80">
          {seatMap.data.scheduleStatus !== "Open" ? <div className="text-sm font-semibold"><span>Published exam paper</span><Select value={examPaperId} onValueChange={setExamPaperId}><SelectTrigger aria-label="Published exam paper" className="mt-1"><SelectValue placeholder={papers.isPending ? "Loading published papers…" : "Select the paper for this room"} /></SelectTrigger><SelectContent>{publishedPapers.map((paper) => <SelectItem key={paper.examPaperId} value={paper.examPaperId}>{paper.paperCode ?? "Paper"} · {paper.name ?? `Version ${paper.version}`}</SelectItem>)}</SelectContent></Select></div> : null}
          {seatMap.data.scheduleStatus !== "Open" && !papers.isPending && publishedPapers.length === 0 ? <p role="alert" className="text-sm text-destructive">No published paper with questions is available for this exam.</p> : null}
          <Button disabled={openSchedule.isPending || seatMap.data.scheduleStatus === "Open" || !examPaperId} onClick={() => openSchedule.mutate()}><UnlockKeyhole />{seatMap.data.scheduleStatus === "Open" ? "Exam opened" : openSchedule.isPending ? "Opening exam…" : "Open exam with selected paper"}</Button>
        </div>
      </footer>
    </div>
  );
}

import type { ExamStudent } from "@/api/exams";

export type ScheduleStatus = "Draft" | "Published" | "Open" | "Closed" | "Cancelled";

/** Where one student stands in the exam day, from arriving at the room to leaving it. */
export type StudentStage =
  | "notCheckedIn"
  | "waiting"
  | "ready"
  | "inProgress"
  | "submitted"
  | "checkedOut"
  | "absent";

export const stageLabels: Record<StudentStage, string> = {
  notCheckedIn: "Not checked in",
  waiting: "Waiting for the exam",
  ready: "Ready to start",
  inProgress: "Taking the exam",
  submitted: "Submitted",
  checkedOut: "Checked out",
  absent: "Absent",
};

export const stageOrder: StudentStage[] = ["notCheckedIn", "waiting", "ready", "inProgress", "submitted", "checkedOut", "absent"];

export function studentStage(student: ExamStudent, scheduleStatus: ScheduleStatus): StudentStage {
  if (student.attendanceStatus === "Absent") return "absent";
  if (student.attendanceStatus === "CheckedOut") return "checkedOut";
  if (student.attemptProgress === "Submitted") return "submitted";
  if (student.attemptProgress === "InProgress") return "inProgress";
  if (student.attendanceStatus === "Present") return scheduleStatus === "Open" ? "ready" : "waiting";
  return "notCheckedIn";
}

/** Check-in closes the moment the exam is opened: nobody can be checked in late. */
export const checkInLocked = (scheduleStatus: ScheduleStatus) => scheduleStatus === "Open" || scheduleStatus === "Closed";

export type StudentActions = {
  checkIn: boolean;
  undoCheckIn: boolean;
  markAbsent: boolean;
  undoAbsence: boolean;
  checkOut: boolean;
};

/** What the lecturer may do with one student right now. The Backend still has the last word. */
export function studentActions(student: ExamStudent, scheduleStatus: ScheduleStatus, endsAt: string, now: Date = new Date()): StudentActions {
  const locked = checkInLocked(scheduleStatus);
  const beforeEnd = now.getTime() < new Date(endsAt).getTime() && scheduleStatus !== "Closed" && scheduleStatus !== "Cancelled";
  const started = student.attemptProgress === "InProgress" || student.attemptProgress === "Submitted";
  return {
    checkIn: student.attendanceStatus === "NotCheckedIn" && !locked && scheduleStatus !== "Cancelled",
    undoCheckIn: student.attendanceStatus === "Present" && !locked && !started,
    markAbsent: student.attendanceStatus === "NotCheckedIn" && scheduleStatus === "Open" && beforeEnd,
    undoAbsence: student.attendanceStatus === "Absent" && beforeEnd,
    checkOut: student.attemptProgress === "Submitted" && student.attendanceStatus !== "CheckedOut",
  };
}

export function summarise(students: ExamStudent[], scheduleStatus: ScheduleStatus): Record<StudentStage, number> {
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<StudentStage, number>;
  for (const student of students) counts[studentStage(student, scheduleStatus)] += 1;
  return counts;
}

/** Who marked the student absent, in words. The Backend marks everyone left over when the exam ends. */
export function absenceNote(student: ExamStudent): string | null {
  if (student.attendanceStatus !== "Absent") return null;
  const when = student.absentAt ? ` at ${new Date(student.absentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
  return student.absenceRecordedAutomatically ? `Marked absent automatically when the exam ended${when}.` : `Marked absent by the lecturer${when}.`;
}

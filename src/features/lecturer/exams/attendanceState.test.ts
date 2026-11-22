import type { ExamStudent } from "@/api/exams";
import { absenceNote, checkInLocked, studentActions, studentStage, summarise } from "./attendanceState";

const student = (overrides: Partial<ExamStudent> = {}): ExamStudent => ({
  enrollmentId: "e1", studentId: "s1", studentCode: "SE1", studentName: "An", seatId: "a", seatCode: "A1",
  attendanceStatus: "NotCheckedIn", checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null,
  attemptProgress: "Unknown", attemptId: null, absentAt: null, absentBy: null, ...overrides,
});
const endsAt = new Date(2026, 10, 14, 10, 0).toISOString();
const during = new Date(2026, 10, 14, 9, 0);
const after = new Date(2026, 10, 14, 11, 0);

describe("studentStage", () => {
  it("follows the student from arrival to leaving", () => {
    expect(studentStage(student(), "Published")).toBe("notCheckedIn");
    expect(studentStage(student({ attendanceStatus: "Present" }), "Published")).toBe("waiting");
    expect(studentStage(student({ attendanceStatus: "Present" }), "Open")).toBe("ready");
    expect(studentStage(student({ attendanceStatus: "Present", attemptProgress: "InProgress" }), "Open")).toBe("inProgress");
    expect(studentStage(student({ attendanceStatus: "Present", attemptProgress: "Submitted" }), "Open")).toBe("submitted");
    expect(studentStage(student({ attendanceStatus: "CheckedOut", attemptProgress: "Submitted" }), "Open")).toBe("checkedOut");
    expect(studentStage(student({ attendanceStatus: "Absent" }), "Open")).toBe("absent");
  });
});

describe("check-in lock", () => {
  it("closes the moment the exam opens", () => {
    expect(checkInLocked("Published")).toBe(false);
    expect(checkInLocked("Open")).toBe(true);
    expect(checkInLocked("Closed")).toBe(true);
  });
});

describe("studentActions", () => {
  it("allows check-in only before the exam opens", () => {
    expect(studentActions(student(), "Published", endsAt, during).checkIn).toBe(true);
    expect(studentActions(student(), "Open", endsAt, during).checkIn).toBe(false);
  });

  it("allows marking absent only for a student who did not check in, after the exam opened", () => {
    expect(studentActions(student(), "Published", endsAt, during).markAbsent).toBe(false);
    expect(studentActions(student(), "Open", endsAt, during).markAbsent).toBe(true);
    expect(studentActions(student({ attendanceStatus: "Present" }), "Open", endsAt, during).markAbsent).toBe(false);
  });

  it("allows undoing an absence until the exam ends", () => {
    const absent = student({ attendanceStatus: "Absent" });
    expect(studentActions(absent, "Open", endsAt, during).undoAbsence).toBe(true);
    expect(studentActions(absent, "Open", endsAt, after).undoAbsence).toBe(false);
    expect(studentActions(absent, "Closed", endsAt, during).undoAbsence).toBe(false);
  });

  it("does not undo a check-in once the student started", () => {
    expect(studentActions(student({ attendanceStatus: "Present" }), "Published", endsAt, during).undoCheckIn).toBe(true);
    expect(studentActions(student({ attendanceStatus: "Present", attemptProgress: "InProgress" }), "Published", endsAt, during).undoCheckIn).toBe(false);
  });

  it("checks a student out only after they submitted", () => {
    expect(studentActions(student({ attendanceStatus: "Present" }), "Open", endsAt, during).checkOut).toBe(false);
    expect(studentActions(student({ attendanceStatus: "Present", attemptProgress: "Submitted" }), "Open", endsAt, during).checkOut).toBe(true);
    expect(studentActions(student({ attendanceStatus: "CheckedOut", attemptProgress: "Submitted" }), "Open", endsAt, during).checkOut).toBe(false);
  });
});

describe("summarise and absenceNote", () => {
  it("counts every student in exactly one stage", () => {
    const counts = summarise([student(), student({ attendanceStatus: "Present" }), student({ attendanceStatus: "Absent" })], "Published");
    expect(counts).toMatchObject({ notCheckedIn: 1, waiting: 1, absent: 1, ready: 0 });
  });

  it("says whether an absence was recorded by a lecturer or automatically", () => {
    expect(absenceNote(student())).toBeNull();
    expect(absenceNote(student({ attendanceStatus: "Absent", absenceRecordedAutomatically: false }))).toMatch(/by the lecturer/);
    expect(absenceNote(student({ attendanceStatus: "Absent", absenceRecordedAutomatically: true }))).toMatch(/automatically/);
  });
});

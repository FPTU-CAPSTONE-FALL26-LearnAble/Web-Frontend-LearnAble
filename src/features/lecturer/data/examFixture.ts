export interface ExamShift {
  id: string;
  subjectCode: string;
  subject: string;
  examCode: string;
  codeStatus: "scheduled" | "opening-soon" | "open" | "closed";
  assessment: string;
  date: string;
  time: string;
  duration: number;
  room: string;
  location: string;
  invigilators: string;
  students: number;
  week: "this" | "next";
}
export const examShifts: ExamShift[] = [
  {
    id: "swe201-final",
    subjectCode: "SWE201",
    subject: "Software Engineering",
    examCode: "SWE201-FE-FA26-01",
    codeStatus: "opening-soon",
    assessment: "Final Exam",
    date: "Today · Sep 15",
    time: "13:30–15:30",
    duration: 120,
    room: "Lab Alpha 302",
    location: "Floor 3 · Delta Building",
    invigilators: "Lecturer One + Hannah Lee",
    students: 35,
    week: "this",
  },
  {
    id: "prn211-midterm",
    subjectCode: "PRN211",
    subject: "C# & .NET Architecture",
    examCode: "PRN211-ME-FA26-02",
    codeStatus: "scheduled",
    assessment: "Midterm Exam",
    date: "Friday · Sep 18",
    time: "08:00–10:00",
    duration: 120,
    room: "Lab Beta 204",
    location: "Gamma Building",
    invigilators: "Lecturer One + Marcus Tran",
    students: 3,
    week: "this",
  },
  {
    id: "iot102-final",
    subjectCode: "IOT102",
    subject: "Internet of Things Fundamentals",
    examCode: "IOT102-FE-FA26-01",
    codeStatus: "scheduled",
    assessment: "Final Exam",
    date: "Tuesday · Sep 22",
    time: "10:15–12:15",
    duration: 120,
    room: "Lab IoT 105",
    location: "Beta Building",
    invigilators: "Lecturer One + Daniel Pham",
    students: 4,
    week: "next",
  },
];
export type SeatStatus =
  | "Present"
  | "Not checked in"
  | "Started"
  | "Submitted"
  | "Incident"
  | "Cheating";
export interface ExamSeat {
  number: number;
  name: string;
  studentId: string;
  citizenId: string;
  seatLocation: string;
  status: SeatStatus;
  checkIn: string;
}
const names = [
  "Nguyễn Minh Long",
  "Trần Thu Trang",
  "Lê Minh Tuấn",
  "Phạm Ngọc Yến",
  "Vũ Quang Huy",
  "Hoàng Đức Hào",
  "Đỗ Khánh Linh",
  "Bùi Anh Dũng",
  "Nguyễn Ngọc Bảo",
  "Trần Minh Nam",
  "Lê Gia Bảo",
  "Phạm Hoàng Phong",
  "Đặng Thanh Hoa",
  "Võ Minh Khang",
  "Hồ Thảo Vân",
  "Nguyễn Quốc Đạt",
  "Trần Đức Trung",
  "Lê Anh Toàn",
  "Phạm Thu Hiền",
  "Vũ Minh Khôi",
  "Đỗ Thanh Tùng",
  "Bùi Gia Khiêm",
  "Hoàng Mai Phương",
  "Nguyễn Anh Tuấn",
  "Trần Ngọc Mai",
  "Lê Quốc Duy",
  "Phạm Minh Quang",
  "Vũ Thanh Thảo",
  "Đỗ Hải Long",
  "Bùi Ngọc Anh",
  "Hoàng Đức An",
  "Nguyễn Gia Hưng",
  "Trần Minh Trí",
  "Lê Quốc Bảo",
  "Phạm Ngọc Châu",
];
/** Synthetic seats only: never write attendance or infer real identity verification. */
export function seatsForExam(exam: ExamShift): ExamSeat[] {
  return names
    .slice(0, exam.students)
    .map((name, index) => ({
      number: index + 1,
      name,
      studentId: `HE${180100 + index}`,
      citizenId: `001206${String(100000 + index).padStart(6, "0")}`,
      seatLocation: `${String.fromCharCode(65 + Math.floor(index / 4))}${(index % 4) + 1}`,
      status: [5, 19, 28].includes(index + 1)
        ? "Not checked in"
        : [12, 30].includes(index + 1)
          ? "Incident"
          : index + 1 === 25
            ? "Cheating"
            : index >= 31
              ? "Submitted"
              : index >= 5
                ? "Started"
                : "Present",
      checkIn: [5, 19, 28].includes(index + 1)
        ? "Not checked in"
        : `13:${String((index % 10) + 1).padStart(2, "0")}`,
    }));
}

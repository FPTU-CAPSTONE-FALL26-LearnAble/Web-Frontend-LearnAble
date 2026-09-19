export type ExamPaper = {
  id: string;
  code: string;
  title: string;
  subject: string;
  type: "Final Exam" | "Practical Exam" | "Midterm Exam";
  semester: string;
  questions: number;
  duration: number;
  status: "Ready" | "Review" | "Draft";
};

export const examPapers: ExamPaper[] = [
  {
    id: "swe201",
    code: "SWE201_FE_FA26_01",
    title: "Software Engineering Foundations",
    subject: "SWE201",
    type: "Final Exam",
    semester: "Fall 2026",
    questions: 40,
    duration: 90,
    status: "Ready",
  },
  {
    id: "ia201",
    code: "IA201_FE_FA26_02",
    title: "Information Security Fundamentals",
    subject: "IA201",
    type: "Final Exam",
    semester: "Fall 2026",
    questions: 45,
    duration: 90,
    status: "Review",
  },
  {
    id: "prf192",
    code: "PRF192_PE_FA26_01",
    title: "C Programming Practical Test",
    subject: "PRF192",
    type: "Practical Exam",
    semester: "Fall 2026",
    questions: 4,
    duration: 120,
    status: "Ready",
  },
  {
    id: "prn211",
    code: "PRN211_ME_SU26_01",
    title: "C# and .NET Application Development",
    subject: "PRN211",
    type: "Midterm Exam",
    semester: "Summer 2026",
    questions: 35,
    duration: 75,
    status: "Draft",
  },
  {
    id: "mas291",
    code: "MAS291_FE_SP26_03",
    title: "Probability and Statistics",
    subject: "MAS291",
    type: "Final Exam",
    semester: "Spring 2026",
    questions: 40,
    duration: 90,
    status: "Review",
  },
  {
    id: "iot102",
    code: "IOT102_PE_SP26_02",
    title: "IoT and Embedded Systems",
    subject: "IOT102",
    type: "Practical Exam",
    semester: "Spring 2026",
    questions: 6,
    duration: 120,
    status: "Draft",
  },
];

export const rooms = [
  {
    id: "alpha-302",
    name: "Lab Alpha 302",
    subject: "SWE201",
    capacity: 35,
    online: 33,
    submitted: 12,
    state: "Active",
    invigilators: "Nguyen Van A · Le Hoang Yen",
  },
  {
    id: "alpha-304",
    name: "Lab Alpha 304",
    subject: "PRF192",
    capacity: 40,
    online: 40,
    submitted: 18,
    state: "Active",
    invigilators: "Dang Quoc Huy · Phan Dinh Nam",
  },
  {
    id: "beta-205",
    name: "Lab Beta 205",
    subject: "Standby",
    capacity: 35,
    online: 35,
    submitted: 0,
    state: "Standby",
    invigilators: "Vu Hai Dang",
  },
];

export const candidates = Array.from({ length: 35 }, (_, index) => ({
  id: `HE17${String(1000 + index)}`,
  name: [
    "Nguyen Duc Anh",
    "Tran Minh Chau",
    "Le Hoang Nam",
    "Pham Thu Ha",
    "Do Quang Huy",
  ][index % 5],
  seat: index + 1,
  progress: Math.min(40, 18 + (index % 22)),
  state: index === 4 ? "Disconnected" : index < 2 ? "Submitted" : "Working",
}));

export const questions = Array.from({ length: 18 }, (_, index) => ({
  id: `Q-${String(index + 1).padStart(3, "0")}`,
  title: [
    "Software process models",
    "Cyclomatic complexity",
    "Requirements traceability",
    "SOLID principles",
  ][index % 4],
  topic: ["Foundations", "Testing", "Requirements", "Design"][index % 4],
  bloom: ["Remember", "Understand", "Apply"][index % 3],
  difficulty: ["Easy", "Medium", "Hard"][index % 3],
  selected: index < 5,
}));

export const incidents = [
  {
    id: "INC-105",
    severity: "Critical",
    room: "Lab Alpha 302",
    station: "Kiosk 05",
    detail: "LAN connection lost for 7 minutes",
    time: "09:42",
  },
  {
    id: "INC-106",
    severity: "Warning",
    room: "Lab Beta 205",
    station: "Kiosk 19",
    detail: "Physical keyboard Enter key is stuck",
    time: "09:50",
  },
];

export const examinerNavigation = [
  { label: "Dashboard", path: "/examiner/dashboard" },
  { label: "Exam Paper Management", path: "/examiner/exams" },
  { label: "Exam Schedule", path: "/examiner/schedule" },
  { label: "Live Exam Monitoring", path: "/examiner/monitoring" },
];

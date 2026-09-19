export type WorkFilter = "all" | "urgent" | "review";

export interface LecturerWorkItem {
  id: string;
  category: string;
  title: string;
  subjectCode: string;
  issue: string;
  priority: "Urgent" | "High" | "Medium";
  impact: string;
  action: string;
  review: boolean;
}

export interface LecturerDashboardData {
  campus: string;
  semester: string;
  todayExam: {
    subjectCode: string;
    subject: string;
    assessment: string;
    time: string;
    attendanceTime: string;
    countdownMinutes: number;
    progress: number;
    room: string;
    location: string;
    examCode: string;
    version: string;
  };
  upcoming: Array<{
    date: string;
    time: string;
    subjectCode: string;
    subject: string;
    room: string;
  }>;
  work: LecturerWorkItem[];
  totals: {
    all: number;
    urgent: number;
    review: number;
    completedToday: number;
  };
}

export const lecturerDashboardFixture: LecturerDashboardData = {
  campus: "Hoa Lac (Hanoi)",
  semester: "Fall 2026",
  todayExam: {
    subjectCode: "SWE201",
    subject: "Software Engineering",
    assessment: "Final Exam · Fall 2026",
    time: "13:30–15:30",
    attendanceTime: "13:10",
    countdownMinutes: 20,
    progress: 68,
    room: "Lab Alpha 302",
    location: "Floor 3 · Delta Building",
    examCode: "SWE201-FE-FA26-01",
    version: "1.0",
  },
  upcoming: [
    {
      date: "Sep 15, 2026",
      time: "13:30–15:30",
      subjectCode: "SWE201",
      subject: "Software Engineering",
      room: "Lab Alpha 302",
    },
    {
      date: "Sep 18, 2026",
      time: "08:00–10:00",
      subjectCode: "PRN211",
      subject: "C# & .NET Architecture",
      room: "Lab Beta 204",
    },
  ],
  work: [
    {
      id: "Q-SWE201-014",
      category: "Missing answer key",
      title: "Question 14: Microservices Broker Architecture diagram",
      subjectCode: "SWE201",
      issue: "A correct answer must be selected",
      priority: "Urgent",
      impact: "Blocks exam publication",
      action: "Add answer key",
      review: true,
    },
    {
      id: "Q-SWE201-028",
      category: "MathML syntax",
      title: "Boolean logic equivalence question",
      subjectCode: "SWE201",
      issue: "LaTeX/MathML syntax error",
      priority: "High",
      impact: "Question review required",
      action: "Review MathML",
      review: true,
    },
    {
      id: "Q-PRN211-042",
      category: "Data mismatch",
      title: "Garbage collection benchmark chart",
      subjectCode: "PRN211",
      issue: "Chart values do not match the answer key",
      priority: "Urgent",
      impact: "Blocks exam publication",
      action: "Review values",
      review: true,
    },
    {
      id: "DOC-SWE201-03",
      category: "PDF processing",
      title: "IEEE 830 reference SRS.pdf",
      subjectCode: "SWE201",
      issue: "OCR processing is 65% complete",
      priority: "Medium",
      impact: "Learning material processing",
      action: "View OCR progress",
      review: false,
    },
  ],
  totals: { all: 4, urgent: 2, review: 3, completedToday: 3 },
};

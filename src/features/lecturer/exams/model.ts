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

import type { QuestionType } from "./model";
export interface BankQuestion {
  id: string;
  content: string;
  type: QuestionType;
  status: string;
  course: string;
  topic: string;
  exams: number;
  a11y: string;
  points: number;
}
export const courses = ["SWE201", "PRN212", "SWP391"];
export const topics = [
  "Microservices Architecture",
  "Clean Code & Refactoring",
  "Scrum & Agile",
];
export const bankQuestions: BankQuestion[] = [
  {
    id: "SWE-MCQ-8492",
    content:
      "Which mechanism prevents cascading failures between microservices?",
    type: "single",
    status: "Active",
    course: "SWE201",
    topic: topics[0],
    exams: 2,
    a11y: "AAA",
    points: 0.5,
  },
  {
    id: "SWE-CODE-2201",
    content:
      "Implement a retry policy with exponential backoff for a REST client in C#.",
    type: "code",
    status: "Active",
    course: "PRN212",
    topic: topics[1],
    exams: 1,
    a11y: "AA",
    points: 2,
  },
  {
    id: "SWE-MATH-0912",
    content:
      "Calculate system reliability using the given failure probability and mean time between failures.",
    type: "math",
    status: "Needs review",
    course: "SWE201",
    topic: topics[0],
    exams: 0,
    a11y: "Missing",
    points: 1,
  },
  {
    id: "SWE-ESSAY-0104",
    content:
      "Discuss consistency and availability trade-offs for an e-commerce platform during Black Friday.",
    type: "essay",
    status: "Active",
    course: "SWP391",
    topic: topics[2],
    exams: 1,
    a11y: "AAA",
    points: 1.5,
  },
  {
    id: "SWE-DIAG-7719",
    content:
      "Identify the CPU bottleneck in the system diagram and describe the corresponding audio pattern.",
    type: "diagram",
    status: "Active",
    course: "SWE201",
    topic: topics[0],
    exams: 1,
    a11y: "AAA",
    points: 1,
  },
  {
    id: "SWE-MCQ-6310",
    content: "Which responsibilities belong to the Product Owner in Scrum?",
    type: "multiple",
    status: "Draft",
    course: "SWE201",
    topic: topics[2],
    exams: 0,
    a11y: "AA",
    points: 1,
  },
  {
    id: "SWE-MCQ-6401",
    content:
      "Select the principles that improve maintainability in object-oriented software.",
    type: "multiple",
    status: "Active",
    course: "PRN212",
    topic: topics[1],
    exams: 2,
    a11y: "AAA",
    points: 1,
  },
  {
    id: "SWE-ESSAY-0105",
    content:
      "Explain how a sprint retrospective supports continuous improvement.",
    type: "essay",
    status: "Draft",
    course: "SWP391",
    topic: topics[2],
    exams: 0,
    a11y: "Missing",
    points: 2,
  },
  {
    id: "SWE-CODE-2202",
    content:
      "Refactor a long method into testable units with clear responsibilities.",
    type: "code",
    status: "Needs review",
    course: "PRN212",
    topic: topics[1],
    exams: 0,
    a11y: "AA",
    points: 2,
  },
  {
    id: "SWE-MCQ-8493",
    content: "What is the primary responsibility of an API gateway?",
    type: "single",
    status: "Active",
    course: "SWE201",
    topic: topics[0],
    exams: 3,
    a11y: "AAA",
    points: 1,
  },
  {
    id: "SWE-MATH-0913",
    content:
      "Express the availability of two independent services as a probability formula.",
    type: "math",
    status: "Active",
    course: "SWE201",
    topic: topics[0],
    exams: 1,
    a11y: "AA",
    points: 1,
  },
  {
    id: "SWE-DIAG-7720",
    content:
      "Describe the request flow through this service architecture diagram.",
    type: "diagram",
    status: "Needs review",
    course: "SWP391",
    topic: topics[0],
    exams: 0,
    a11y: "Missing",
    points: 1.5,
  },
];

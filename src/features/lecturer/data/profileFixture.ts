export interface LecturerProfileData {
  lecturerCode: string;
  title: string;
  department: string;
  faculty: string;
  campus: string;
  email: string;
  phone: string;
  office: string;
  consultationHours: string;
  employmentStatus: string;
  joinedDate: string;
  expertise: string[];
  courses: Array<{
    code: string;
    name: string;
    groups: string;
    students: number;
    schedule: string;
  }>;
  activity: Array<{
    title: string;
    detail: string;
    time: string;
    type: "question" | "material" | "exam";
  }>;
}

export const lecturerProfileFixture: LecturerProfileData = {
  lecturerCode: "LEC0001",
  title: "Senior Lecturer",
  department: "Software Engineering",
  faculty: "Information Technology",
  campus: "Hoa Lac Campus, Hanoi",
  email: "lecturer.one@fpt.edu.vn",
  phone: "+84 24 7300 5588",
  office: "Delta Building · Room 304",
  consultationHours: "Tuesday & Thursday · 14:00–16:00",
  employmentStatus: "Active",
  joinedDate: "August 2021",
  expertise: [
    "Software Architecture",
    "Web Engineering",
    "Database Systems",
    "Assessment Design",
  ],
  courses: [
    {
      code: "SWE201",
      name: "Software Engineering",
      groups: "SE1848 · SE1850",
      students: 72,
      schedule: "Mon & Wed · 08:30–10:00",
    },
    {
      code: "PRN211",
      name: "C# & .NET Architecture",
      groups: "SE1832",
      students: 35,
      schedule: "Tue & Thu · 10:15–11:45",
    },
  ],
  activity: [
    {
      title: "Updated the SWE201 final exam bank",
      detail: "12 questions reviewed",
      time: "Today · 09:42",
      type: "question",
    },
    {
      title: "Uploaded IEEE 830 reference material",
      detail: "SWE201 learning material",
      time: "Yesterday · 16:18",
      type: "material",
    },
    {
      title: "Completed PRN211 invigilation",
      detail: "Lab Beta 204 · 35 candidates",
      time: "Sep 12 · 10:05",
      type: "exam",
    },
  ],
};

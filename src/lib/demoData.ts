const demoDataKey = "learnable:staff-demo-data";

export function isDemoDataEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(demoDataKey) === "true";
}

export function setDemoDataEnabled(enabled: boolean) {
  window.localStorage.setItem(demoDataKey, String(enabled));
}

const now = new Date();
const iso = (hour: number, dayOffset = 0) => {
  const value = new Date(now);
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};

const subject = { subjectId: "demo-subject-swe201", universityId: "demo-university", departmentId: "demo-department", subjectCode: "SWE201", subjectNameEn: "Software Engineering", isActive: true };
const topic = { topicId: "demo-topic-architecture", subjectId: subject.subjectId, topicCode: "ARCH", topicName: "Software Architecture", isActive: true };
const examType = { examTypeId: "demo-exam-type-final", code: "FINAL", name: "Final Exam", description: "End-of-semester assessment", isActive: true };
const subjects = [
  subject,
  { ...subject, subjectId: "demo-subject-prn211", subjectCode: "PRN211", subjectNameEn: "Basic Cross-Platform Application Programming With .NET" },
  { ...subject, subjectId: "demo-subject-mad101", subjectCode: "MAD101", subjectNameEn: "Discrete Mathematics" },
  { ...subject, subjectId: "demo-subject-mkt101", subjectCode: "MKT101", subjectNameEn: "Marketing Principles" },
];
const topics = [
  topic,
  { ...topic, topicId: "demo-topic-testing", topicCode: "TEST", topicName: "Software Testing" },
  { ...topic, topicId: "demo-topic-dotnet", subjectId: subjects[1].subjectId, topicCode: "DOTNET", topicName: ".NET Architecture" },
  { ...topic, topicId: "demo-topic-logic", subjectId: subjects[2].subjectId, topicCode: "LOGIC", topicName: "Propositional Logic" },
  { ...topic, topicId: "demo-topic-marketing", subjectId: subjects[3].subjectId, topicCode: "INTRO", topicName: "Introduction to Marketing Principles" },
];
const examTypes = [
  examType,
  { ...examType, examTypeId: "demo-exam-type-midterm", code: "MIDTERM", name: "Midterm Exam", description: "Mid-semester assessment" },
  { ...examType, examTypeId: "demo-exam-type-practice", code: "PRACTICE", name: "Practice", description: "Formative practice assessment" },
];
const question = {
  questionId: "11111111-1111-1111-1111-111111000001", examTypeId: examType.examTypeId,
  examTypeCode: examType.code, examTypeName: examType.name, topicId: topic.topicId,
  createdBy: "demo-lecturer-1", creatorRole: "Lecturer", content: "Which architectural style organizes services around independently deployable business capabilities?",
  questionType: "Single", difficulty: "Medium", audioHintText: null, defaultScore: 1,
  sourceType: "Manual", status: "Active", createdAt: iso(8, -5), updatedAt: iso(9, -1),
  options: [
    { optionId: "demo-option-1", questionId: "11111111-1111-1111-1111-111111000001", content: "Microservices architecture", isCorrect: true, displayOrder: 1 },
    { optionId: "demo-option-2", questionId: "11111111-1111-1111-1111-111111000001", content: "Monolithic architecture", isCorrect: false, displayOrder: 2 },
  ],
};
const questionTwo = { ...question, questionId: "11111111-1111-1111-1111-111111000002", content: "Which practice helps teams integrate code changes frequently?", difficulty: "Easy", status: "Draft", options: [] };
const questions = [
  question,
  questionTwo,
  { ...question, questionId: "11111111-1111-1111-1111-111111000003", topicId: topics[1].topicId, content: "Which testing level verifies interactions between integrated modules?", difficulty: "Medium" },
  { ...question, questionId: "11111111-1111-1111-1111-111111000004", topicId: topics[2].topicId, content: "Which .NET component translates intermediate language into native code?", difficulty: "Hard" },
  { ...question, questionId: "11111111-1111-1111-1111-111111000005", topicId: topics[3].topicId, content: "Which logical connective is true only when both propositions are true?", difficulty: "Easy" },
  { ...question, questionId: "11111111-1111-1111-1111-111111000006", topicId: topics[4].topicId, content: "Which metric measures the return on a digital marketing campaign?", difficulty: "Medium" },
  { ...question, questionId: "11111111-1111-1111-1111-111111000007", examTypeId: examTypes[2].examTypeId, examTypeCode: "PRACTICE", examTypeName: "Practice", content: "Choose the best description of continuous delivery.", difficulty: "Easy" },
  { ...questionTwo, questionId: "11111111-1111-1111-1111-111111000008", examTypeId: examTypes[2].examTypeId, examTypeCode: "PRACTICE", examTypeName: "Practice", content: "Explain two benefits of automated regression testing.", questionType: "Essay", difficulty: "Medium" },
  { ...questionTwo, questionId: "11111111-1111-1111-1111-111111000009", content: "Identify and explain the design pattern represented by the supplied diagram.", questionType: "Essay", difficulty: "Hard" },
  { ...question, questionId: "11111111-1111-1111-1111-111111000010", content: "What is the primary responsibility of an API gateway?", status: "Archived", difficulty: "Medium" },
];
const examSubject = {
  examSubjectId: "demo-exam-subject", subjectId: subject.subjectId, examTypeId: examType.examTypeId,
  semesterId: "demo-semester", createdBy: "demo-examiner", name: "SWE201 Final Examination",
  instructions: "Read each question carefully before submitting.", durationMinutes: 90, passScore: 5,
  shuffleQuestions: true, shuffleOptions: true, scoringPolicy: "AllOrNothing", cameraRequired: true,
  cameraUnavailablePolicy: "Block", recordingRetentionDays: 30, maxAttempts: 1, status: "Ready",
  createdAt: iso(8, -10), updatedAt: iso(8, -1), eTag: "demo-subject-etag",
};
const paper = {
  examPaperId: "demo-paper", examSubjectId: examSubject.examSubjectId, paperCode: "SWE201-FE-DEMO-01",
  name: "SWE201 Final Paper A", version: 1, status: "Published", publishedAt: iso(10, -1),
  createdAt: iso(8, -3), totalScore: 10, eTag: "demo-paper-etag",
  questions: [{ questionId: question.questionId, content: question.content, questionType: "Single", difficulty: "Medium", maxScore: 1, displayOrder: 1 }],
};
const examSubjects = [
  examSubject,
  { ...examSubject, examSubjectId: "demo-exam-subject-prn211", subjectId: subjects[1].subjectId, name: "PRN211 Midterm Examination", status: "Draft", durationMinutes: 60 },
  { ...examSubject, examSubjectId: "demo-exam-subject-mad101", subjectId: subjects[2].subjectId, name: "MAD101 Final Examination", status: "Ready", durationMinutes: 120 },
];
const papers = [
  paper,
  { ...paper, examPaperId: "demo-paper-prn211", examSubjectId: examSubjects[1].examSubjectId, paperCode: "PRN211-ME-DEMO-01", name: "PRN211 Midterm Paper A", status: "Draft", publishedAt: null },
  { ...paper, examPaperId: "demo-paper-mad101", examSubjectId: examSubjects[2].examSubjectId, paperCode: "MAD101-FE-DEMO-01", name: "MAD101 Final Paper A" },
];
const room = { examRoomId: "demo-room", universityId: "demo-university", roomCode: "A302", name: "Lab Alpha 302", building: "Delta Building", floor: 3, capacity: 35, isActive: true };
const shift = { examShiftId: "demo-shift", examRoomId: room.examRoomId, name: "Morning Shift", startsAt: iso(13, 1), endsAt: iso(15, 1), status: "Planned", room };
const schedule = { examScheduleId: "demo-schedule", examSubjectId: examSubject.examSubjectId, examName: examSubject.name, examShiftId: shift.examShiftId, examRoomId: room.examRoomId, roomName: room.name, startsAt: shift.startsAt, endsAt: shift.endsAt, entryOpensAt: iso(13, 1), entryClosesAt: iso(14, 1), openedAt: null, openedBy: null, closedAt: null, status: "Published" };
const rooms = [
  room,
  { ...room, examRoomId: "demo-room-b204", roomCode: "B204", name: "Lab Beta 204", building: "Gamma Building", floor: 2, capacity: 30 },
  { ...room, examRoomId: "demo-room-c305", roomCode: "C305", name: "Lab Gamma 305", building: "Gamma Building", floor: 3, capacity: 40 },
];
const shifts = [
  shift,
  { ...shift, examShiftId: "demo-shift-afternoon", examRoomId: rooms[1].examRoomId, name: "Afternoon Shift", startsAt: iso(16, 1), endsAt: iso(18, 1), room: rooms[1] },
  { ...shift, examShiftId: "demo-shift-next-week", examRoomId: rooms[2].examRoomId, name: "Morning Shift", startsAt: iso(8, 5), endsAt: iso(10, 5), room: rooms[2] },
];
const schedules = [
  schedule,
  { ...schedule, examScheduleId: "demo-schedule-afternoon", examSubjectId: examSubjects[2].examSubjectId, examName: examSubjects[2].name, examShiftId: shifts[1].examShiftId, examRoomId: rooms[1].examRoomId, roomName: rooms[1].name, startsAt: shifts[1].startsAt, endsAt: shifts[1].endsAt, entryOpensAt: iso(16, 1), entryClosesAt: iso(17, 1) },
  { ...schedule, examScheduleId: "demo-schedule-next-week", examSubjectId: examSubjects[1].examSubjectId, examName: examSubjects[1].name, examShiftId: shifts[2].examShiftId, examRoomId: rooms[2].examRoomId, roomName: rooms[2].name, startsAt: shifts[2].startsAt, endsAt: shifts[2].endsAt, entryOpensAt: iso(8, 5), entryClosesAt: iso(9, 5), status: "Draft" },
];
const studentNames = ["Nguyen Minh Long", "Tran Thu Trang", "Le Minh Tuan", "Pham Ngoc Yen", "Vu Quang Huy", "Hoang Duc Hao", "Do Khanh Linh", "Bui Anh Dung"];
const students = Array.from({ length: 28 }, (_, index) => ({
  enrollmentId: `demo-enrollment-${index + 1}`, studentId: `demo-student-${index + 1}`,
  studentCode: `HE18${String(index + 100).padStart(4, "0")}`, studentName: `${studentNames[index % studentNames.length]}${index >= studentNames.length ? ` ${index + 1}` : ""}`,
  seatId: `demo-seat-${index + 1}`, seatCode: `${String.fromCharCode(65 + Math.floor(index / 4))}${(index % 4) + 1}`,
  attendanceStatus: index < 20 ? "Present" : "NotCheckedIn", checkedInAt: index < 20 ? iso(13, 1) : null,
  checkedInBy: index < 20 ? "demo-lecturer-1" : null, checkedOutAt: null, checkedOutBy: null,
  attemptProgress: index < 5 ? "Submitted" : index < 18 ? "InProgress" : "NotStarted", attemptId: index < 18 ? `demo-attempt-${index + 1}` : null,
}));
const materials = [
  { materialId: "demo-material-1", topicId: topic.topicId, uploadedBy: "demo-lecturer-1", title: "Software Architecture Foundations", description: "Accessible lecture slides and reading notes.", materialType: "PDF", fileUrl: null, fileName: "architecture-foundations.pdf", fileSizeBytes: 1843200, pageCount: 32, ocrStatus: "Completed", isTtsReady: true, hasManagedFile: true, indexingStatus: "Completed", processingError: null, status: "Published", uploadedAt: iso(9, -2) },
  { materialId: "demo-material-2", topicId: topics[1].topicId, uploadedBy: "demo-lecturer-1", title: "Testing Strategy Workshop", description: "Workshop deck with accessible speaker notes.", materialType: "PPTX", fileUrl: null, fileName: "testing-strategy.pptx", fileSizeBytes: 2350000, pageCount: 24, ocrStatus: "Completed", isTtsReady: true, hasManagedFile: true, indexingStatus: "Completed", processingError: null, status: "Published", uploadedAt: iso(10, -4) },
  { materialId: "demo-material-3", topicId: topics[2].topicId, uploadedBy: "demo-lecturer-1", title: ".NET Architecture Notes", description: "Draft handout for the next class.", materialType: "DOCX", fileUrl: null, fileName: "dotnet-architecture.docx", fileSizeBytes: 680000, pageCount: 12, ocrStatus: "Completed", isTtsReady: false, hasManagedFile: true, indexingStatus: "Pending", processingError: null, status: "Draft", uploadedAt: iso(8, -1) },
  { materialId: "demo-material-4", topicId: topics[3].topicId, uploadedBy: "demo-lecturer-1", title: "Logic Revision Audio", description: "Audio revision for propositional logic.", materialType: "MP3", fileUrl: null, fileName: "logic-revision.mp3", fileSizeBytes: 4200000, pageCount: null, ocrStatus: "NotRequired", isTtsReady: true, hasManagedFile: true, indexingStatus: "Completed", processingError: null, status: "Published", uploadedAt: iso(11, -7) },
];

const page = <T>(items: T[]) => ({ items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
const ok = (data: unknown, message = "Demo data loaded") => ({ success: true, message, data, errors: null });

/** Returns an API-shaped fixture, or undefined when the path should use the real Backend. */
export function getDemoApiResponse(path: string, init?: RequestInit & { json?: unknown }) {
  if (!isDemoDataEnabled()) return undefined;
  const url = new URL(path, "https://demo.learnable.local");
  const route = url.pathname.toLowerCase();
  const method = (init?.method ?? "GET").toUpperCase();

  // Authentication must always remain connected to the real Backend. This also
  // lets users sign out and switch roles while demo mode is enabled.
  if (route.startsWith("/auth")) return undefined;

  if (route === "/subjects") return ok(page(subjects));
  if (route === "/topics") return ok(page(topics));
  if (route === "/semesters") return ok(page([{ semesterId: "demo-semester", universityId: "demo-university", semesterCode: "SP27", semesterName: "Spring 2027", academicYear: "2026-2027", startDate: iso(0, -30), endDate: iso(0, 120), status: "Ongoing" }]));
  if (route === "/examtypes") return ok(examTypes);
  if (route === "/questions" && method === "GET") return ok(page(questions));
  if (route === "/questions" && method === "POST") return ok({ ...question, ...(init?.json as object), questionId: crypto.randomUUID(), status: "Draft", createdAt: new Date().toISOString(), options: [] }, "Question created");
  if (/^\/questions\/[^/]+$/.test(route) && method === "GET") return ok(question);
  if (route.includes("/audio") && method === "PUT") return ok({ audioId: crypto.randomUUID(), originalFileName: "demo-audio.mp3", contentType: "audio/mpeg", sizeBytes: 24576, uploadedAt: new Date().toISOString() });
  if (route.includes("/audio") && method === "GET") return ok({ audio: { audioId: "demo-audio", originalFileName: "demo-audio.mp3", contentType: "audio/mpeg", sizeBytes: 24576, uploadedAt: iso(9, -1) }, url: null, expiresAt: iso(9, 1) });
  if (route.startsWith("/questionoptions") && method === "POST") return ok({ optionId: crypto.randomUUID(), ...(init?.json as object) });
  if (route === "/learningmaterials" && method === "GET") return ok(page(materials));
  if (route === "/learningmaterials" && method === "POST") return ok({ materialId: crypto.randomUUID(), topicId: topic.topicId, uploadedBy: "demo-lecturer-1", title: "Demo learning material", description: null, materialType: "PDF", fileUrl: null, fileName: "demo.pdf", fileSizeBytes: 1000, pageCount: 1, ocrStatus: "Pending", isTtsReady: false, hasManagedFile: true, indexingStatus: "Pending", processingError: null, status: "Draft", uploadedAt: new Date().toISOString() });
  if (route === "/examsubjects" && method === "GET") return ok(page(examSubjects));
  if (route === "/examsubjects" && method === "POST") return ok({ ...examSubject, ...(init?.json as object), examSubjectId: "demo-exam-subject-new", status: "Draft" });
  if (/^\/examsubjects\/[^/]+\/papers$/.test(route) && method === "GET") return ok(papers);
  if (/^\/examsubjects\/[^/]+\/papers$/.test(route) && method === "POST") return ok({ ...paper, ...(init?.json as object), examPaperId: "demo-paper-new", status: "Draft", questions: [], totalScore: 0 });
  if (/^\/exampapers\/[^/]+\/available-questions$/.test(route)) return ok(page([{ questionId: question.questionId, content: question.content, questionType: question.questionType, difficulty: question.difficulty, defaultScore: question.defaultScore, eligible: true, reasons: [], examTypeId: question.examTypeId }, { questionId: questionTwo.questionId, content: questionTwo.content, questionType: questionTwo.questionType, difficulty: questionTwo.difficulty, defaultScore: questionTwo.defaultScore, eligible: false, reasons: ["Question needs audio.", "Every option needs audio."], examTypeId: questionTwo.examTypeId }]));
  if (/^\/exampapers\/[^/]+\/preview$/.test(route)) return ok({ examPaperId: paper.examPaperId, version: 1, durationMinutes: 90, totalScore: 10, instructions: examSubject.instructions, questions: paper.questions, message: "Demo preview" });
  if (/^\/exampapers\/[^/]+\/questions$/.test(route)) return ok({ ...paper, status: "Draft", questions: paper.questions, totalScore: 1 });
  if (/^\/exampapers\/[^/]+/.test(route)) return ok(paper);
  if (route === "/examrooms") return ok(page(rooms));
  if (route === "/examshifts" && method === "GET") return ok(page(shifts));
  if (route === "/examshifts" && method === "POST") return ok({ ...shift, ...(init?.json as object) });
  if (/^\/examshifts\/[^/]+/.test(route)) return ok(shift);
  if (route === "/examschedules/check-conflicts") return ok([]);
  if (route === "/examschedules" && method === "GET") return ok(page(schedules));
  if (route === "/examschedules" && method === "POST") return ok({ ...schedule, ...(init?.json as object), status: "Draft" });
  if (/^\/examschedules\/[^/]+\/validation$/.test(route)) return ok({ isValid: true, errors: [] });
  if (/^\/examschedules\/[^/]+\/enrollments$/.test(route)) return ok(students.map((student) => ({ enrollmentId: student.enrollmentId, examScheduleId: schedule.examScheduleId, studentId: student.studentId, studentName: student.studentName, extraTimeMinutes: 0, accommodationNotes: null, registeredAt: iso(8, -1), status: "Registered" })));
  if (/^\/examschedules\/[^/]+\/invigilators$/.test(route)) return ok([{ assignmentId: "demo-assignment", examScheduleId: schedule.examScheduleId, lecturerId: "demo-lecturer-1", lecturerName: "Lecturer One", assignmentRole: "Chief", assignedAt: iso(8, -1), status: "Assigned" }]);
  if (/^\/examschedules\/[^/]+\/seating/.test(route)) return ok(students.map((student, index) => ({ studentExamSheetId: `demo-sheet-${index}`, enrollmentId: student.enrollmentId, studentId: student.studentId, seatId: student.seatId, seatCode: student.seatCode, rowNumber: Math.floor(index / 4) + 1, columnNumber: (index % 4) + 1, attendanceStatus: student.attendanceStatus })));
  if (/^\/examschedules\/[^/]+/.test(route)) return ok(schedule);
  if (route === "/me/exam-schedules") return ok(page(schedules.map((item, index) => ({ schedule: item, seatCode: null, invigilatorRole: index === 0 ? "Chief" : "Assistant" }))));
  if (/^\/lecturer\/exam-schedules\/[^/]+\/students$/.test(route)) return ok(page(students));
  if (/^\/lecturer\/exam-schedules\/[^/]+\/seat-map$/.test(route)) return ok({ examScheduleId: schedule.examScheduleId, examShiftId: shift.examShiftId, examRoomId: room.examRoomId, roomName: room.name, scheduleStatus: "Published", startsAt: schedule.startsAt, endsAt: schedule.endsAt, seats: students.map((student, index) => ({ seatId: student.seatId, seatCode: student.seatCode, rowNumber: Math.floor(index / 4) + 1, columnNumber: (index % 4) + 1, isAvailable: true, hasComputer: true, hasCamera: true, student })) });
  if (/^\/lecturer\/exam-schedules\/[^/]+\/enrollments\/[^/]+\/check-(in|out)$/.test(route)) return ok({ ...students[0], attendanceStatus: method === "DELETE" ? "NotCheckedIn" : method === "PUT" ? "Present" : students[0].attendanceStatus, checkedInAt: method === "DELETE" ? null : new Date().toISOString() });
  if (/^\/lecturer\/exam-schedules\/[^/]+\/open$/.test(route)) return ok({ examScheduleId: schedule.examScheduleId, status: "Open", openedAt: new Date().toISOString(), openedBy: "demo-lecturer-1" });
  if (route === "/studentprofiles") return ok(page(students.map((student, index) => ({ userId: student.studentId, userRole: "Student", majorId: "demo-major", curriculumId: "demo-curriculum", intakeYear: 2024, currentSemester: 4, enrollmentStatus: "Studying", fullName: student.studentName, studentCode: student.studentCode, avatarUrl: `https://i.pravatar.cc/96?img=${(index % 24) + 1}`, createdAt: iso(8, -100), updatedAt: iso(8, -1) }))));
  if (route === "/lecturerprofiles") return ok(page([
    { userId: "demo-lecturer-1", userRole: "Lecturer", fullName: "Nguyen Minh Anh", lecturerCode: "LEC0001", avatarUrl: "https://i.pravatar.cc/96?img=47", departmentId: "demo-department", academicRank: "Senior Lecturer", officeRoom: "A201", hireDate: iso(8, -1600), bio: "Software Engineering lecturer", createdAt: iso(8, -1600), updatedAt: iso(8, -1) },
    { userId: "demo-lecturer-2", userRole: "Lecturer", fullName: "Tran Quoc Bao", lecturerCode: "LEC0002", avatarUrl: "https://i.pravatar.cc/96?img=12", departmentId: "demo-department", academicRank: "Lecturer", officeRoom: "A203", hireDate: iso(8, -1200), bio: "Computer Science lecturer", createdAt: iso(8, -1200), updatedAt: iso(8, -2) },
    { userId: "demo-lecturer-3", userRole: "Lecturer", fullName: "Le Thu Ha", lecturerCode: "LEC0003", avatarUrl: "https://i.pravatar.cc/96?img=44", departmentId: "demo-department", academicRank: "Senior Lecturer", officeRoom: "B105", hireDate: iso(8, -2100), bio: "Information Systems lecturer", createdAt: iso(8, -2100), updatedAt: iso(8, -1) },
    { userId: "demo-lecturer-4", userRole: "Lecturer", fullName: "Pham Duc Long", lecturerCode: "LEC0004", avatarUrl: "https://i.pravatar.cc/96?img=15", departmentId: "demo-department", academicRank: "Lecturer", officeRoom: "B207", hireDate: iso(8, -900), bio: "Software Testing lecturer", createdAt: iso(8, -900), updatedAt: iso(8, -3) },
    { userId: "demo-lecturer-5", userRole: "Lecturer", fullName: "Bui Ngoc Lan", lecturerCode: "LEC0005", avatarUrl: "https://i.pravatar.cc/96?img=32", departmentId: "demo-department", academicRank: "Associate Professor", officeRoom: "C301", hireDate: iso(8, -2800), bio: "Data and AI lecturer", createdAt: iso(8, -2800), updatedAt: iso(8, -2) },
    { userId: "demo-lecturer-6", userRole: "Lecturer", fullName: "Vo Thanh Nam", lecturerCode: "LEC0006", avatarUrl: "https://i.pravatar.cc/96?img=53", departmentId: "demo-department", academicRank: "Lecturer", officeRoom: "C304", hireDate: iso(8, -700), bio: "Network and Security lecturer", createdAt: iso(8, -700), updatedAt: iso(8, -1) },
  ]));

  // Only known Lecturer/Examiner resources may swallow writes. Other roles and
  // authentication continue to use the real Backend even while this flag is on.
  const staffWritePrefixes = [
    "/questions", "/questionoptions", "/learningmaterials", "/examsubjects",
    "/exampapers", "/examrooms", "/examshifts", "/examschedules",
    "/lecturer/exam-schedules",
  ];
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    && staffWritePrefixes.some((prefix) => route.startsWith(prefix))
  ) return ok(null, "Demo action completed");
  return undefined;
}

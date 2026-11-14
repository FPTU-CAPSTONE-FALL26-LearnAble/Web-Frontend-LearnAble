import { describe, expect, it } from "vitest";
import {
  curriculumSchema,
  examRoomSchema,
  roomSeatSchema,
  studentProfileSchema,
  staffManagedUserRoles,
  userRoles,
  universitySchema,
} from "./admin";

describe("administration API contract", () => {
  it("accepts the current curriculum response without legacy totalCredits", () => {
    const parsed = curriculumSchema.parse({
      curriculumId: "c1",
      majorId: "m1",
      curriculumCode: "SE-2027",
      curriculumName: "Software Engineering",
      version: "1.0",
      intakeYear: 2027,
      effectiveFrom: null,
      effectiveTo: null,
      status: "Draft",
      approvedBy: null,
      approvedAt: null,
      createdAt: "2026-11-08T00:00:00Z",
      updatedAt: "2026-11-08T00:00:00Z",
    });
    expect(parsed.curriculumCode).toBe("SE-2027");
  });

  it("accepts the current university response without removed presentation fields", () => {
    expect(() =>
      universitySchema.parse({
        universityId: "u1",
        code: "LA",
        name: "LearnAble University",
        shortName: null,
        nameEn: null,
        address: null,
        phone: null,
        contactEmail: null,
        subdomain: null,
        emailDomain: null,
        logoUrl: null,
        status: "Active",
        createdAt: "2026-11-08T00:00:00Z",
        updatedAt: "2026-11-08T00:00:00Z",
      }),
    ).not.toThrow();
  });

  it("models staff account limits and exam facilities from Swagger", () => {
    expect(userRoles).toContain("Staff");
    expect(staffManagedUserRoles).toEqual(["Student", "Lecturer", "Examiner"]);
    expect(examRoomSchema.parse({
      examRoomId: "r1",
      universityId: "u1",
      roomCode: "A302",
      name: "Lab Alpha",
      building: "Alpha",
      floor: 3,
      isActive: true,
    }).roomCode).toBe("A302");
    expect(roomSeatSchema.parse({
      seatId: "s1",
      examRoomId: "r1",
      seatCode: "A1",
      rowNumber: 1,
      columnNumber: 1,
      isAvailable: true,
      hasComputer: true,
      hasCamera: false,
      notes: null,
    }).seatCode).toBe("A1");
  });

  it("accepts the live student profile contract without a currentSemester field", () => {
    expect(studentProfileSchema.parse({
      userId: "student-1",
      userRole: "Student",
      majorId: "major-1",
      curriculumId: "curriculum-1",
      intakeYear: 2026,
      enrollmentStatus: "Studying",
      createdAt: "2026-11-08T00:00:00Z",
      updatedAt: "2026-11-08T00:00:00Z",
    }).intakeYear).toBe(2026);
  });
});

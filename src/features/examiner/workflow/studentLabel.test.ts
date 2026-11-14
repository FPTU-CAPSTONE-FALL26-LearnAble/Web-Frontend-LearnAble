import { matchesStudentSearch, studentLabel } from "./studentLabel";

const profile = { userId: "33333333-aaaa-bbbb-cccc-dddddddddddd" };

describe("studentLabel", () => {
  it("uses the name and code of the user account", () => {
    expect(studentLabel(profile, { fullName: "Nguyễn Văn An", userCode: "HE170001" })).toEqual({ name: "Nguyễn Văn An", code: "HE170001", known: true });
  });

  it("falls back to the start of the id when no account is found", () => {
    expect(studentLabel(profile)).toEqual({ name: "Student 33333333", code: "33333333", known: false });
  });

  it("does not show the Backend's missing-value marker as a name or code", () => {
    expect(studentLabel(profile, { fullName: "Not available", userCode: "Not available" })).toMatchObject({ name: "Student 33333333", code: "33333333", known: false });
  });

  it("takes whichever of the two is real when only one is", () => {
    expect(studentLabel(profile, { fullName: "Trần Thị Bé", userCode: null })).toEqual({ name: "Trần Thị Bé", code: "33333333", known: true });
  });
});

describe("matchesStudentSearch", () => {
  const label = { name: "Nguyễn Văn An", code: "HE170001" };
  it("finds by name without accents, or by code, ignoring case", () => {
    expect(matchesStudentSearch(label, "nguyen van")).toBe(true);
    expect(matchesStudentSearch(label, "he1700")).toBe(true);
    expect(matchesStudentSearch(label, "tran")).toBe(false);
  });
  it("shows everything for an empty search", () => {
    expect(matchesStudentSearch(label, "  ")).toBe(true);
  });
});

import { describeAllocationIssues } from "./allocationMessages";

const names: Record<string, string> = { s1: "Tran Quoc Toan", s2: "Ronal Do" };
const nameOf = (type: string, id: string) => (type === "Student" ? names[id] : undefined);

describe("describeAllocationIssues", () => {
  it("turns the two reasons from the screenshot into plain advice", () => {
    const problems = describeAllocationIssues(
      [
        { code: "OUTSIDE_AVAILABILITY_SLOT", resourceType: "InvigilationSlot", resourceId: "slot-1", message: "The whole shift must fit the selected availability slot and semester." },
        { code: "STUDENT_INACTIVE", resourceType: "Student", resourceId: "s1", message: "A selected student is inactive, not studying or has an invalid role." },
      ],
      nameOf,
    );
    expect(problems.map((problem) => problem.title)).toEqual([
      "The exam hours do not fit the invigilation slot",
      "1 student cannot sit this exam",
    ]);
    expect(problems[0].fixInDetails).toBe(true);
    expect(problems[1]).toMatchObject({ subjects: ["Tran Quoc Toan"], fix: "Take them out of the list of students.", fixInDetails: false });
  });

  it("makes one problem of many students, with all their names", () => {
    const problems = describeAllocationIssues(
      [
        { code: "STUDENT_INACTIVE", resourceType: "Student", resourceId: "s1" },
        { code: "STUDENT_INACTIVE", resourceType: "Student", resourceId: "s2" },
        { code: "STUDENT_INACTIVE", resourceType: "Student", resourceId: "s3" },
      ],
      nameOf,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].title).toBe("3 students cannot sit this exam");
    // The third student has no known name, so only two names are listed but all three are counted.
    expect(problems[0].subjects).toEqual(["Tran Quoc Toan", "Ronal Do"]);
    expect(problems[0].count).toBe(3);
  });

  it("keeps the Backend wording for a reason it does not know, and still says what to do", () => {
    expect(describeAllocationIssues([{ code: "BRAND_NEW", message: "Something new happened." }], nameOf)[0]).toMatchObject({
      title: "Something new happened.",
      fix: "Review the selection and check again.",
    });
  });

  it("has nothing to say when there are no problems", () => {
    expect(describeAllocationIssues([], nameOf)).toEqual([]);
  });
});

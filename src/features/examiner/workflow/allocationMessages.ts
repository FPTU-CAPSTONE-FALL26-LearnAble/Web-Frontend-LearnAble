export type AllocationIssue = {
  code?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
};

export type AllocationProblem = {
  code: string;
  title: string;
  detail?: string;
  fix: string;
  /** Names of the students, lecturers or rooms the problem is about, when they are known. */
  subjects: string[];
  /** How many resources are affected, also when their names are not known. */
  count: number;
  /** The first step has to change to fix it. */
  fixInDetails: boolean;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

type Rule = (count: number) => { title: string; detail?: string; fix: string; fixInDetails?: boolean };

/** What each reason from the allocation check means, and what to do, in words for the examiner. */
const rules: Record<string, Rule> = {
  OUTSIDE_AVAILABILITY_SLOT: () => ({
    title: "The exam hours do not fit the invigilation slot",
    detail: "The whole shift, entry time included, must be inside the slot you chose and inside the semester.",
    fix: "Go back and use the slot's own times, or choose a slot that is longer than the exam.",
    fixInDetails: true,
  }),
  OUTSIDE_SEMESTER: () => ({ title: "The exam is outside its semester", fix: "Choose dates inside the semester of this exam.", fixInDetails: true }),
  DURATION_EXCEEDS_SHIFT: (count) => ({
    title: `The exam does not fit in the shift for ${plural(count, "student", "students")}`,
    detail: "After entry closes there must be time for the whole exam, plus any extra time a student has.",
    fix: "Use a longer slot, close entry earlier, or lower the extra time.",
    fixInDetails: true,
  }),
  STUDENT_INACTIVE: (count) => ({
    title: `${plural(count, "student cannot", "students cannot")} sit this exam`,
    detail: "Their account is turned off, they are not studying at the moment, or the account is not a student.",
    fix: "Take them out of the list of students.",
  }),
  STUDENT_OVERLAP: (count) => ({
    title: `${plural(count, "student already has", "students already have")} an exam at this time`,
    fix: "Take them out of the list, or choose another time.",
  }),
  LECTURER_INACTIVE: (count) => ({
    title: `${plural(count, "lecturer cannot", "lecturers cannot")} invigilate`,
    detail: "Their account is turned off, or the account is not a lecturer.",
    fix: "Choose other lecturers.",
  }),
  LECTURER_NOT_AVAILABLE: (count) => ({
    title: `${plural(count, "lecturer has", "lecturers have")} not registered for this slot`,
    fix: "Choose only lecturers who registered for the slot.",
  }),
  LECTURER_OVERLAP: (count) => ({
    title: `${plural(count, "lecturer is", "lecturers are")} already invigilating another exam at this time`,
    fix: "Choose other lecturers, or another time.",
  }),
  INSUFFICIENT_INVIGILATORS: () => ({
    title: "There are not enough lecturers for the rooms",
    fix: "Choose more lecturers, fewer rooms, or fewer invigilators per room.",
  }),
  INSUFFICIENT_SEATS: () => ({
    title: "The rooms do not have enough suitable seats",
    detail: "A seat counts when it is usable and has a computer, and a camera if the exam needs one.",
    fix: "Choose more rooms, or ask the staff office to set up more seats.",
  }),
  ROOM_INACTIVE: (count) => ({ title: `${plural(count, "selected room is", "selected rooms are")} turned off`, fix: "Choose other rooms.", fixInDetails: true }),
  ROOM_OVERLAP: (count) => ({ title: `${plural(count, "room is", "rooms are")} already used at this time`, fix: "Choose other rooms, or another time.", fixInDetails: true }),
  EXAM_ARCHIVED: () => ({ title: "This exam is archived", fix: "Choose another exam in the first step.", fixInDetails: true }),
  PERIOD_NOT_USABLE: () => ({ title: "The invigilation period is not open", fix: "Open the registration period first, or choose another period.", fixInDetails: true }),
  AVAILABILITY_SEMESTER_MISMATCH: () => ({ title: "The exam and the invigilation period are from different semesters", fix: "Choose a period of the same semester as the exam.", fixInDetails: true }),
};

/** One problem per reason, with the names of everyone it touches, so ten students make one clear line. */
export function describeAllocationIssues(issues: AllocationIssue[], nameOf: (type: string, id: string) => string | undefined): AllocationProblem[] {
  const groups = new Map<string, AllocationIssue[]>();
  for (const issue of issues) {
    const code = issue.code ?? issue.message ?? "UNKNOWN";
    groups.set(code, [...(groups.get(code) ?? []), issue]);
  }
  return [...groups.entries()].map(([code, items]) => {
    const resources = [...new Set(items.map((item) => (item.resourceId ? `${item.resourceType ?? ""}|${item.resourceId}` : "")).filter(Boolean))];
    const count = Math.max(1, resources.length);
    const subjects = resources.flatMap((key) => {
      const [type, id] = key.split("|");
      const name = nameOf(type, id);
      return name ? [name] : [];
    });
    const rule = rules[code];
    const made = rule
      ? rule(count)
      : { title: items[0].message ?? "A problem was found", fix: "Review the selection and check again." };
    return { code, title: made.title, detail: made.detail, fix: made.fix, subjects, count, fixInDetails: Boolean("fixInDetails" in made && made.fixInDetails) };
  });
}

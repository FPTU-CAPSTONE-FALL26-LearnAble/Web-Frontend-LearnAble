import { describe, expect, it } from "vitest";
import { filterSubjects, filterTopics, groupTopicsBySubject, subjectLabel } from "./subjectTopicSearch";

const subjects = [
  { subjectId: "3", subjectCode: "CSD201", subjectNameEn: "Data Structures and Algorithms" },
  { subjectId: "1", subjectCode: "AAL301", subjectNameEn: "Advanced Algorithms" },
  { subjectId: "2", subjectCode: "CHN111", subjectNameEn: "Hán ngữ Trung Quốc" },
  { subjectId: "4", subjectCode: "ZZZ999", subjectNameEn: null },
];
const topics = [
  { topicId: "t1", subjectId: "1", topicName: "Introduction to Advanced Algorithms" },
  { topicId: "t2", subjectId: "1", topicName: "Dynamic programming" },
  { topicId: "t3", subjectId: "3", topicName: "Đồ thị" },
];

describe("filterSubjects", () => {
  it("lists subjects in code order when nothing is typed", () => {
    expect(filterSubjects(subjects, "").map((item) => item.subjectCode)).toEqual(["AAL301", "CHN111", "CSD201", "ZZZ999"]);
    expect(filterSubjects(subjects, "   ")).toHaveLength(4);
  });

  it("finds a subject by code or by any part of its name", () => {
    expect(filterSubjects(subjects, "csd").map((item) => item.subjectId)).toEqual(["3"]);
    expect(filterSubjects(subjects, "algorithms").map((item) => item.subjectCode)).toEqual(["AAL301", "CSD201"]);
  });

  it("ignores case and accents", () => {
    expect(filterSubjects(subjects, "HAN NGU").map((item) => item.subjectId)).toEqual(["2"]);
  });

  it("returns nothing when nothing matches, and does not change the input order", () => {
    const copy = [...subjects];
    expect(filterSubjects(subjects, "qqq")).toEqual([]);
    expect(subjects).toEqual(copy);
  });
});

describe("filterTopics", () => {
  it("narrows topics by name, ignoring accents", () => {
    expect(filterTopics(topics, "do thi").map((item) => item.topicId)).toEqual(["t3"]);
    expect(filterTopics(topics, "dynamic").map((item) => item.topicId)).toEqual(["t2"]);
    expect(filterTopics(topics, "")).toHaveLength(3);
  });
});

describe("groupTopicsBySubject and subjectLabel", () => {
  it("groups topics under their subject", () => {
    const grouped = groupTopicsBySubject(topics);
    expect(grouped.get("1")?.map((item) => item.topicId)).toEqual(["t1", "t2"]);
    expect(grouped.get("2")).toBeUndefined();
  });

  it("names a subject by code and English name", () => {
    expect(subjectLabel(subjects[1])).toBe("AAL301 · Advanced Algorithms");
    expect(subjectLabel(subjects[3])).toBe("ZZZ999 · Unnamed subject");
  });
});

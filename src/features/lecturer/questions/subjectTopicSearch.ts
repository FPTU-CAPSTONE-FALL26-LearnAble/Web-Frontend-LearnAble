import { foldText } from "@/lib/foldText";

export type PickerSubject = { subjectId: string; subjectCode: string; subjectNameEn?: string | null };
export type PickerTopic = { topicId: string; subjectId: string; topicName: string };

export const subjectLabel = (subject: PickerSubject) => `${subject.subjectCode} · ${subject.subjectNameEn ?? "Unnamed subject"}`;

/** Subjects in code order, narrowed by a search over code and name that ignores accents and case. */
export function filterSubjects<T extends PickerSubject>(subjects: T[], query: string): T[] {
  const needle = foldText(query.trim());
  const sorted = [...subjects].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
  return needle ? sorted.filter((subject) => foldText(`${subject.subjectCode} ${subject.subjectNameEn ?? ""}`).includes(needle)) : sorted;
}

export function filterTopics<T extends PickerTopic>(topics: T[], query: string): T[] {
  const needle = foldText(query.trim());
  return needle ? topics.filter((topic) => foldText(topic.topicName).includes(needle)) : topics;
}

export function groupTopicsBySubject<T extends PickerTopic>(topics: T[]): Map<string, T[]> {
  const bySubject = new Map<string, T[]>();
  for (const topic of topics) bySubject.set(topic.subjectId, [...(bySubject.get(topic.subjectId) ?? []), topic]);
  return bySubject;
}

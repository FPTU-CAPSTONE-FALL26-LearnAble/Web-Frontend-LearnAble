import { useCallback, useState } from "react";

export type ExamPreparationDraft = {
  examSubjectId: string;
  examPaperId: string;
  paperETag: string;
  subjectId: string;
  semesterId: string;
  examTypeId: string;
  name: string;
  instructions: string;
  durationMinutes: number;
  passScore: number;
  paperCode: string;
  paperName: string;
  selectedQuestions: Array<{ questionId: string; maxScore: number }>;
};

export type SchedulePreparationDraft = {
  examSubjectId: string;
  examRoomId: string;
  examRoomIds: string[];
  shiftName: string;
  startsAt: string;
  endsAt: string;
  entryOpensAt: string;
  entryClosesAt: string;
  examShiftId: string;
  examScheduleId: string;
  scheduleRooms: Array<{ examRoomId: string; roomLabel: string; examShiftId: string; examScheduleId: string }>;
  assignmentsBySchedule: Record<string, { studentIds: string[]; lecturerIds: string[] }>;
  assignedScheduleIds: string[];
  studentIds: string[];
  lecturerIds: string[];
};

const examKey = "learnable:examiner:exam-preparation-v2";
const scheduleKey = "learnable:examiner:schedule-preparation-v3";

export const emptyExamPreparation: ExamPreparationDraft = {
  examSubjectId: "", examPaperId: "", paperETag: "", subjectId: "", semesterId: "",
  examTypeId: "", name: "", instructions: "", durationMinutes: 90, passScore: 5,
  paperCode: "", paperName: "", selectedQuestions: [],
};

export const emptySchedulePreparation: SchedulePreparationDraft = {
  examSubjectId: "", examRoomId: "", examRoomIds: [], shiftName: "", startsAt: "", endsAt: "",
  entryOpensAt: "", entryClosesAt: "", examShiftId: "", examScheduleId: "",
  scheduleRooms: [], assignmentsBySchedule: {}, assignedScheduleIds: [],
  studentIds: [], lecturerIds: [],
};

function read<T>(key: string, fallback: T): T {
  try {
    const value = sessionStorage.getItem(key);
    return value ? { ...fallback, ...(JSON.parse(value) as T) } : fallback;
  } catch {
    return fallback;
  }
}

function useStoredDraft<T>(key: string, fallback: T) {
  const [draft, setState] = useState<T>(() => read(key, fallback));
  const setDraft = useCallback((next: T | ((current: T) => T)) => {
    setState((current) => {
      const value = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      sessionStorage.setItem(key, JSON.stringify(value));
      return value;
    });
  }, [key]);
  const reset = useCallback(() => {
    sessionStorage.removeItem(key);
    setState(fallback);
  }, [fallback, key]);
  return { draft, setDraft, reset };
}

export const useExamPreparationDraft = () => useStoredDraft(examKey, emptyExamPreparation);
export const useSchedulePreparationDraft = () => useStoredDraft(scheduleKey, emptySchedulePreparation);

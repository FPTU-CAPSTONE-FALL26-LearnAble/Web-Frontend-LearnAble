import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getExamTypes } from "@/api/exams";
import { getQuestions, getSubjects, getTopics, setQuestionStatus } from "@/api/lecturer";
import { fetchAllPages } from "@/api/pagination";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import type { ManagedQuestion, QuestionPurpose } from "@/features/lecturer/questions/model";
import { examTypesForPurpose } from "@/features/lecturer/questions/model";
import { toast } from "@/shared/ui/primitives/toast";

export type QuestionBankQuery = {
  examTypeId: string;
  search: string;
  topicId: string;
  questionType: string;
  difficulty: string;
  status: string;
  page: number;
  pageSize: number;
  /** Read every question matching the filters instead of one page, so the page can filter them itself. */
  loadAll?: boolean;
};

export function useQuestionBank(purpose: QuestionPurpose, filters: QuestionBankQuery) {
  const queryClient = useQueryClient();
  const examTypes = useQuery({ queryKey: ["exam-types", "active"], queryFn: getExamTypes });
  const purposeExamTypes = examTypesForPurpose(examTypes.data ?? [], purpose);
  const baseQuery = {
    ExamTypeId: filters.examTypeId,
    SearchTerm: filters.search || undefined,
    TopicId: filters.topicId || undefined,
    QuestionType: filters.questionType || undefined,
    Difficulty: filters.difficulty || undefined,
    Status: filters.status || undefined,
    SortBy: "-createdAt",
  };
  /** Every question matching the filters, across all pages, with the status of each. */
  const readEveryQuestion = () => fetchAllPages((PageNumber, PageSize) => getQuestions({ ...baseQuery, PageNumber, PageSize }));
  const ready = examTypes.isSuccess && Boolean(filters.examTypeId);
  // The page the lecturer is looking at. It loads first and alone, so the list appears quickly.
  const questions = useQuery({
    queryKey: ["lecturer", "question-bank", purpose, baseQuery, filters.page, filters.pageSize],
    enabled: ready && !filters.loadAll,
    queryFn: () => getQuestions({ ...baseQuery, PageNumber: filters.page, PageSize: filters.pageSize }),
  });
  // Every question matching the filters, for audio progress and the audio filter. It starts after the
  // page has loaded, and changing only the audio filter or the page reuses it instead of reading again.
  const everyQuestion = useQuery({
    queryKey: ["lecturer", "question-bank", "every", purpose, baseQuery],
    enabled: ready && (Boolean(filters.loadAll) || questions.isSuccess || questions.isError),
    queryFn: readEveryQuestion,
    staleTime: 30_000,
  });
  const list = filters.loadAll ? everyQuestion : questions;
  // The Backend returns at most 100 rows a page. Read every page, or topics beyond the first
  // hundred would be missing from the filter and shown as "Not available" in the table.
  const topics = useQuery({ queryKey: ["lecturer", "question-bank-topics"], queryFn: () => fetchAllPages((PageNumber, PageSize) => getTopics({ PageNumber, PageSize })) });
  const subjects = useQuery({ queryKey: ["lecturer", "question-bank-subjects"], queryFn: () => fetchAllPages((PageNumber, PageSize) => getSubjects({ PageNumber, PageSize })) });
  useExpiredSession(list.error || topics.error || subjects.error || examTypes.error);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["lecturer", "question-bank"] });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Active" | "Archived" }) => setQuestionStatus(id, status),
    onSuccess: () => void refresh(),
    onError: (error) => toast({ title: "Question status could not be changed", description: error instanceof Error ? error.message : "Refresh the question bank and try again." }),
  });
  const data = useMemo(() => (list.data?.items ?? []).map((question): ManagedQuestion => {
    const topic = topics.data?.items.find((item) => item.topicId === question.topicId);
    const subject = subjects.data?.items.find((item) => item.subjectId === topic?.subjectId);
    return {
      id: question.questionId,
      purpose,
      examTypeId: question.examTypeId,
      examTypeName: question.examTypeName ?? question.examTypeCode ?? "Not available",
      content: question.content,
      subjectCode: subject?.subjectCode ?? "Not available",
      subjectName: subject?.subjectNameEn ?? "Not available",
      topic: topic?.topicName ?? "Not available",
      type: question.questionType === "Single" ? "Single Choice" : question.questionType === "Multiple" ? "Multiple Choice" : "Essay",
      difficulty: (["Easy", "Medium", "Hard"].includes(question.difficulty) ? question.difficulty : "Medium") as ManagedQuestion["difficulty"],
      score: question.defaultScore,
      status: (["Active", "Draft", "Archived"].includes(question.status) ? question.status : "Draft") as ManagedQuestion["status"],
      usageCount: null,
      readiness: question.status === "Active" ? "Ready" : question.status === "Archived" ? "Needs review" : "Draft",
      updatedAt: question.updatedAt ?? question.createdAt,
    };
  }), [purpose, list.data, subjects.data, topics.data]);
  return { data, list, refresh, everyQuestion, readEveryQuestion, pageData: questions.data, questions, topics, subjects, examTypes, purposeExamTypes, statusMutation };
}

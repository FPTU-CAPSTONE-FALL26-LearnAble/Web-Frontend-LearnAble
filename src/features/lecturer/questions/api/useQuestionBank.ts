import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getExamTypes } from "@/api/exams";
import {
  getQuestions,
  getSubjects,
  getTopics,
  setQuestionStatus,
} from "@/api/lecturer";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import type {
  ManagedQuestion,
  QuestionPurpose,
} from "@/features/lecturer/questions/model";
import { examTypesForPurpose } from "@/features/lecturer/questions/model";

export function useQuestionBank(purpose: QuestionPurpose) {
  const examTypes = useQuery({
    queryKey: ["exam-types", "active"],
    queryFn: getExamTypes,
  });
  const purposeExamTypes = examTypesForPurpose(examTypes.data ?? [], purpose);
  const examTypeIds = purposeExamTypes.map((item) => item.examTypeId);
  const questions = useQuery({
    queryKey: ["lecturer", "question-bank", purpose, examTypeIds],
    enabled: examTypes.isSuccess && examTypeIds.length > 0,
    queryFn: async () => {
      const pages = await Promise.all(
        examTypeIds.map((ExamTypeId) =>
          getQuestions({
            ExamTypeId,
            PageNumber: 1,
            PageSize: 100,
            SortBy: "-createdAt",
          }),
        ),
      );
      return { items: pages.flatMap((page) => page.items) };
    },
  });
  const topics = useQuery({
    queryKey: ["lecturer", "question-bank-topics"],
    queryFn: () => getTopics(),
  });
  const subjects = useQuery({
    queryKey: ["lecturer", "question-bank-subjects"],
    queryFn: () => getSubjects(),
  });
  useExpiredSession(
    questions.error || topics.error || subjects.error || examTypes.error,
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Active" | "Archived" }) =>
      setQuestionStatus(id, status),
    onSuccess: () => void questions.refetch(),
  });

  const data = useMemo(() => {
    if (!questions.data || !topics.data || !subjects.data) return [];

    return questions.data.items.map((question): ManagedQuestion => {
      const topic = topics.data.items.find(
        (item) => item.topicId === question.topicId,
      );
      const subject = subjects.data.items.find(
        (item) => item.subjectId === topic?.subjectId,
      );

      return {
        id: question.questionId,
        purpose,
        examTypeId: question.examTypeId,
        examTypeName:
          question.examTypeName ?? question.examTypeCode ?? "Not available",
        content: question.content,
        subjectCode: subject?.subjectCode ?? "Not available",
        subjectName: subject?.subjectNameEn ?? "Not available",
        topic: topic?.topicName ?? "Not available",
        type:
          question.questionType === "Single"
            ? "Single Choice"
            : question.questionType === "Multiple"
              ? "Multiple Choice"
              : "Essay",
        difficulty: (["Easy", "Medium", "Hard"].includes(question.difficulty)
          ? question.difficulty
          : "Medium") as ManagedQuestion["difficulty"],
        score: question.defaultScore,
        status: (["Active", "Draft", "Archived"].includes(question.status)
          ? question.status
          : "Draft") as ManagedQuestion["status"],
        usageCount: null,
        readiness:
          question.status === "Active"
            ? "Ready"
            : question.status === "Archived"
              ? "Needs review"
              : "Draft",
        updatedAt: question.updatedAt ?? question.createdAt,
      };
    });
  }, [purpose, questions.data, subjects.data, topics.data]);

  return { data, examTypes, purposeExamTypes, statusMutation };
}

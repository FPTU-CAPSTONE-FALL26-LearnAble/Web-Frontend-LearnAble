import { useLocation } from "react-router";

/**
 * Exam papers are written by lecturers and only read by examiners. The same screens serve both,
 * so the links they follow depend on which area they are opened from.
 */
export function preparationPaths(pathname: string) {
  const examiner = pathname.startsWith("/examiner");
  const bank = examiner ? "/examiner/exams" : "/lecturer/exam-papers";
  return {
    /** Examiners can look at papers but not write or change them. */
    readOnly: examiner,
    bank,
    setup: `${bank}/new/setup`,
    questions: `${bank}/new/questions`,
    operations: `${bank}/new/operations`,
    sealPaper: (paperId: string) => `/lecturer/exam-papers/${paperId}/seal`,
    sealedPapers: examiner ? "/examiner/sealed-papers" : "/lecturer/sealed-papers",
  };
}

export const usePreparationPaths = () => preparationPaths(useLocation().pathname);

export const PREPARATION_STEPS = ["Exam configuration", "Build paper", "Preview & publish", "Seal & hand over"];

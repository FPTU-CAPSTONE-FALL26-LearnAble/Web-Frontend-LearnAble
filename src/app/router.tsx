import { createBrowserRouter, Navigate, useParams } from "react-router";
import { lazy, Suspense } from "react";
import { AppLayout } from "@/app/AppLayout";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireStudent } from "@/features/auth/components/RequireStudent";
import { LoginRoute } from "@/features/auth/routes/LoginRoute";
import { ForgotPasswordRoute } from "@/features/auth/routes/ForgotPasswordRoute";
import { AccessibilitySettingsRoute } from "@/features/accessibility/routes/AccessibilitySettingsRoute";
import { PracticeListRoute } from "@/features/practice/routes/PracticeListRoute";
import { PracticeAttemptRoute } from "@/features/practice/routes/PracticeAttemptRoute";
import { AssistantRoute } from "@/features/assistant/routes/AssistantRoute";
import { ProgressRoute } from "@/features/progress/routes/ProgressRoute";
import { ResultsListRoute } from "@/features/results/routes/ResultsListRoute";
import { ResultDetailRoute } from "@/features/results/routes/ResultDetailRoute";
import { LecturerLayout } from "@/features/lecturer/shell/LecturerLayout";
import { RequireLecturer } from "@/features/lecturer/shell/RequireLecturer";
import { LecturerDashboardRoute } from "@/features/lecturer/dashboard/routes/LecturerDashboardRoute";
import { QuestionBankRoute } from "@/features/lecturer/questions/routes/QuestionBankRoute";
import { ImportQuestionsRoute } from "@/features/lecturer/questions/routes/ImportQuestionsRoute";
const CreateQuestionRoute = lazy(() =>
  import("@/features/lecturer/questions/routes/CreateQuestionRoute").then((module) => ({
    default: module.CreateQuestionRoute,
  })),
);
import { LearningMaterialsRoute } from "@/features/lecturer/materials/routes/LearningMaterialsRoute";
import { UploadMaterialRoute } from "@/features/lecturer/materials/routes/UploadMaterialRoute";
import { ExamScheduleRoute } from "@/features/lecturer/exams/routes/ExamScheduleRoute";
import { AttendanceRoute } from "@/features/lecturer/exams/routes/AttendanceRoute";
import { LecturerGradingRoute } from "@/features/lecturer/exams/routes/LecturerGradingRoute";
import { LecturerProfileRoute } from "@/features/lecturer/profile/routes/LecturerProfileRoute";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { RequireAdmin } from "@/features/admin/components/RequireAdmin";
import { AdminDashboardRoute } from "@/features/admin/routes/AdminDashboardRoute";
import { UniversitiesRoute } from "@/features/admin/routes/UniversitiesRoute";
import { DepartmentsRoute } from "@/features/admin/routes/DepartmentsRoute";
import { MajorsRoute } from "@/features/admin/routes/MajorsRoute";
import { SubjectsRoute } from "@/features/admin/routes/SubjectsRoute";
import { TopicsRoute } from "@/features/admin/routes/TopicsRoute";
import { SemestersRoute } from "@/features/admin/routes/SemestersRoute";
import { CurriculumsRoute } from "@/features/admin/routes/CurriculumsRoute";
import { UsersRoute } from "@/features/admin/routes/UsersRoute";
import { StudentProfilesRoute } from "@/features/admin/routes/StudentProfilesRoute";
import { LecturerProfilesRoute } from "@/features/admin/routes/LecturerProfilesRoute";
import { ExaminerLayout } from "@/features/examiner/components/ExaminerLayout";
import { RequireExaminer } from "@/features/examiner/components/RequireExaminer";
import {
  CandidateMonitoringRoute,
  ExaminerDashboardRoute,
  ExamBankRoute,
  ExamOperationsRoute,
  ExamReadinessRoute,
  ExamScheduleDashboardRoute,
  ExamSetupRoute,
  LiveMonitoringRoute,
  QuestionSelectionRoute,
  RoomMonitoringRoute,
  ScheduleCandidatesRoute,
  ScheduleDetailsRoute,
  ScheduleReadinessRoute,
  ScheduleRoomsRoute,
} from "@/features/examiner/routes/ExaminerRoutes";
import {
  AccommodationsRoute,
  ExamReportsRoute,
  FlaggedSessionsRoute,
  GradeReleaseRoute,
  IntegrityReviewRoute,
} from "@/features/examiner/routes/ExaminerWorkflowRoutes";
import { ComponentDemoRoute } from "@/features/demo/routes/ComponentDemoRoute";
import { ResultReceiptDemoRoute } from "@/features/demo/routes/ResultReceiptDemoRoute";
import { ExamDemoRoute } from "@/features/demo/routes/ExamDemoRoute";
import { LandingRoute } from "@/features/landing/routes/LandingRoute";

function LegacyParameterizedRedirect({
  destination,
  parameter,
}: {
  destination: string;
  parameter: string;
}) {
  const params = useParams();
  const value = params[parameter];
  return (
    <Navigate
      to={value ? `${destination}/${encodeURIComponent(value)}` : destination}
      replace
    />
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingRoute /> },
  { path: "/demo/components", element: <ComponentDemoRoute /> },
  { path: "/demo/result", element: <ResultReceiptDemoRoute /> },
  { path: "/demo/exam", element: <ExamDemoRoute /> },
  { path: "/demo", element: <Navigate to="/demo/components" replace /> },
  { path: "/login", element: <LoginRoute /> },
  { path: "/register", element: <Navigate to="/login" replace /> },
  { path: "/forgot-password", element: <ForgotPasswordRoute /> },
  { path: "/dang-nhap", element: <Navigate to="/login" replace /> },
  {
    path: "/quen-mat-khau",
    element: <Navigate to="/forgot-password" replace />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireLecturer />,
        children: [
          {
            element: <LecturerLayout />,
            children: [
              {
                path: "/lecturer/dashboard",
                element: <LecturerDashboardRoute />,
              },
              {
                path: "/lecturer/questions",
                element: <Navigate to="/lecturer/questions/exam" replace />,
              },
              {
                path: "/lecturer/questions/exam",
                element: <QuestionBankRoute purpose="exam" />,
              },
              {
                path: "/lecturer/questions/practice",
                element: <QuestionBankRoute purpose="practice" />,
              },
              {
                path: "/lecturer/questions/new",
                element: (
                  <Suspense
                    fallback={<p role="status">Loading question studio…</p>}
                  >
                    <CreateQuestionRoute />
                  </Suspense>
                ),
              },
              {
                path: "/lecturer/questions/import",
                element: <ImportQuestionsRoute />,
              },
              {
                path: "/lecturer/materials",
                element: <LearningMaterialsRoute />,
              },
              {
                path: "/lecturer/materials/new",
                element: <UploadMaterialRoute />,
              },
              { path: "/lecturer/exams", element: <ExamScheduleRoute /> },
              { path: "/lecturer/grading", element: <LecturerGradingRoute /> },
              {
                path: "/lecturer/exams/:examId/attendance",
                element: <AttendanceRoute />,
              },
              { path: "/lecturer/profile", element: <LecturerProfileRoute /> },
            ],
          },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: "/admin", element: <Navigate to="/admin/dashboard" replace /> },
              { path: "/admin/dashboard", element: <AdminDashboardRoute /> },
              { path: "/admin/universities", element: <UniversitiesRoute /> },
              { path: "/admin/departments", element: <DepartmentsRoute /> },
              { path: "/admin/majors", element: <MajorsRoute /> },
              { path: "/admin/subjects", element: <SubjectsRoute /> },
              { path: "/admin/topics", element: <TopicsRoute /> },
              { path: "/admin/semesters", element: <SemestersRoute /> },
              { path: "/admin/curriculums", element: <CurriculumsRoute /> },
              { path: "/admin/users", element: <UsersRoute /> },
              {
                path: "/admin/student-profiles",
                element: <StudentProfilesRoute />,
              },
              {
                path: "/admin/lecturer-profiles",
                element: <LecturerProfilesRoute />,
              },
            ],
          },
        ],
      },
      {
        element: <RequireExaminer />,
        children: [
          {
            element: <ExaminerLayout />,
            children: [
              {
                path: "/examiner/dashboard",
                element: <ExaminerDashboardRoute />,
              },
              { path: "/examiner/exams", element: <ExamBankRoute /> },
              {
                path: "/examiner/exams/new/setup",
                element: <ExamSetupRoute />,
              },
              {
                path: "/examiner/exams/new/questions",
                element: <QuestionSelectionRoute />,
              },
              {
                path: "/examiner/exams/new/operations",
                element: <ExamOperationsRoute />,
              },
              {
                path: "/examiner/exams/new/readiness",
                element: <ExamReadinessRoute />,
              },
              {
                path: "/examiner/schedule",
                element: <ExamScheduleDashboardRoute />,
              },
              {
                path: "/examiner/schedule/new/details",
                element: <ScheduleDetailsRoute />,
              },
              {
                path: "/examiner/schedule/new/rooms",
                element: <ScheduleRoomsRoute />,
              },
              {
                path: "/examiner/schedule/new/candidates",
                element: <ScheduleCandidatesRoute />,
              },
              {
                path: "/examiner/schedule/new/readiness",
                element: <ScheduleReadinessRoute />,
              },
              {
                path: "/examiner/monitoring",
                element: <LiveMonitoringRoute />,
              },
              {
                path: "/examiner/monitoring/:roomId",
                element: <RoomMonitoringRoute />,
              },
              {
                path: "/examiner/monitoring/:roomId/candidates/:candidateId",
                element: <CandidateMonitoringRoute />,
              },
              { path: "/examiner/results", element: <GradeReleaseRoute /> },
              { path: "/examiner/reviews", element: <IntegrityReviewRoute /> },
              { path: "/examiner/flags", element: <FlaggedSessionsRoute /> },
              { path: "/examiner/reports", element: <ExamReportsRoute /> },
              {
                path: "/examiner/accommodations",
                element: <AccommodationsRoute />,
              },
            ],
          },
        ],
      },
      {
        element: <RequireStudent />,
        children: [
          {
            path: "/practice/:setId",
            element: <PracticeAttemptRoute />,
          },
          {
            path: "/luyen-tap/:setId",
            element: (
              <LegacyParameterizedRedirect
                destination="/practice"
                parameter="setId"
              />
            ),
          },
          {
            element: <AppLayout />,
            children: [
              {
                path: "/settings/accessibility",
                element: <AccessibilitySettingsRoute />,
              },
              { path: "/practice", element: <PracticeListRoute /> },
              { path: "/assistant", element: <AssistantRoute /> },
              { path: "/progress", element: <ProgressRoute /> },
              { path: "/results", element: <ResultsListRoute /> },
              { path: "/results/:sessionId", element: <ResultDetailRoute /> },
              {
                path: "/cai-dat/tro-nang",
                element: <Navigate to="/settings/accessibility" replace />,
              },
              {
                path: "/luyen-tap",
                element: <Navigate to="/practice" replace />,
              },
              {
                path: "/tro-ly",
                element: <Navigate to="/assistant" replace />,
              },
              {
                path: "/tien-do",
                element: <Navigate to="/progress" replace />,
              },
              { path: "/ket-qua", element: <Navigate to="/results" replace /> },
              {
                path: "/ket-qua/:sessionId",
                element: (
                  <LegacyParameterizedRedirect
                    destination="/results"
                    parameter="sessionId"
                  />
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);

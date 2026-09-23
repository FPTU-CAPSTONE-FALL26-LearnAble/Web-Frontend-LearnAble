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
import { LecturerLayout } from "@/features/lecturer/components/LecturerLayout";
import { RequireLecturer } from "@/features/lecturer/components/RequireLecturer";
import { LecturerDashboardRoute } from "@/features/lecturer/routes/LecturerDashboardRoute";
import { QuestionBankRoute } from "@/features/lecturer/routes/QuestionBankRoute";
const CreateQuestionRoute = lazy(() =>
  import("@/features/lecturer/routes/CreateQuestionRoute").then((module) => ({
    default: module.CreateQuestionRoute,
  })),
);
import { LearningMaterialsRoute } from "@/features/lecturer/routes/LearningMaterialsRoute";
import { UploadMaterialRoute } from "@/features/lecturer/routes/UploadMaterialRoute";
import { ExamScheduleRoute } from "@/features/lecturer/routes/ExamScheduleRoute";
import { AttendanceRoute } from "@/features/lecturer/routes/AttendanceRoute";
import { LecturerProfileRoute } from "@/features/lecturer/routes/LecturerProfileRoute";
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
import { ComponentDemoRoute } from "@/features/demo/routes/ComponentDemoRoute";
import { ResultReceiptDemoRoute } from "@/features/demo/routes/ResultReceiptDemoRoute";
import { ExamDemoRoute } from "@/features/demo/routes/ExamDemoRoute";

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
  { path: "/demo/components", element: <ComponentDemoRoute /> },
  { path: "/demo/result", element: <ResultReceiptDemoRoute /> },
  { path: "/demo/exam", element: <ExamDemoRoute /> },
  { path: "/demo", element: <Navigate to="/demo/components" replace /> },
  { path: "/login", element: <LoginRoute /> },
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
                path: "/lecturer/materials",
                element: <LearningMaterialsRoute />,
              },
              {
                path: "/lecturer/materials/new",
                element: <UploadMaterialRoute />,
              },
              { path: "/lecturer/exams", element: <ExamScheduleRoute /> },
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
              { path: "/", element: <Navigate to="/practice" replace /> },
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

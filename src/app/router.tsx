import { createBrowserRouter, Navigate, useParams } from "react-router";
import { lazy, Suspense } from "react";
import { AppLayout } from "@/app/AppLayout";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireStudent } from "@/features/auth/components/RequireStudent";
import { LoginRoute } from "@/features/auth/routes/LoginRoute";
import { StudentLoginRoute } from "@/features/auth/routes/StudentLoginRoute";
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
  import("@/features/lecturer/questions/routes/CreateQuestionRoute").then(
    (module) => ({
      default: module.CreateQuestionRoute,
    }),
  ),
);
import { LearningMaterialsRoute } from "@/features/lecturer/materials/routes/LearningMaterialsRoute";
import { UploadMaterialRoute } from "@/features/lecturer/materials/routes/UploadMaterialRoute";
import { ExamScheduleRoute } from "@/features/lecturer/exams/routes/ExamScheduleRoute";
import { SharedShiftRoute } from "@/features/examiner/routes/SharedShiftRoute";
import { ProctoringPolicyRoute } from "@/features/examiner/routes/ProctoringPolicyRoute";
import { SealPaperRoute } from "@/features/lecturer/exams/routes/SealPaperRoute";
import { SealedPapersRoute } from "@/features/lecturer/exams/routes/SealedPapersRoute";
import { AttendanceRoute } from "@/features/lecturer/exams/routes/AttendanceRoute";
import { LecturerGradingRoute } from "@/features/lecturer/exams/routes/LecturerGradingRoute";
import { LecturerProfileRoute } from "@/features/lecturer/profile/routes/LecturerProfileRoute";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { RequireAdmin } from "@/features/admin/components/RequireAdmin";
import { AdminDashboardRoute } from "@/features/admin/routes/AdminDashboardRoute";
import { UniversitiesRoute } from "@/features/admin/routes/UniversitiesRoute";
import { SystemMonitoringRoute } from "@/features/admin/routes/SystemMonitoringRoute";
import { VoiceSettingsRoute } from "@/features/admin/routes/VoiceSettingsRoute";
import { ExamShortcutsRoute } from "@/features/admin/routes/ExamShortcutsRoute";
import { DepartmentsRoute } from "@/features/admin/routes/DepartmentsRoute";
import { MajorsRoute } from "@/features/admin/routes/MajorsRoute";
import { SubjectsRoute } from "@/features/admin/routes/SubjectsRoute";
import { CurriculumsRoute } from "@/features/admin/routes/CurriculumsRoute";
import {
  ExaminerRecordsRoute,
  UsersRoute,
} from "@/features/admin/routes/UsersRoute";
import { StudentProfilesRoute } from "@/features/admin/routes/StudentProfilesRoute";
import { LecturerProfilesRoute } from "@/features/admin/routes/LecturerProfilesRoute";
import { StaffLayout } from "@/features/staff/components/StaffLayout";
import { RequireStaff } from "@/features/staff/components/RequireStaff";
import { StaffDashboardRoute } from "@/features/staff/routes/StaffDashboardRoute";
import { ExamRoomsRoute } from "@/features/staff/routes/ExamRoomsRoute";
import { StaffPolicyRoute } from "@/features/staff/routes/StaffPolicyRoute";
import { ExaminerLayout } from "@/features/examiner/components/ExaminerLayout";
import { RequireExaminer } from "@/features/examiner/components/RequireExaminer";
import {
  CandidateMonitoringRoute,
  ExaminerDashboardRoute,
  ExamBankRoute,
  ExamOperationsRoute,
  ExamReadinessRoute,
  ExamScheduleDashboardRoute,
  ExamScheduleDetailRoute,
  ExamSetupRoute,
  LiveMonitoringRoute,
  QuestionSelectionRoute,
  RoomMonitoringRoute,
  ScheduleCandidatesRoute,
  ScheduleDetailsRoute,
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
import { NotificationsRoute } from "@/features/notifications/routes/NotificationsRoute";
import { NotificationManagementRoute } from "@/features/notifications/routes/NotificationManagementRoute";

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
  { path: "/student/login", element: <StudentLoginRoute /> },
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
              { path: "/lecturer/exam-papers", element: <ExamBankRoute /> },
              { path: "/lecturer/exam-papers/new/setup", element: <ExamSetupRoute /> },
              { path: "/lecturer/exam-papers/new/questions", element: <QuestionSelectionRoute /> },
              { path: "/lecturer/exam-papers/new/operations", element: <ExamOperationsRoute /> },
              { path: "/lecturer/exam-papers/:paperId/seal", element: <SealPaperRoute /> },
              { path: "/lecturer/sealed-papers", element: <SealedPapersRoute /> },
              { path: "/lecturer/grading", element: <LecturerGradingRoute /> },
              {
                path: "/lecturer/exams/:examId/attendance",
                element: <AttendanceRoute />,
              },
              { path: "/lecturer/profile", element: <LecturerProfileRoute /> },
              {
                path: "/lecturer/notifications",
                element: <NotificationsRoute />,
              },
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
              {
                path: "/admin",
                element: <Navigate to="/admin/dashboard" replace />,
              },
              { path: "/admin/dashboard", element: <AdminDashboardRoute /> },
              { path: "/admin/universities", element: <UniversitiesRoute /> },
              { path: "/admin/users", element: <UsersRoute /> },
              { path: "/admin/monitoring", element: <SystemMonitoringRoute /> },
              {
                path: "/admin/voice-settings",
                element: <VoiceSettingsRoute />,
              },
              {
                path: "/admin/exam-shortcuts",
                element: <ExamShortcutsRoute />,
              },
              /*
               * Academic data (departments, majors, subjects, topics, semesters,
               * curriculums, profiles) moved to University Staff on
               * 05/11/2026. Old bookmarks land on the dashboard, not a 404.
               */
              {
                path: "/admin/*",
                element: <Navigate to="/admin/dashboard" replace />,
              },
            ],
          },
        ],
      },
      {
        element: <RequireStaff />,
        children: [
          {
            element: <StaffLayout />,
            children: [
              {
                path: "/staff",
                element: <Navigate to="/staff/dashboard" replace />,
              },
              { path: "/staff/dashboard", element: <StaffDashboardRoute /> },
              { path: "/staff/users", element: <UsersRoute /> },
              {
                path: "/staff/student-profiles",
                element: <StudentProfilesRoute />,
              },
              {
                path: "/staff/lecturer-profiles",
                element: <LecturerProfilesRoute />,
              },
              {
                path: "/staff/examiner-records",
                element: <ExaminerRecordsRoute />,
              },
              { path: "/staff/departments", element: <DepartmentsRoute /> },
              { path: "/staff/majors", element: <MajorsRoute /> },
              { path: "/staff/subjects", element: <SubjectsRoute /> },
              { path: "/staff/curriculums", element: <CurriculumsRoute /> },
              { path: "/staff/exam-rooms", element: <ExamRoomsRoute /> },
              { path: "/staff/default-policy", element: <StaffPolicyRoute /> },
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
              { path: "/examiner/sealed-papers", element: <SealedPapersRoute /> },
              { path: "/examiner/proctoring-policy", element: <ProctoringPolicyRoute /> },
              { path: "/examiner/schedule/shared/:shiftId", element: <SharedShiftRoute /> },
              {
                path: "/examiner/exams/new/readiness",
                element: <ExamReadinessRoute />,
              },
              {
                path: "/examiner/schedule",
                element: <ExamScheduleDashboardRoute />,
              },
              {
                path: "/examiner/schedule/:scheduleId",
                element: <ExamScheduleDetailRoute />,
              },
              {
                path: "/examiner/schedule/new/details",
                element: <ScheduleDetailsRoute />,
              },
              {
                path: "/examiner/schedule/new/candidates",
                element: <ScheduleCandidatesRoute />,
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
              {
                path: "/examiner/notifications",
                element: <NotificationsRoute />,
              },
              {
                path: "/examiner/notifications/manage",
                element: <NotificationManagementRoute />,
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

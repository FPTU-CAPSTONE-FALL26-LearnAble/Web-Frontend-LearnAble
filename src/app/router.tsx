import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@/app/AppLayout";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { LoginRoute } from "@/features/auth/routes/LoginRoute";
import { AccessibilitySettingsRoute } from "@/features/accessibility/routes/AccessibilitySettingsRoute";
import { PracticeListRoute } from "@/features/practice/routes/PracticeListRoute";
import { PracticeAttemptRoute } from "@/features/practice/routes/PracticeAttemptRoute";
import { AssistantRoute } from "@/features/assistant/routes/AssistantRoute";
import { ProgressRoute } from "@/features/progress/routes/ProgressRoute";
import { ResultsListRoute } from "@/features/results/routes/ResultsListRoute";
import { ResultDetailRoute } from "@/features/results/routes/ResultDetailRoute";

/** Slug tiếng Việt không dấu — đọc được khi focus vào thanh địa chỉ (§7). */
export const router = createBrowserRouter([
  { path: "/dang-nhap", element: <LoginRoute /> },
  {
    element: <RequireAuth />,
    children: [
      // Màn làm bài luyện tập full-screen (ExamShell tự có landmark riêng)
      { path: "/luyen-tap/:setId", element: <PracticeAttemptRoute /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/luyen-tap" replace /> },
          { path: "/cai-dat/tro-nang", element: <AccessibilitySettingsRoute /> },
          { path: "/luyen-tap", element: <PracticeListRoute /> },
          { path: "/tro-ly", element: <AssistantRoute /> },
          { path: "/tien-do", element: <ProgressRoute /> },
          { path: "/ket-qua", element: <ResultsListRoute /> },
          { path: "/ket-qua/:sessionId", element: <ResultDetailRoute /> },
        ],
      },
    ],
  },
]);

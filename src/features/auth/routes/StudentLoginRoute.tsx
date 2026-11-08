import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Info } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { announce } from "@/shared/a11y/announcer";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import { Button } from "@/shared/ui/primitives/button";
import { Card } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useLogin } from "@/features/auth/api/useLogin";
import { getRoleDestination, normalizeSupportedRole } from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";

const studentLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your university email or student ID."),
  password: z.string().min(1, "Enter your password."),
});

type StudentLoginForm = z.infer<typeof studentLoginSchema>;

function describeLoginError(error: unknown) {
  if (error instanceof ApiFailure) {
    if (error.detail.kind === "unauthorized") {
      return "The university email, student ID, or password is incorrect.";
    }
    if (error.detail.kind === "network") {
      return "We could not reach the server. Check your connection and try again.";
    }
  }
  return "The server could not complete sign-in. Please try again.";
}

export function getStudentPostLoginDestination(requestedPath?: string) {
  return getRoleDestination("student", requestedPath) ?? "/practice";
}

export function StudentLoginRoute() {
  useRouteAnnouncer("Student sign in — LearnAble", "Student sign in");
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const loginMutation = useLogin();
  const [accountError, setAccountError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginForm>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const serverError = loginMutation.isError
    ? describeLoginError(loginMutation.error)
    : null;
  const visibleError = accountError ?? serverError;

  const onSubmit = handleSubmit((values) => {
    setAccountError(null);
    loginMutation.mutate(
      { ...values, remember: false },
      {
        onSuccess: (user) => {
          if (normalizeSupportedRole(user.role) !== "student") {
            logout();
            const message = "This sign-in page is for Student accounts. Use the general sign-in for your account type.";
            setAccountError(message);
            announce(message, { assertive: true });
            return;
          }
          const from = (location.state as { from?: string } | null)?.from;
          navigate(getStudentPostLoginDestination(from), { replace: true });
        },
        onError: (error) => announce(describeLoginError(error), { assertive: true }),
      },
    );
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink />
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center p-6"
      >
        <Card>
          <div className="px-6">
            <h1 className="text-[length:var(--text-2xl)] font-bold outline-none">
              Student sign in
            </h1>
            <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="student-identifier">
                  University email or student ID
                </Label>
                <Input
                  id="student-identifier"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.identifier)}
                  aria-describedby={errors.identifier ? "student-identifier-error" : undefined}
                  {...register("identifier")}
                />
                {errors.identifier ? (
                  <p id="student-identifier-error" role="alert" className="text-base font-medium leading-relaxed text-destructive">
                    {errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="student-password">
                  Password
                </Label>
                <Input
                  id="student-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "student-password-error" : undefined}
                  {...register("password")}
                />
                {errors.password ? (
                  <p id="student-password-error" role="alert" className="text-base font-medium leading-relaxed text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {visibleError ? (
                <Alert variant="destructive">
                  <Info aria-hidden />
                  <AlertTitle>Unable to sign in</AlertTitle>
                  <AlertDescription>{visibleError}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
